"""A driver's laps in a session (times, sectors, tyre, telemetry availability)."""
import asyncio
import logging

import fastf1
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Request

from app import openf1
from app.access import season_access
from app.cache import redis_cache
from app.errors import fastf1_http_error
from app.limiter import limiter
from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


def _lap_entry(year: int, gp_round: int, driver: str, lap_number, lap_time, s1, s2, s3, *,
               is_pb: bool, is_hot_lap: bool, has_telemetry: bool, team, compound,
               air_temp=None, track_temp=None) -> dict:
    return {
        "Position":       None,
        "Id":             f"{year}_{gp_round}_{lap_number}_{driver}",
        "LapNumber":      lap_number,
        "LapTime":        lap_time,
        "Sector1Time":    s1,
        "Sector2Time":    s2,
        "Sector3Time":    s3,
        "IsPersonalBest": bool(is_pb),
        "IsHotLap":       is_hot_lap,
        "HasTelemetry":   has_telemetry,
        "Team":           team,
        "Driver":         driver,
        "Compound":       compound,
        "AirTemp":        air_temp,
        "TrackTemp":      track_temp,
        "WindSpeed":      None,
    }


def _session_laps(year: int, gp_round: int, session_type: str, driver: str, team, laps: list[dict], source: str | None) -> dict:
    result = {
        "driver":      driver,
        "team":        team,
        "session":     f"{year} R{gp_round} {session_type}",
        "year":        year,
        "round":       gp_round,
        "sessionType": session_type,
        "totalLaps":   len(laps),
        "laps":        laps,
    }
    if source:
        result["source"] = source
    return result


