"""
Hourly ingestion scheduler (Railway cron: `python jobs/schedule_ingest.py`, 0 * * * *).

For each session of the current season that ended less than 7 days ago and
isn't fully stored in PostgreSQL yet (lap counts compared with OpenF1), runs
ingest() — or only ingest_openf1_compounds() when just the tyres are missing.
Sessions: Q, R, S, SQ, SS (practice isn't ingested).

`--all` drops the 7-day window to catch up the whole season. `--force` re-ingests
sessions already complete too, after a fix to how they're stored.
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timedelta, timezone
from typing import Optional

import requests
import fastf1
import pandas as pd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from jobs.ingest_session import ingest, ingest_openf1_compounds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

OPENF1_BASE = "https://api.openf1.org/v1"

# ---------------------------------------------------------------------------
# OpenF1 authentication (same as app/openf1.py, with requests)
# ---------------------------------------------------------------------------

_openf1_jwt: dict = {"token": None, "expires_at": 0}

def _get_openf1_token() -> str | None:
    """Fetch or refresh the OpenF1 JWT token using email/password."""
    import time
    now = time.time()
    if _openf1_jwt["token"] and now < _openf1_jwt["expires_at"]:
        return _openf1_jwt["token"]
    email    = os.getenv("OPENF1_EMAIL")
    password = os.getenv("OPENF1_PASSWORD")
    if not email or not password:
        return None
    try:
        r = requests.post(
            "https://api.openf1.org/token",
            data={"username": email, "password": password, "grant_type": "password"},
            timeout=10,
        )
        r.raise_for_status()
        data = r.json()
        _openf1_jwt["token"]      = data["access_token"]
        _openf1_jwt["expires_at"] = now + int(data.get("expires_in", 3600)) - 300
        logger.info("OpenF1 token refreshed")
        return _openf1_jwt["token"]
    except Exception as e:
        logger.warning(f"OpenF1 token fetch failed: {e}")
        return None

# OpenF1 session_name -> our session code
SESSION_NAME_MAP = {
    "Qualifying":        "Q",
    "Race":              "R",
    "Practice 1":        "FP1",
    "Practice 2":        "FP2",
    "Practice 3":        "FP3",
    "Sprint":            "S",
    "Sprint Qualifying": "SQ",
    "Sprint Shootout":   "SS",
}

# Expected length of each session (minutes): its data is available after that
SESSION_DURATIONS = {
    "Q":   75,
    "R":   130,
    "FP1": 75,
    "FP2": 75,
    "FP3": 75,
    "S":   50,
    "SQ":  60,
    "SS":  60,
}

# Practice isn't ingested: rarely viewed, and costly in API calls
SESSIONS_TO_INGEST = {"Q", "R", "S", "SQ", "SS"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def openf1_get(endpoint: str, params: dict, retries: int = 3) -> list:
    url = f"{OPENF1_BASE}/{endpoint}"
    headers = {"Accept": "application/json"}
    token = _get_openf1_token()
    if token:
        headers["Authorization"] = f"Bearer {token}"
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, headers=headers, timeout=30)
            # OpenF1 answers a query matching nothing (e.g. a session with
            # no laps published yet) with a bare 404 — that's an empty result.
            if r.status_code == 404:
                return []
            if r.status_code == 429:
                import time
                wait = 2 ** attempt
                logger.warning(f"OpenF1 429 on /{endpoint}, retry in {wait}s")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            logger.warning(f"OpenF1 /{endpoint} attempt {attempt + 1} failed: {e}")
            if attempt < retries - 1:
                import time
                time.sleep(2 ** attempt)
    raise RuntimeError(f"OpenF1 /{endpoint} failed after {retries} retries")


def session_status(year: int, gp_round: int, session_type: str, session_key: int) -> str:
    """'complete', 'missing' (not ingested, or only partly — e.g. caught
    mid-race, or a driver whose data failed) or 'no_compounds' (every lap is
    there, only the tyre compounds aren't).

    Used to be "has at least one lap in the DB", so a race ingested while
    OpenF1 was still publishing it (2026 Kuala Lumpur: 48 of 55 laps) never
    got completed. Now compared with OpenF1's own lap count — restricted to
    the drivers it lists for the session, exactly what ingestion stores."""
    row = db._execute(
        "SELECT COUNT(*), COUNT(compound) FROM laps WHERE year = %s AND gp_round = %s AND session_type = %s",
        (year, gp_round, session_type),
        fetch="one",
    )
    db_laps, db_compounds = row if row else (0, 0)
    if db_laps == 0:
        return "missing"
    listed = {d.get("driver_number") for d in openf1_get("drivers", {"session_key": session_key})}
    openf1_laps = sum(
        1 for lap in openf1_get("laps", {"session_key": session_key})
        if lap.get("lap_number") is not None and lap.get("driver_number") in listed
    )
    if openf1_laps > db_laps:
        return "missing"
    if db_compounds == 0:
        return "no_compounds"
    return "complete"


def get_sessions_fastf1(year: int) -> list:
    """Fallback: the season's sessions from FastF1's schedule."""
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    sessions = []
    for _, row in schedule.iterrows():
        for i in range(1, 6):
            sname = row.get(f"Session{i}")
            sdate = row.get(f"Session{i}DateUtc")
            if not sname or pd.isna(sname) or str(sname).lower() == "none":
                continue
            if pd.isna(sdate):
                continue
            # FastF1 dates are UTC but timezone-naive — make them aware
            if hasattr(sdate, "tzinfo") and sdate.tzinfo is None:
                sdate = sdate.replace(tzinfo=timezone.utc)
            sessions.append({
                "meeting_key":  int(row["RoundNumber"]),
                "session_name": str(sname),
                "date_start":   sdate.isoformat() if hasattr(sdate, "isoformat") else str(sdate),
            })
    return sessions


_ff1_schedule_cache: dict = {}


def get_round_from_fastf1(year: int, session_date_str: str) -> Optional[int]:
    """FastF1's round number for a session date. FastF1's schedule is the
    reference: unlike OpenF1, it leaves cancelled Grands Prix out."""
    if year not in _ff1_schedule_cache:
        try:
            _ff1_schedule_cache[year] = fastf1.get_event_schedule(year, include_testing=False)
        except Exception as e:
            logger.warning(f"FastF1 schedule fetch failed: {e}")
            return None

    schedule = _ff1_schedule_cache[year]
    try:
        session_date = datetime.fromisoformat(session_date_str[:10]).date()
        for _, row in schedule.iterrows():
            event_date = row["EventDate"].date()
            if abs((session_date - event_date).days) <= 4:
                return int(row["RoundNumber"])
    except Exception as e:
        logger.warning(f"FastF1 round lookup failed: {e}")
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run(whole_season: bool = False, force: bool = False):
    if not db.available:
        logger.error("PostgreSQL unavailable, check DATABASE_URL")
        sys.exit(1)

    db.create_tables()

    now = datetime.now(timezone.utc)
    current_year = now.year

    logger.info(f"[Schedule] Checking {current_year} sessions at {now.strftime('%Y-%m-%d %H:%M UTC')}")

    try:
        sessions = openf1_get("sessions", {"year": current_year})
    except RuntimeError:
        logger.warning("OpenF1 /sessions unavailable, falling back to FastF1")
        sessions = get_sessions_fastf1(current_year)
    if not sessions:
        logger.info("No sessions found")
        return

    ingested = 0
    skipped  = 0
    errors   = 0
    fixed    = 0

    for session in sessions:
        session_name = session.get("session_name", "")
        session_type = SESSION_NAME_MAP.get(session_name)

        # Cancelled events stay in OpenF1's list (2026: Sakhir, Jeddah)
        if session.get("is_cancelled"):
            continue

        if not session_type or session_type not in SESSIONS_TO_INGEST:
            continue

        date_start_str = session.get("date_start")
        if not date_start_str:
            continue

        try:
            date_start = datetime.fromisoformat(date_start_str.replace("Z", "+00:00"))
        except ValueError:
            continue

        duration_min  = SESSION_DURATIONS.get(session_type, 90)
        estimated_end = date_start + timedelta(minutes=duration_min)

        # Not finished yet
        if now < estimated_end:
            continue

        # Older than 7 days: already handled
        if not whole_season and now - estimated_end > timedelta(days=7):
            continue

        # Round by date only: counting meetings in OpenF1's list includes
        # cancelled Grands Prix and shifts every later round.
        gp_round = get_round_from_fastf1(current_year, date_start_str)
        if gp_round is None:
            logger.warning(f"No round found for {session_name} on {date_start_str[:10]}")
            continue

        label = f"{current_year} R{gp_round} {session_type}"
        try:
            status = "missing" if force else session_status(current_year, gp_round, session_type, session["session_key"])
            if status == "complete":
                logger.info(f"  complete: {label}")
                skipped += 1
            elif status == "no_compounds":
                logger.info(f"  tyres missing: {label}")
                ingest_openf1_compounds(current_year, gp_round, session_type)
                fixed += 1
            else:
                logger.info(f"  ingesting: {label} (ended ~{estimated_end.strftime('%H:%M UTC')})")
                ingest(current_year, gp_round, session_type)
                ingested += 1
                logger.info(f"  done: {label}")
        except Exception as e:
            errors += 1
            logger.error(f"  failed: {label}: {e}")

    logger.info(
        f"[Schedule] Done. Ingested: {ingested}, tyres completed: {fixed}, up to date: {skipped}, errors: {errors}"
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest recently finished sessions")
    parser.add_argument("--all", action="store_true", help="Check every session of the current season, not just the last 7 days")
    parser.add_argument("--force", action="store_true", help="Re-ingest sessions even when they are complete")
    args = parser.parse_args()
    run(whole_season=args.all, force=args.force)
