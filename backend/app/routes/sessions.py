"""Calendar, Grands Prix and each session's drivers."""
import asyncio
import datetime
import logging

import fastf1
import pandas as pd
from fastapi import APIRouter, HTTPException, Request

from app import openf1
from app.cache import redis_cache
from app.errors import fastf1_http_error
from app.featured import latest_qualifying
from app.limiter import limiter
from app.schedule import get_grands_prix as get_grands_prix_list

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")

# A session's drivers, kept for a day once final, a few minutes before (openf1.SETTLED_AFTER)
DRIVERS_TTL = 86400
UNSETTLED_DRIVERS_TTL = 300


@router.get("/grands-prix/{year}")
@limiter.limit("30/minute")
async def get_grands_prix(request: Request, year: int):
    try:
        return {"grands_prix": await get_grands_prix_list(year)}
    except Exception as e:
        logger.error(f"Error fetching GPs: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar/{year}")
@limiter.limit("30/minute")
async def get_calendar(request: Request, year: int):
    """Each round with its real race start time, for the homepage countdown."""
    try:
        cache_key = f"calendar:{year}"
        cached = redis_cache.get(cache_key)
        if cached:
            return cached

        grands_prix = await get_grands_prix_list(year)
        race_sessions = await openf1.request("sessions", {"year": year, "session_name": "Race"})
        race_sessions = [s for s in race_sessions if "test" not in s.get("meeting_name", "").lower()]

        calendar = []
        for g in grands_prix:
            date_start = f"{g['date']}T00:00:00Z"  # fallback: the date at midnight UTC
            try:
                target_date = datetime.date.fromisoformat(g["date"])
                if race_sessions:
                    best = min(
                        race_sessions,
                        key=lambda s: abs((datetime.date.fromisoformat(s["date_start"][:10]) - target_date).days),
                    )
                    if abs((datetime.date.fromisoformat(best["date_start"][:10]) - target_date).days) <= 2:
                        date_start = best["date_start"]
            except Exception:
                pass
            calendar.append({
                "round": g["round"],
                "location": g["location"],
                "country": g["country"],
                "date_start": date_start,
            })

        result = {"year": year, "calendar": calendar}
        redis_cache.set(cache_key, result, ttl=21600)  # 6h: session times can still move before the weekend
        return result
    except Exception as e:
        logger.error(f"Error fetching calendar: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest-qualifying")
@limiter.limit("30/minute")
async def get_latest_qualifying(request: Request):
    """The latest qualifying session that's final, with its front row: the homepage's first card."""
    result = await latest_qualifying(datetime.datetime.now(datetime.timezone.utc))
    if result is None:
        raise HTTPException(status_code=404, detail="No qualifying session has finished yet")
    return result


@router.get("/drivers/{year}/{gp_round}/{session_type}")
@limiter.limit("20/minute")
async def get_drivers(request: Request, year: int, gp_round: int, session_type: str):
    """The session's drivers, in its classification order. OpenF1 from 2023, FastF1 before."""
    try:
        cache_key = f"drivers:{year}:{gp_round}:{session_type}"
        cached_data = await redis_cache.aget(cache_key)
        if cached_data:
            return cached_data

        if year >= openf1.FIRST_SEASON:
            session_key = await openf1.get_session_key(year, gp_round, session_type)
            raw = await openf1.request("drivers", {"session_key": session_key})
            drivers = [
                {
                    "abbreviation": d.get("name_acronym", ""),
                    "number": str(d.get("driver_number", "")),
                    "team": d.get("team_name") or "Unknown",
                    "fullName": d.get("full_name") or d.get("broadcast_name") or d.get("name_acronym", ""),
                }
                for d in raw if d.get("name_acronym")
            ]
            try:
                results = await openf1.request("session_result", {"session_key": session_key})
                pos_by_number = {
                    r["driver_number"]: r["position"]
                    for r in results
                    if r.get("position") is not None and r.get("driver_number") is not None
                }
                drivers.sort(key=lambda d: pos_by_number.get(int(d["number"]), 999) if d["number"].isdigit() else 999)
            except Exception as e:
                logger.warning(f"session_result ordering unavailable for {year} R{gp_round} {session_type}: {e}")
            ttl = DRIVERS_TTL if await openf1.session_settled(session_key) else UNSETTLED_DRIVERS_TTL
        else:
            session = fastf1.get_session(year, gp_round, session_type)
            await asyncio.to_thread(session.load)
            drivers = []
            for driver_code in session.drivers:
                driver_info = session.get_driver(driver_code)
                pos = driver_info.get("Position") if hasattr(driver_info, "get") else None
                drivers.append({
                    "abbreviation": str(driver_info["Abbreviation"]),
                    "number": str(driver_info["DriverNumber"]),
                    "team": str(driver_info["TeamName"]),
                    "fullName": str(driver_info["FullName"]) if "FullName" in driver_info else str(driver_info["Abbreviation"]),
                    "_pos": int(pos) if pos is not None and not pd.isna(pos) else 999,
                })
            drivers.sort(key=lambda d: d["_pos"])
            for d in drivers:
                del d["_pos"]
            ttl = DRIVERS_TTL

        redis_cache.set(cache_key, drivers, ttl=ttl)
        return drivers

    except HTTPException:
        raise
    except Exception as e:
        raise fastf1_http_error(e, f"Year {year}, round {gp_round}, session {session_type}.")
