"""
METRIK DELTA - Session ingestion job
====================================
Loads telemetry + lap data for a given session and stores it in PostgreSQL.

Sources:
  - FastF1   : year <= 2025
  - OpenF1   : year >= 2026  (https://api.openf1.org)

Usage:
  python jobs/ingest_session.py --year 2026 --round 1 --session Q
  python jobs/ingest_session.py --year 2025 --round 5 --session R

Railway Cron: configure to run this script after each session.
"""

import argparse
import logging
import math
import os
import sys
import time
from typing import Optional

import numpy as np
import pandas as pd
import requests

# Allow running from the backend/ directory directly
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger(__name__)

OPENF1_BASE = "https://api.openf1.org/v1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _to_float(val) -> Optional[float]:
    try:
        v = float(val)
        return None if math.isnan(v) else v
    except (TypeError, ValueError):
        return None


def _sanitize_tel_data(data: dict) -> dict:
    """
    Replace NaN/inf values in column-based telemetry arrays with safe defaults.
    Prevents json.dumps failures and 'cannot convert float NaN to integer' errors.
    """
    defaults = {"gear": 0, "drs": 0, "brake": False, "rpm": 10000}
    cleaned = {}
    for key, values in data.items():
        default = defaults.get(key, 0.0)
        cleaned_vals = []
        for v in values:
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                cleaned_vals.append(default)
            else:
                cleaned_vals.append(v)
        cleaned[key] = cleaned_vals
    return cleaned


def _distance_from_xy(x: list, y: list) -> list:
    """Cumulative Euclidean distance in metres from GPS arrays."""
    dist = [0.0]
    for i in range(1, len(x)):
        dx = x[i] - x[i - 1]
        dy = y[i] - y[i - 1]
        dist.append(dist[-1] + math.sqrt(dx * dx + dy * dy))
    return dist


# ---------------------------------------------------------------------------
# OpenF1 helpers (2026+)
# ---------------------------------------------------------------------------

def _openf1_get(endpoint: str, params: dict, retries: int = 5) -> list:
    url = f"{OPENF1_BASE}/{endpoint}"
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=60)
            if r.status_code == 429:
                wait = 30 * (attempt + 1)
                logger.warning(f"OpenF1 /{endpoint} attempt {attempt+1} failed: 429, retry in {wait}s")
                time.sleep(wait)
                continue
            r.raise_for_status()
            return r.json()
        except requests.RequestException as e:
            logger.warning(f"OpenF1 /{endpoint} attempt {attempt+1} failed: {e}")
            time.sleep(2 ** attempt)
    raise RuntimeError(f"OpenF1 {endpoint} failed after {retries} retries")


def _openf1_session_key(year: int, gp_round: int, session_type: str) -> int:
    """
    Resolve OpenF1 session_key from year + round number + session abbreviation.
    session_type: 'Q' | 'R' | 'FP1' | 'FP2' | 'FP3' | 'S' | 'SQ' | 'SS'
    """
    name_map = {
        "Q":   "Qualifying",
        "R":   "Race",
        "FP1": "Practice 1",
        "FP2": "Practice 2",
        "FP3": "Practice 3",
        "S":   "Sprint",
        "SS":  "Sprint Qualifying",
        "SQ":  "Sprint Qualifying",
    }
    session_name = name_map.get(session_type.upper(), session_type)

    # Resolve the correct meeting_key for this gp_round
    meetings = _openf1_get("meetings", {"year": year})
    race_meetings = sorted(
        [m for m in meetings if "test" not in m.get("meeting_name", "").lower()],
        key=lambda m: m["date_start"],
    )
    if gp_round > len(race_meetings):
        raise ValueError(f"OpenF1: round {gp_round} not found for {year}")
    meeting_key = race_meetings[gp_round - 1]["meeting_key"]

    sessions = _openf1_get("sessions", {"year": year, "meeting_key": meeting_key, "session_name": session_name})
    if not sessions:
        raise ValueError(f"OpenF1: no '{session_name}' session found for {year} R{gp_round} (meeting_key={meeting_key})")

    return sessions[0]["session_key"]