@router.get("/session-laps/{year}/{gp_round}/{session_type}/{driver}", dependencies=[Depends(season_access)])
@limiter.limit("10/minute")
async def get_session_laps(request: Request, year: int, gp_round: int, session_type: str, driver: str):
    """PostgreSQL for ingested sessions, else Redis, else OpenF1 (current
    season) or FastF1."""
    try:
        # PostgreSQL and Redis queried together: each round trip is costly
        cache_key = redis_cache.laps_key(year, gp_round, session_type, driver)
        if db.available:
            cached_data, db_laps = await asyncio.gather(
                redis_cache.aget(cache_key),
                asyncio.to_thread(db.get_laps, year, gp_round, session_type, driver),
                return_exceptions=True,
            )
            if isinstance(db_laps, BaseException):
                logger.warning(f"DB laps unavailable for {driver} {year} R{gp_round} {session_type}: {db_laps}")
                db_laps = []
            if isinstance(cached_data, BaseException):
                cached_data = None
        else:
            cached_data, db_laps = await redis_cache.aget(cache_key), []

        # The database wins over an older Redis entry when the session is ingested
        if db_laps:
            fastest_time = min((l["lap_time"] for l in db_laps if l["lap_time"] is not None), default=None)
            laps_data = []
            for l in db_laps:
                lt = l["lap_time"]
                laps_data.append(_lap_entry(
                    year, gp_round, driver, l["lap_number"], lt, l["sector1_time"], l["sector2_time"], l["sector3_time"],
                    is_pb=fastest_time is not None and lt is not None and abs(lt - fastest_time) < 0.001,
                    is_hot_lap=lt is not None,
                    has_telemetry=bool(l["telemetry_available"]),
                    team=None,
                    compound=l["compound"],
                ))
            return _session_laps(year, gp_round, session_type, driver, None, laps_data, "postgresql")

        if cached_data:
            return cached_data

        if year >= openf1.FIRST_SEASON:
            session_key = await openf1.get_session_key(year, gp_round, session_type)
            driver_num = await openf1.get_driver_number(session_key, driver)
            raw_laps = await openf1.request("laps", {"session_key": session_key, "driver_number": driver_num})
            if not raw_laps:
                raise HTTPException(status_code=404, detail=f"No laps found for {driver}")

            # /laps has no tyre compound: it comes from /stints, by lap range
            compound_by_lap: dict[int, str] = {}
            try:
                stints = await openf1.request("stints", {"session_key": session_key, "driver_number": driver_num})
                for stint in stints:
                    compound = stint.get("compound")
                    lap_start, lap_end = stint.get("lap_start"), stint.get("lap_end")
                    if compound and lap_start is not None and lap_end is not None:
                        for n in range(lap_start, lap_end + 1):
                            compound_by_lap[n] = compound
            except Exception as e:
                logger.warning(f"stints fetch failed for {driver} {year} R{gp_round} {session_type}: {e}")

            valid_times = [l["lap_duration"] for l in raw_laps if l.get("lap_duration") is not None]
            fastest_time = min(valid_times) if valid_times else None

            laps_data = []
            for lap in raw_laps:
                lap_num = lap.get("lap_number")
                lap_time = lap.get("lap_duration")
                laps_data.append(_lap_entry(
                    year, gp_round, driver, lap_num, lap_time,
                    lap.get("duration_sector_1"), lap.get("duration_sector_2"), lap.get("duration_sector_3"),
                    is_pb=fastest_time is not None and lap_time is not None and abs(lap_time - fastest_time) < 0.001,
                    is_hot_lap=lap_time is not None,
                    has_telemetry=lap_time is not None and lap.get("date_start") is not None,
                    team=None,
                    compound=compound_by_lap.get(lap_num) or lap.get("compound"),
                ))
            laps_data.sort(key=lambda x: x["LapNumber"] if x["LapNumber"] is not None else 0)

            result = _session_laps(year, gp_round, session_type, driver, None, laps_data, "openf1")
            redis_cache.set(cache_key, result, ttl=3600)
            return result

        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)

        driver_laps = session.laps[session.laps["Driver"] == driver]
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No laps found for driver {driver}")

        driver_info = session.get_driver(driver)
        team_name = driver_info["TeamName"] if driver_info is not None else "Unknown"
        fastest_lap_time = driver_laps["LapTime"].min()

        laps_data = []
        for _, lap in driver_laps.iterrows():
            lap_time = lap["LapTime"]
            lap_number = lap["LapNumber"]
            # Every lap is listed, out- and in-laps included
            laps_data.append(_lap_entry(
                year, gp_round, driver,
                int(lap_number) if pd.notna(lap_number) else None,
                float(lap_time.total_seconds()) if pd.notna(lap_time) else None,
                float(lap["Sector1Time"].total_seconds()) if pd.notna(lap["Sector1Time"]) else None,
                float(lap["Sector2Time"].total_seconds()) if pd.notna(lap["Sector2Time"]) else None,
                float(lap["Sector3Time"].total_seconds()) if pd.notna(lap["Sector3Time"]) else None,
                is_pb=(lap_time == fastest_lap_time) if pd.notna(lap_time) and pd.notna(fastest_lap_time) else False,
                is_hot_lap=bool(pd.notna(lap_time) and not lap.get("IsAccurate", True) == False),
                # IsAccurate is already loaded: no need to load each lap's telemetry to know
                has_telemetry=bool(pd.notna(lap.get("IsAccurate")) and lap.get("IsAccurate") == True and pd.notna(lap_time)),
                team=team_name,
                compound=lap["Compound"] if pd.notna(lap.get("Compound")) else None,
                air_temp=float(lap["AirTemp"]) if pd.notna(lap.get("AirTemp")) else None,
                track_temp=float(lap["TrackTemp"]) if pd.notna(lap.get("TrackTemp")) else None,
            ))
        laps_data.sort(key=lambda x: x["LapNumber"] if x["LapNumber"] is not None else 0)

        result = _session_laps(year, gp_round, session_type, driver, team_name, laps_data, None)
        redis_cache.set(cache_key, result, ttl=3600)
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise fastf1_http_error(e, f"Driver {driver}, {year} round {gp_round} {session_type}.")
