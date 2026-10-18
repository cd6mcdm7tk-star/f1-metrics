"""OpenF1 client: the data source for the current season, read live."""
import asyncio
import datetime
import logging
import os
import time

import httpx
import pandas as pd
from fastapi import HTTPException

from app.cache import redis_cache
from app.lap_samples import lap_samples, lap_window
from app.schedule import get_grands_prix
from database import db

logger = logging.getLogger(__name__)

OPENF1_BASE = "https://api.openf1.org/v1"
SESSION_NAMES = {
    "Q": "Qualifying",
    "R": "Race",
    "FP1": "Practice 1",
    "FP2": "Practice 2",
    "FP3": "Practice 3",
    "S": "Sprint",
    "SQ": "Sprint Qualifying",
    "SS": "Sprint Shootout",
}
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

_token: dict = {"value": None, "expires_at": 0}


async def _get_token() -> str | None:
    """OAuth2 access token for the OpenF1 subscription, refreshed 5 min before expiry."""
    email = os.getenv("OPENF1_EMAIL")
    password = os.getenv("OPENF1_PASSWORD")
    if not email or not password:
        return None

    now = time.time()
    if _token["value"] and now < _token["expires_at"]:
        return _token["value"]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.openf1.org/token",
                data={"username": email, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            _token["value"] = data["access_token"]
            _token["expires_at"] = now + int(data.get("expires_in", 3600)) - 300
            logger.info("OpenF1 token refreshed")
            return _token["value"]
    except Exception as e:
        logger.warning(f"OpenF1 token fetch failed: {e}")
        return None


async def request(path: str, params: dict) -> list:
    """GET an OpenF1 endpoint, retrying 429s with backoff."""
    delays = [1, 3, 7]
    token = await _get_token()
    headers = {**HEADERS}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for attempt in range(len(delays) + 1):
            if attempt > 0:
                await asyncio.sleep(delays[attempt - 1])
            resp = await client.get(f"{OPENF1_BASE}/{path}", params=params)
            if resp.status_code == 429:
                if attempt < len(delays):
                    logger.warning(f"OpenF1 429 on /{path}, retry in {delays[attempt]}s")
                    continue
                raise HTTPException(status_code=503, detail="OpenF1 rate limit reached. Try again in a few seconds.")
            if resp.status_code == 404:
                # OpenF1 answers a filter that matches nothing with a bare 404
                # (e.g. a session that hasn't run yet). Callers already turn an
                # empty result into their own specific 404.
                return []
            resp.raise_for_status()
            return resp.json()


async def get_session_key(year: int, gp_round: int, session_type: str) -> int:
    session_name = SESSION_NAMES.get(session_type.upper(), session_type)

    # PostgreSQL first (session keys never change), then Redis
    if db.available:
        cached = await asyncio.to_thread(db.get_session_key, year, gp_round, session_type)
        if cached:
            return cached
    redis_key = f"openf1:session_key:{year}:{gp_round}:{session_type}"
    cached_redis = redis_cache.get(redis_key)
    if cached_redis:
        return cached_redis["session_key"]

    # /sessions directly: /meetings is blocked from Railway
    all_sessions = await request("sessions", {"year": year, "session_name": session_name})
    # Cancelled events stay in OpenF1's list (2026: Sakhir, Jeddah)
    race_sessions = [
        s for s in all_sessions
        if "test" not in s.get("meeting_name", "").lower() and not s.get("is_cancelled")
    ]
    if not race_sessions:
        raise HTTPException(status_code=404, detail=f"No {session_name} sessions found for {year}")

    # Matched by date, never by position: FastF1's schedule (our round
    # numbers) and OpenF1's session list don't contain the same events, so
    # "the Nth session" lands on another race — and the key is saved for good.
    session_key = None
    try:
        grands_prix = await get_grands_prix(year)
        target_date_str = next((g["date"] for g in grands_prix if g["round"] == gp_round), None)
        if target_date_str:
            target_date = datetime.date.fromisoformat(target_date_str)

            def _date_gap(s):
                try:
                    return abs((datetime.date.fromisoformat(s["date_start"][:10]) - target_date).days)
                except Exception:
                    return 999

            best = min(race_sessions, key=_date_gap)
            if _date_gap(best) <= 2:
                session_key = best["session_key"]
    except Exception as e:
        logger.warning(f"Date-based session resolution failed for {year} R{gp_round}: {e}")

    if session_key is None:
        # Not cached: resolves as soon as OpenF1 publishes the session
        raise HTTPException(status_code=404, detail=f"{session_name} for {year} round {gp_round} isn't available yet")

    if db.available:
        await asyncio.to_thread(db.save_session_key, year, gp_round, session_type, session_key)
    redis_cache.set(redis_key, {"session_key": session_key}, ttl=86400)
    return session_key


async def get_driver_number(session_key: int, driver_code: str) -> int:
    drivers = await request("drivers", {"session_key": session_key, "name_acronym": driver_code})
    if not drivers:
        raise HTTPException(status_code=404, detail=f"Driver {driver_code} not found in session")
    return drivers[0]["driver_number"]


async def get_lap_info(session_key: int, driver_number: int, lap_number: int | None) -> dict:
    """The given lap, or the fastest one when lap_number is None."""
    laps = await request("laps", {"session_key": session_key, "driver_number": driver_number})
    valid_laps = [l for l in laps if l.get("lap_duration") is not None and l.get("date_start") is not None]
    if not valid_laps:
        raise HTTPException(status_code=404, detail=f"No completed laps for driver number {driver_number}")

    if lap_number is not None:
        matching = [l for l in valid_laps if l["lap_number"] == lap_number]
        if not matching:
            raise HTTPException(status_code=404, detail=f"Lap {lap_number} not found for driver {driver_number}")
        return matching[0]

    return min(valid_laps, key=lambda l: l["lap_duration"])


async def fetch_lap_telemetry(session_key: int, driver_number: int, date_start: str, lap_duration: float) -> pd.DataFrame:
    """car_data + location over a lap, cut from line to line by
    app.lap_samples, with FastF1's column names."""
    start = pd.to_datetime(date_start, utc=True)
    begin, end = lap_window(start, lap_duration)

    base_params = {"session_key": session_key, "driver_number": driver_number}
    car_raw, loc_raw = await asyncio.gather(
        request("car_data", base_params),
        request("location", base_params),
    )
    if not car_raw:
        return pd.DataFrame()

    def around_lap(rows: list) -> pd.DataFrame:
        frame = pd.DataFrame(rows)
        frame["date"] = pd.to_datetime(frame["date"], utc=True, format="ISO8601")
        return frame[(frame["date"] >= begin) & (frame["date"] <= end)]

    df_car = around_lap(car_raw)
    if len(df_car) < 2:
        return pd.DataFrame()

    df = lap_samples(df_car, around_lap(loc_raw) if loc_raw else None, start, lap_duration)
    return df.rename(columns={
        "speed": "Speed",
        "throttle": "Throttle",
        "brake": "Brake",
        "n_gear": "nGear",
        "drs": "DRS",
        "rpm": "RPM",
        "x": "X",
        "y": "Y",
        "distance": "Distance",
    })