def ingest_openf1(year: int, gp_round: int, session_type: str):
    """Ingest all drivers' laps + telemetry for a session via OpenF1 API."""
    logger.info(f"[OpenF1] Ingesting {year} R{gp_round} {session_type}")

    try:
        session_key = _openf1_session_key(year, gp_round, session_type)
    except RuntimeError as e:
        logger.warning(f"  OpenF1 indisponible ({e}) — fallback FastF1")
        ingest_fastf1(year, gp_round, session_type)
        return
    logger.info(f"  session_key = {session_key}")

    # --- Drivers ---
    drivers_raw = _openf1_get("drivers", {"session_key": session_key})
    # driver_number -> driver_code
    num_to_code: dict[int, str] = {}
    for d in drivers_raw:
        num = d.get("driver_number")
        code = d.get("name_acronym") or d.get("broadcast_name", "???")[:3]
        if num:
            num_to_code[int(num)] = code.upper()

    if not num_to_code:
        raise RuntimeError("OpenF1: no drivers found")

    logger.info(f"  {len(num_to_code)} drivers: {list(num_to_code.values())}")

    # --- Laps ---
    all_laps = _openf1_get("laps", {"session_key": session_key})

    # If OpenF1 has no valid lap_duration (data not yet processed), fall back to FastF1
    valid_laps_check = [l for l in all_laps if l.get("lap_duration") is not None]
    if not valid_laps_check:
        logger.warning(f"  OpenF1 has no completed laps for {year} R{gp_round} {session_type} — falling back to FastF1")
        ingest_fastf1(year, gp_round, session_type)
        return

    # Group by driver_number
    laps_by_driver: dict[int, list] = {}
    for lap in all_laps:
        num = lap.get("driver_number")
        if num is not None:
            laps_by_driver.setdefault(int(num), []).append(lap)

    # --- Process each driver one at a time (fetch → process → discard) ---
    for driver_num, code in num_to_code.items():
        driver_laps = laps_by_driver.get(driver_num, [])
        if not driver_laps:
            logger.warning(f"  No laps for {code} ({driver_num})")
            continue

        # Find personal best (minimum lap_duration)
        valid_laps = [l for l in driver_laps if l.get("lap_duration") is not None]
        fastest_lap_time = min((l["lap_duration"] for l in valid_laps), default=None)

        car_data, pos_data = _fetch_driver_session_data(session_key, driver_num)
        logger.info(f"  {code}: {len(car_data)} car_data points, {len(pos_data)} location points")

        for lap in driver_laps:
            lap_num = lap.get("lap_number")
            if lap_num is None:
                continue

            lap_time = _to_float(lap.get("lap_duration"))
            s1 = _to_float(lap.get("duration_sector_1"))
            s2 = _to_float(lap.get("duration_sector_2"))
            s3 = _to_float(lap.get("duration_sector_3"))
            compound = lap.get("compound") or lap.get("tyre_compound")
            is_pb = (lap_time is not None and fastest_lap_time is not None
                     and abs(lap_time - fastest_lap_time) < 0.001)

            date_start = lap.get("date_start")
            lap_duration = lap.get("lap_duration")
            has_telemetry = False

            if date_start and lap_duration and car_data:
                try:
                    tel_data = _extract_lap_telemetry(car_data, pos_data, date_start, lap_duration)
                    if tel_data:
                        has_telemetry = True
                        lap_type = "fastest" if is_pb else f"lap_{lap_num}"
                        db.save_telemetry(
                            year, gp_round, session_type, code,
                            lap_num, lap_type, tel_data
                        )
                        if is_pb:
                            db.save_telemetry(
                                year, gp_round, session_type, code,
                                lap_num, "fastest", tel_data
                            )
                except Exception as e:
                    logger.warning(f"  Telemetry slice failed {code} lap {lap_num}: {e}")

            db.save_lap(
                year, gp_round, session_type, code,
                lap_num, lap_time, s1, s2, s3,
                compound, is_pb, has_telemetry
            )

        logger.info(f"  Saved {code}: {len(driver_laps)} laps")
        # Libérer la mémoire immédiatement après chaque driver
        del car_data, pos_data


