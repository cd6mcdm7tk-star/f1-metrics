"""
METRIK DELTA - Session auto-ingestion scheduler
================================================
Vérifie le calendrier OpenF1, détecte les sessions récemment terminées
et lance l'ingestion pour les sessions absentes de PostgreSQL.

Conçu pour tourner toutes les heures sur Railway Cron.

Railway Cron command : python jobs/schedule_ingest.py
Schedule             : 0 * * * *  (toutes les heures)

Logique :
  - Pour chaque session de l'année en cours :
      * Si la session est terminée (date_start + durée estimée < maintenant)
      * Et si les données ne sont pas encore en PostgreSQL
      * Et si la session a moins de 7 jours (évite de re-checker l'historique lointain)
      → Lance ingest()

Sessions ingérées : Q, R, S, SQ, SS  (pas FP par défaut, peu consultées)
"""

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
from jobs.ingest_session import ingest

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

OPENF1_BASE = "https://api.openf1.org/v1"

# ---------------------------------------------------------------------------
# OpenF1 JWT authentication (même logique que main.py)
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
        logger.info("✅ OpenF1 JWT token refreshed")
        return _openf1_jwt["token"]
    except Exception as e:
        logger.warning(f"⚠️  OpenF1 token fetch failed: {e}")
        return None

# OpenF1 session_name → notre abréviation
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

# Durée estimée de chaque session (minutes) — après laquelle les données sont disponibles
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

# Sessions à ingérer (FP exclues par défaut — peu consultées, coût API élevé)
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


def is_session_ingested(year: int, gp_round: int, session_type: str) -> bool:
    """Retourne True si la session a des laps en base (télémétrie optionnelle)."""
    try:
        lap_row = db._execute(
            "SELECT COUNT(*) FROM laps WHERE year = %s AND gp_round = %s AND session_type = %s",
            (year, gp_round, session_type),
            fetch="one",
        )
        return bool(lap_row and lap_row[0] > 0)
    except Exception as e:
        logger.warning(f"is_session_ingested check failed: {e}")
        return False


def get_meetings_fastf1(year: int) -> list:
    """Fallback: construit la liste des meetings depuis FastF1."""
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    meetings = []
    for _, row in schedule.iterrows():
        meetings.append({
            "meeting_key":  int(row["RoundNumber"]),
            "meeting_name": str(row["EventName"]),
            "date_start":   str(row["EventDate"].date()),
        })
    return meetings


def get_sessions_fastf1(year: int) -> list:
    """Fallback: construit la liste des sessions depuis FastF1."""
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


def get_round_number(meetings: list, meeting_key: int) -> Optional[int]:
    """Retourne le numéro de round (1-based) à partir du meeting_key."""
    race_meetings = sorted(
        [m for m in meetings if "test" not in m.get("meeting_name", "").lower()],
        key=lambda m: m["date_start"],
    )
    for i, m in enumerate(race_meetings):
        if m["meeting_key"] == meeting_key:
            return i + 1
    return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def run():
    if not db.available:
        logger.error("PostgreSQL non disponible — vérifier DATABASE_URL")
        sys.exit(1)

    db.create_tables()

    now = datetime.now(timezone.utc)
    current_year = now.year

    logger.info(f"[Schedule] Vérification sessions {current_year} — {now.strftime('%Y-%m-%d %H:%M UTC')}")

    try:
        meetings = openf1_get("meetings", {"year": current_year})
    except RuntimeError:
        logger.warning("OpenF1 /meetings indisponible — fallback FastF1")
        meetings = get_meetings_fastf1(current_year)
    if not meetings:
        logger.info("Aucun meeting trouvé pour l'année en cours")
        return

    try:
        sessions = openf1_get("sessions", {"year": current_year})
    except RuntimeError:
        logger.warning("OpenF1 /sessions indisponible — fallback FastF1")
        sessions = get_sessions_fastf1(current_year)
    if not sessions:
        logger.info("Aucune session trouvée")
        return

    ingested = 0
    skipped  = 0
    errors   = 0

    for session in sessions:
        session_name = session.get("session_name", "")
        session_type = SESSION_NAME_MAP.get(session_name)

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

        # Session pas encore terminée → ignorer
        if now < estimated_end:
            continue

        # Session trop ancienne (> 7 jours) → déjà traitée ou hors scope
        if now - estimated_end > timedelta(days=7):
            continue

        meeting_key = session.get("meeting_key")
        gp_round    = get_round_number(meetings, meeting_key)
        if gp_round is None:
            logger.warning(f"Round introuvable pour meeting_key={meeting_key}, session={session_name}")
            continue

        if is_session_ingested(current_year, gp_round, session_type):
            logger.info(f"  ✓ Déjà ingéré : {current_year} R{gp_round} {session_type}")
            skipped += 1
            continue

        logger.info(f"  → Ingestion : {current_year} R{gp_round} {session_type} (terminée ~{estimated_end.strftime('%H:%M UTC')})")
        try:
            ingest(current_year, gp_round, session_type)
            ingested += 1
            logger.info(f"  ✅ Succès : {current_year} R{gp_round} {session_type}")
        except Exception as e:
            errors += 1
            logger.error(f"  ❌ Échec : {current_year} R{gp_round} {session_type} — {e}")

    logger.info(
        f"[Schedule] Terminé — Ingérés: {ingested}, Déjà à jour: {skipped}, Erreurs: {errors}"
    )


if __name__ == "__main__":
    run()
