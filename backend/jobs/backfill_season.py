"""
Fills past seasons into PostgreSQL: every lap's time and each driver's
fastest-lap telemetry, for the sessions the site shows (qualifying, race,
sprints). Sessions already stored are skipped, so it can be stopped and run
again. Other laps' telemetry stays read live, from OpenF1 or FastF1.

  python jobs/backfill_season.py --year 2023 --year 2024
"""

import argparse
import logging
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import db
from jobs.ingest_session import ingest
from jobs.schedule_ingest import SESSION_NAME_MAP, SESSIONS_TO_INGEST, get_sessions_fastf1

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def sessions_to_fill(schedule: list[dict], stored: set[tuple[int, str]], now: datetime) -> list[tuple[int, str]]:
    """The (round, session code) pairs to ingest from a FastF1 schedule: the
    site's sessions that have run and aren't stored yet, in calendar order."""
    todo = []
    for session in schedule:
        code = SESSION_NAME_MAP.get(session["session_name"])
        key = (session["meeting_key"], code)
        if code not in SESSIONS_TO_INGEST or key in stored or key in todo:
            continue
        if datetime.fromisoformat(session["date_start"]) > now:
            continue
        todo.append(key)
    return todo


def stored_sessions(year: int) -> set[tuple[int, str]]:
    """The year's sessions that already have laps and fastest-lap telemetry"""
    rows = db._execute(
        """
        SELECT l.gp_round, l.session_type FROM laps l
        WHERE l.year = %s
          AND EXISTS (SELECT 1 FROM telemetry t WHERE t.year = l.year AND t.gp_round = l.gp_round
                      AND t.session_type = l.session_type AND t.lap_type = 'fastest')
        GROUP BY l.gp_round, l.session_type
        """,
        (year,),
        fetch="all",
    )
    return {(r[0], r[1]) for r in rows or []}


def backfill(year: int) -> tuple[int, list[str]]:
    todo = sessions_to_fill(get_sessions_fastf1(year), stored_sessions(year), datetime.now(timezone.utc))
    logger.info(f"[Backfill] {year}: {len(todo)} sessions to ingest")
    failed = []
    for i, (gp_round, code) in enumerate(todo, 1):
        logger.info(f"[Backfill] {year} {i}/{len(todo)}: round {gp_round} {code}")
        try:
            ingest(year, gp_round, code, fastest_only=True)
        except Exception as e:
            failed.append(f"R{gp_round} {code}")
            logger.error(f"[Backfill] {year} round {gp_round} {code} failed: {e}")
    return len(todo), failed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fill past seasons: lap times and fastest-lap telemetry")
    parser.add_argument("--year", type=int, action="append", required=True, help="A season to fill (repeatable)")
    args = parser.parse_args()
    if not db.available:
        sys.exit("PostgreSQL not available - set DATABASE_URL")
    for year in args.year:
        count, failed = backfill(year)
        logger.info(f"[Backfill] {year} done: {count - len(failed)}/{count} ingested, failed: {failed or 'none'}")