def _fetch_driver_session_data(session_key: int, driver_number: int) -> tuple:
    """
    Fetch ALL car_data + location for a driver in 2 requests (entire session).
    Returns (car_data, pos_data) lists.
    """
    try:
        car_data = _openf1_get("car_data", {"session_key": session_key, "driver_number": driver_number})
    except Exception:
        car_data = []

    try:
        pos_data = _openf1_get("location", {"session_key": session_key, "driver_number": driver_number})
    except Exception:
        pos_data = []

    return car_data, pos_data


def _build_telemetry_from_raw(car_data: list, pos_data: list) -> Optional[dict]:
    """Build column-based telemetry dict from raw OpenF1 car_data and pos_data."""
    if len(car_data) < 10:
        return None

    dates_car = [d["date"] for d in car_data]
    speed    = [d.get("speed", 0) for d in car_data]
    rpm      = [d.get("rpm", 0) for d in car_data]
    gear     = [d.get("n_gear", 0) for d in car_data]
    throttle = [d.get("throttle", 0) for d in car_data]
    brake    = [bool(d.get("brake", 0)) for d in car_data]
    drs      = [d.get("drs", 0) for d in car_data]

    x_vals = [0.0] * len(car_data)
    y_vals = [0.0] * len(car_data)

    if pos_data:
        pos_dates = [d["date"] for d in pos_data]
        pos_x = [d.get("x", 0) for d in pos_data]
        pos_y = [d.get("y", 0) for d in pos_data]
        j = 0
        for i, dc in enumerate(dates_car):
            while j < len(pos_dates) - 1 and pos_dates[j + 1] <= dc:
                j += 1
            x_vals[i] = pos_x[j]
            y_vals[i] = pos_y[j]

    dist = _distance_from_xy(x_vals, y_vals)

    return _sanitize_tel_data({
        "distance": dist,
        "speed":    speed,
        "throttle": throttle,
        "brake":    brake,
        "gear":     gear,
        "drs":      drs,
        "rpm":      rpm,
        "x":        x_vals,
        "y":        y_vals,
    })


def _extract_lap_telemetry(car_data: list, pos_data: list, date_start: str, lap_duration: float) -> Optional[dict]:
    """
    Slice pre-fetched session car_data/pos_data for a single lap window.
    Avoids making additional API calls per lap.
    """
    from datetime import datetime, timedelta

    try:
        dt_start = datetime.fromisoformat(date_start.replace("Z", "+00:00"))
    except ValueError:
        return None

    dt_end = dt_start + timedelta(seconds=lap_duration + 1)

    def in_window(d: dict) -> bool:
        try:
            dt = datetime.fromisoformat(d.get("date", "").replace("Z", "+00:00"))
            return dt_start <= dt <= dt_end
        except Exception:
            return False

    lap_car = [d for d in car_data if in_window(d)]
    lap_pos = [d for d in pos_data if in_window(d)]

    return _build_telemetry_from_raw(lap_car, lap_pos)


# ---------------------------------------------------------------------------
# FastF1 ingestion (2018-2025)
# ---------------------------------------------------------------------------

def ingest_fastf1(year: int, gp_round: int, session_type: str):
    """Ingest all drivers' laps + fastest-lap telemetry for a session via FastF1."""
    import fastf1
    import gc

    logger.info(f"[FastF1] Ingesting {year} R{gp_round} {session_type}")

    cache_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "cache")
    os.makedirs(cache_dir, exist_ok=True)
    fastf1.Cache.enable_cache(cache_dir)

    session = fastf1.get_session(year, gp_round, session_type)
    # Charger uniquement laps + telemetry (pas météo, pas messages radio)
    session.load(laps=True, telemetry=True, weather=False, messages=False)

    for driver_num in session.drivers:
        try:
            driver_laps = session.laps.pick_drivers(driver_num)
            if driver_laps.empty:
                continue
            # session.drivers returns numbers ('1', '44') — get the actual 3-letter code
            driver_code = str(driver_laps["Driver"].iloc[0])

            fastest_lap_time = driver_laps["LapTime"].min()

            # Save all laps metadata
            for _, lap in driver_laps.iterrows():
                lap_num = lap["LapNumber"]
                if pd.isna(lap_num):
                    continue

                lap_time = _to_float(
                    lap["LapTime"].total_seconds() if pd.notna(lap["LapTime"]) else None
                )
                s1 = _to_float(lap["Sector1Time"].total_seconds() if pd.notna(lap["Sector1Time"]) else None)
                s2 = _to_float(lap["Sector2Time"].total_seconds() if pd.notna(lap["Sector2Time"]) else None)
                s3 = _to_float(lap["Sector3Time"].total_seconds() if pd.notna(lap["Sector3Time"]) else None)
                compound = str(lap["Compound"]) if pd.notna(lap.get("Compound")) else None
                is_pb = (
                    pd.notna(lap["LapTime"]) and pd.notna(fastest_lap_time)
                    and lap["LapTime"] == fastest_lap_time
                )
                has_telemetry = bool(pd.notna(lap.get("IsAccurate")) and lap.get("IsAccurate"))

                db.save_lap(
                    year, gp_round, session_type, driver_code,
                    int(lap_num), lap_time, s1, s2, s3,
                    compound, is_pb, has_telemetry
                )

            # Save fastest-lap telemetry only (most requested)
            try:
                fastest = driver_laps.pick_fastest()
                if fastest is None:
                    continue
                tel = fastest.get_telemetry().add_distance()
                if tel is None or tel.empty:
                    continue

                # Detect RPM column
                rpm_col = next((c for c in ["RPM", "nRPM", "Rpm", "EngineRPM"] if c in tel.columns), None)

                tel_data = _sanitize_tel_data({
                    "distance": tel["Distance"].fillna(0).tolist(),
                    "speed":    tel["Speed"].fillna(0).tolist(),
                    "throttle": tel["Throttle"].fillna(0).tolist(),
                    "brake":    tel["Brake"].fillna(False).astype(bool).tolist(),
                    "gear":     tel["nGear"].fillna(0).astype(int).tolist(),
                    "drs":      tel["DRS"].fillna(0).astype(int).tolist(),
                    "rpm":      tel[rpm_col].fillna(10000).tolist() if rpm_col else [10000] * len(tel),
                    "x":        tel["X"].fillna(0).tolist(),
                    "y":        tel["Y"].fillna(0).tolist(),
                })

                lap_num = int(fastest["LapNumber"])
                db.save_telemetry(
                    year, gp_round, session_type, driver_code,
                    lap_num, "fastest", tel_data
                )
                logger.info(f"  Saved {driver_code}: fastest lap telemetry ({lap_num})")

            except Exception as e:
                logger.warning(f"  Telemetry failed for {driver_code}: {e}")

        except Exception as e:
            logger.error(f"  Driver {driver_code} failed: {e}")

    # Libérer la mémoire FastF1 explicitement
    del session
    gc.collect()
    logger.info(f"[FastF1] Done ingesting {year} R{gp_round} {session_type}")


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def ingest(year: int, gp_round: int, session_type: str):
    if not db.available:
        logger.error("PostgreSQL not available - set DATABASE_URL")
        sys.exit(1)

    # Ensure tables exist
    db.create_tables()

    if year >= 2026:
        ingest_openf1(year, gp_round, session_type)
    else:
        ingest_fastf1(year, gp_round, session_type)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Ingest F1 session data into PostgreSQL")
    parser.add_argument("--year",    type=int, required=True, help="Season year (e.g. 2026)")
    parser.add_argument("--round",   type=int, required=True, dest="gp_round", help="GP round number")
    parser.add_argument("--session", type=str, required=True, help="Session type: Q, R, FP1, FP2, FP3, S")
    args = parser.parse_args()

    ingest(args.year, args.gp_round, args.session)
