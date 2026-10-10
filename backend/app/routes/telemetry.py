"""Lap telemetry comparisons on a shared 1000-point distance grid."""
import asyncio
import hashlib
import json
import logging
from typing import List

import fastf1
import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import Response
from pydantic import BaseModel
from scipy.interpolate import interp1d
from starlette.background import BackgroundTask

from app import openf1
from app.cache import redis_cache
from app.errors import fastf1_http_error
from app.limiter import limiter
from app.telemetry import (
    LapRef, circuit_corners, comparison_from_db, corner_distances, db_lap_ref,
    fetch_raw_lap, prepare_tel, raw_lap_from_db_row,
)
from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/telemetry/{year}/{gp_round}/{session_type}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_telemetry_comparison(
    request: Request,
    year: int,
    gp_round: int,
    session_type: str,
    driver1: str,
    driver2: str,
    lap_number1: int = Query(None),
    lap_number2: int = Query(None),
):
    """Two drivers' laps (fastest unless a lap number is given), with the
    running time delta between them. PostgreSQL, else OpenF1 (current season)
    or FastF1."""
    try:
        cache_key = redis_cache.telemetry_key(year, gp_round, session_type, driver1, lap_number1, driver2, lap_number2)
        cached_data = redis_cache.get(cache_key)
        if cached_data:
            return cached_data

        if db.available:
            db_result = await asyncio.to_thread(
                comparison_from_db,
                year, gp_round, session_type,
                driver1, lap_number1,
                driver2, lap_number2,
            )
            if db_result:
                redis_cache.set(cache_key, db_result, ttl=3600)
                return db_result

        if year >= 2026:
            session_key = await openf1.get_session_key(year, gp_round, session_type)
            # One request at a time, spaced out: OpenF1's rate limit
            d1_num = await openf1.get_driver_number(session_key, driver1)
            await asyncio.sleep(0.3)
            d2_num = await openf1.get_driver_number(session_key, driver2)
            await asyncio.sleep(0.3)
            lap1_info = await openf1.get_lap_info(session_key, d1_num, lap_number1)
            await asyncio.sleep(0.3)
            lap2_info = await openf1.get_lap_info(session_key, d2_num, lap_number2)
            await asyncio.sleep(0.3)
            tel1 = await openf1.fetch_lap_telemetry(session_key, d1_num, lap1_info["date_start"], lap1_info["lap_duration"])
            await asyncio.sleep(0.3)
            tel2 = await openf1.fetch_lap_telemetry(session_key, d2_num, lap2_info["date_start"], lap2_info["lap_duration"])

            sectors_driver1 = {
                "sector1": lap1_info.get("duration_sector_1"),
                "sector2": lap1_info.get("duration_sector_2"),
                "sector3": lap1_info.get("duration_sector_3"),
            }
            sectors_driver2 = {
                "sector1": lap2_info.get("duration_sector_1"),
                "sector2": lap2_info.get("duration_sector_2"),
                "sector3": lap2_info.get("duration_sector_3"),
            }
            lap_time1 = lap1_info.get("lap_duration")
            lap_time2 = lap2_info.get("lap_duration")
            actual_lap_number1 = lap1_info["lap_number"]
            actual_lap_number2 = lap2_info["lap_number"]

        else:
            session = fastf1.get_session(year, gp_round, session_type)
            await asyncio.to_thread(session.load)

            if lap_number1 is not None:
                laps1 = session.laps.pick_drivers(driver1)
                lap1_filtered = laps1[laps1["LapNumber"] == lap_number1]
                if lap1_filtered.empty:
                    raise HTTPException(status_code=404, detail=f"Lap {lap_number1} not found for {driver1}")
                lap1 = lap1_filtered.iloc[0]
            else:
                lap1 = session.laps.pick_drivers(driver1).pick_fastest()

            if lap_number2 is not None:
                laps2 = session.laps.pick_drivers(driver2)
                lap2_filtered = laps2[laps2["LapNumber"] == lap_number2]
                if lap2_filtered.empty:
                    raise HTTPException(status_code=404, detail=f"Lap {lap_number2} not found for {driver2}")
                lap2 = lap2_filtered.iloc[0]
            else:
                lap2 = session.laps.pick_drivers(driver2).pick_fastest()

            def _lap_invalid(lap) -> bool:
                return lap is None or (hasattr(lap, "__getitem__") and pd.isna(lap["DriverNumber"]))

            if _lap_invalid(lap1) or _lap_invalid(lap2):
                missing = driver1 if _lap_invalid(lap1) else driver2
                raise HTTPException(status_code=404, detail=f"Driver {missing} not found or no valid laps")

            sectors_driver1 = {
                "sector1": float(lap1["Sector1Time"].total_seconds()) if pd.notna(lap1["Sector1Time"]) else None,
                "sector2": float(lap1["Sector2Time"].total_seconds()) if pd.notna(lap1["Sector2Time"]) else None,
                "sector3": float(lap1["Sector3Time"].total_seconds()) if pd.notna(lap1["Sector3Time"]) else None,
            }
            sectors_driver2 = {
                "sector1": float(lap2["Sector1Time"].total_seconds()) if pd.notna(lap2["Sector1Time"]) else None,
                "sector2": float(lap2["Sector2Time"].total_seconds()) if pd.notna(lap2["Sector2Time"]) else None,
                "sector3": float(lap2["Sector3Time"].total_seconds()) if pd.notna(lap2["Sector3Time"]) else None,
            }
            tel1 = lap1.get_telemetry().add_distance()
            tel2 = lap2.get_telemetry().add_distance()
            lap_time1 = float(lap1["LapTime"].total_seconds()) if pd.notna(lap1["LapTime"]) else None
            lap_time2 = float(lap2["LapTime"].total_seconds()) if pd.notna(lap2["LapTime"]) else None
            actual_lap_number1 = int(lap1["LapNumber"]) if pd.notna(lap1["LapNumber"]) else lap_number1
            actual_lap_number2 = int(lap2["LapNumber"]) if pd.notna(lap2["LapNumber"]) else lap_number2

        if tel1 is None or tel1.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data for {driver1}")
        if tel2 is None or tel2.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data for {driver2}")

        tel1 = prepare_tel(tel1)
        tel2 = prepare_tel(tel2)
        if tel1.empty or len(tel1) < 2:
            raise HTTPException(status_code=404, detail=f"Insufficient telemetry data for {driver1}")
        if tel2.empty or len(tel2) < 2:
            raise HTTPException(status_code=404, detail=f"Insufficient telemetry data for {driver2}")

        rpm_col = next((c for c in ["RPM", "nRPM", "Rpm", "EngineRPM"] if c in tel1.columns), None)

        min_distance = max(tel1["Distance"].min(), tel2["Distance"].min())
        max_distance = min(tel1["Distance"].max(), tel2["Distance"].max())
        common_distance = np.linspace(min_distance, max_distance, 1000)

        interp_speed1    = interp1d(tel1["Distance"], tel1["Speed"],             kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle1 = interp1d(tel1["Distance"], tel1["Throttle"],          kind="linear",  bounds_error=False, fill_value=0)
        interp_brake1    = interp1d(tel1["Distance"], tel1["Brake"].astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear1     = interp1d(tel1["Distance"], tel1["nGear"],             kind="nearest", bounds_error=False, fill_value=0)
        interp_drs1      = interp1d(tel1["Distance"], tel1["DRS"],               kind="nearest", bounds_error=False, fill_value=0)
        interp_x1        = interp1d(tel1["Distance"], tel1["X"],                 kind="linear",  bounds_error=False, fill_value="extrapolate")
        interp_y1        = interp1d(tel1["Distance"], tel1["Y"],                 kind="linear",  bounds_error=False, fill_value="extrapolate")
        if rpm_col and rpm_col in tel1.columns:
            rpm1_series = pd.to_numeric(tel1[rpm_col], errors="coerce").fillna(10000)
            interp_rpm1 = interp1d(tel1["Distance"], rpm1_series, kind="linear", bounds_error=False, fill_value=10000)
        else:
            interp_rpm1 = lambda x: 10000

        interp_speed2    = interp1d(tel2["Distance"], tel2["Speed"],             kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle2 = interp1d(tel2["Distance"], tel2["Throttle"],          kind="linear",  bounds_error=False, fill_value=0)
        interp_brake2    = interp1d(tel2["Distance"], tel2["Brake"].astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear2     = interp1d(tel2["Distance"], tel2["nGear"],             kind="nearest", bounds_error=False, fill_value=0)
        interp_drs2      = interp1d(tel2["Distance"], tel2["DRS"],               kind="nearest", bounds_error=False, fill_value=0)
        if rpm_col and rpm_col in tel2.columns:
            rpm2_series = pd.to_numeric(tel2[rpm_col], errors="coerce").fillna(10000)
            interp_rpm2 = interp1d(tel2["Distance"], rpm2_series, kind="linear", bounds_error=False, fill_value=10000)
        else:
            interp_rpm2 = lambda x: 10000

        telemetry_data = []
        cumulative_time1 = 0.0
        cumulative_time2 = 0.0
        prev_speed1 = 0.0
        prev_speed2 = 0.0
        for i, dist in enumerate(common_distance):
            speed1 = float(interp_speed1(dist))
            speed2 = float(interp_speed2(dist))

            # Time over each segment at its average speed (km/h -> m/s)
            if i > 0:
                segment_distance = dist - common_distance[i - 1]
                avg_speed1 = (speed1 + prev_speed1) / 2 / 3.6
                avg_speed2 = (speed2 + prev_speed2) / 2 / 3.6
                if avg_speed1 > 0:
                    cumulative_time1 += segment_distance / avg_speed1
                if avg_speed2 > 0:
                    cumulative_time2 += segment_distance / avg_speed2

            telemetry_data.append({
                "distance": float(dist),
                "speed1": speed1,
                "speed2": speed2,
                "throttle1": float(interp_throttle1(dist)),
                "throttle2": float(interp_throttle2(dist)),
                "brake1": bool(interp_brake1(dist)),
                "brake2": bool(interp_brake2(dist)),
                "gear1": int(interp_gear1(dist)),
                "gear2": int(interp_gear2(dist)),
                "drs1": int(interp_drs1(dist)),
                "drs2": int(interp_drs2(dist)),
                "x": float(interp_x1(dist)),
                "y": float(interp_y1(dist)),
                # Positive: driver 1 ahead
                "delta": float(cumulative_time2 - cumulative_time1),
                "rpm1": float(interp_rpm1(dist)),
                "rpm2": float(interp_rpm2(dist)),
            })
            prev_speed1 = speed1
            prev_speed2 = speed2

        result = {
            "telemetry": telemetry_data,
            "lapTime1": lap_time1,
            "lapTime2": lap_time2,
            "sectors1": sectors_driver1,
            "sectors2": sectors_driver2,
            "driver1": driver1,
            "driver2": driver2,
            "lapNumber1": actual_lap_number1,
            "lapNumber2": actual_lap_number2,
        }
        redis_cache.set(cache_key, result, ttl=3600)
        return result

    except HTTPException:
        raise
    except Exception as e:
        context = f"{driver1} vs {driver2}, {year} round {gp_round} {session_type}"
        if lap_number1:
            context += f" lap1 {lap_number1}"
        if lap_number2:
            context += f" lap2 {lap_number2}"
        raise fastf1_http_error(e, context)


class TelemetryMultiRequest(BaseModel):
    laps: List[LapRef]


@router.post("/telemetry/multi")
@limiter.limit("5/minute")
async def get_telemetry_multi(request: Request, body: TelemetryMultiRequest):
    """2 to 10 laps — any drivers, sessions or seasons — on one distance grid."""
    if len(body.laps) < 2:
        raise HTTPException(status_code=400, detail="At least 2 laps required")
    if len(body.laps) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 laps allowed")

    cache_key = "tel:multi:" + hashlib.md5(
        json.dumps([l.model_dump() for l in body.laps], sort_keys=True).encode()
    ).hexdigest()[:16]
    cached = await redis_cache.aget_raw(cache_key)
    if cached:
        return Response(content=cached, media_type="application/json")

    # Every lap from PostgreSQL in one query, alongside the circuit's corners from Redis
    ref = body.laps[0]
    corners_key = f"circuit:corners:{ref.year}:{ref.gp}"
    db_rows, circuit_data = await asyncio.gather(
        asyncio.to_thread(db.get_telemetry_with_metadata, [db_lap_ref(l) for l in body.laps])
        if db.available else asyncio.sleep(0, result={}),
        redis_cache.aget(corners_key),
        return_exceptions=True,
    )
    if isinstance(db_rows, BaseException):
        logger.warning(f"DB telemetry unavailable: {db_rows}")
        db_rows = {}
    if isinstance(circuit_data, BaseException):
        circuit_data = None

    # Laps not in the DB, one at a time, spaced out between OpenF1 calls
    raw_laps: list[dict] = []
    openf1_used = False
    for lap_ref in body.laps:
        row = db_rows.get(db_lap_ref(lap_ref))
        raw = raw_lap_from_db_row(lap_ref, row) if row else None
        if raw is None:
            if openf1_used and lap_ref.year >= 2026:
                await asyncio.sleep(0.5)
            raw = await fetch_raw_lap(lap_ref)
            openf1_used = openf1_used or lap_ref.year >= 2026
        raw_laps.append(raw)

    corners: list[dict] = []
    rotation: float = 0.0
    try:
        if circuit_data is None:
            circuit_data = await asyncio.to_thread(circuit_corners, ref.year, ref.gp, ref.session)
            await asyncio.to_thread(redis_cache.set, corners_key, circuit_data, 2592000)  # 30 days: layouts are static
        rotation = circuit_data["rotation"]
        # FastF1 and OpenF1 share the same X/Y frame (the F1 live-timing feed)
        corners = corner_distances(
            circuit_data["corners"],
            raw_laps[0]["x"].astype(float), raw_laps[0]["y"].astype(float), raw_laps[0]["dist"].astype(float),
        )
    except Exception as e:
        logger.warning(f"circuit corners unavailable for {ref.year} R{ref.gp}: {e}")
        corners = []

    ref_dist = raw_laps[0]["dist"].astype(float)
    min_d, max_d = float(ref_dist.min()), float(ref_dist.max())
    N = 1000
    common_dist = np.linspace(min_d, max_d, N)

    # Each lap's distance is scaled onto the reference lap's range, so laps
    # from other seasons (slightly different lengths) line up corner for corner
    kw = dict(bounds_error=False)
    i_speed, i_throttle, i_brake, i_gear, i_rpm = [], [], [], [], []
    i_x = i_y = None
    ref_range = max_d - min_d
    for idx, raw in enumerate(raw_laps):
        d = raw["dist"].astype(float)
        d_range = d.max() - d.min()
        d_sc = (d - d.min()) / d_range * ref_range + min_d if d_range > 0 and ref_range > 0 else d

        i_speed.append(interp1d(d_sc, raw["speed"],       kind="linear",  fill_value=0,     **kw))
        i_throttle.append(interp1d(d_sc, raw["throttle"], kind="linear",  fill_value=0,     **kw))
        i_brake.append(interp1d(d_sc, raw["brake"],       kind="nearest", fill_value=0,     **kw))
        i_gear.append(interp1d(d_sc, raw["gear"],         kind="nearest", fill_value=1,     **kw))
        i_rpm.append(interp1d(d_sc, raw["rpm"],           kind="linear",  fill_value=10000, **kw))
        if idx == 0:
            i_x = interp1d(d_sc, raw["x"], kind="linear", fill_value="extrapolate")
            i_y = interp1d(d_sc, raw["y"], kind="linear", fill_value="extrapolate")

    n_laps = len(raw_laps)
    speeds_grid = np.array([f(common_dist) for f in i_speed], dtype=float)  # (n_laps, N)

    # Cumulative time per lap, then scaled to its official lap time
    cum_times = np.zeros((n_laps, N))
    for i in range(1, N):
        seg = common_dist[i] - common_dist[i - 1]
        avg_spd = (speeds_grid[:, i] + speeds_grid[:, i - 1]) / 2 / 3.6
        dt = np.where(avg_spd > 0, seg / avg_spd, 0.0)
        cum_times[:, i] = cum_times[:, i - 1] + dt
    for j, raw in enumerate(raw_laps):
        lt = raw["lap_time"]
        if lt and cum_times[j, -1] > 0:
            cum_times[j] *= lt / cum_times[j, -1]

    # Interpolators evaluated over the whole grid at once (one call per series)
    def _grid(interps) -> np.ndarray:  # (N, n_laps)
        return np.array([f(common_dist) for f in interps], dtype=float).T

    speeds = speeds_grid.T.tolist()
    throttles = _grid(i_throttle).tolist()
    brakes = (_grid(i_brake) != 0).tolist()
    gears = _grid(i_gear).astype(int).tolist()
    rpms = _grid(i_rpm).tolist()
    deltas = (cum_times - cum_times[0]).T.tolist()
    dists, xs, ys = common_dist.tolist(), i_x(common_dist).tolist(), i_y(common_dist).tolist()
    telemetry = [
        {
            "distance":  dists[i],
            "speeds":    speeds[i],
            "throttles": throttles[i],
            "brakes":    brakes[i],
            "gears":     gears[i],
            "rpms":      rpms[i],
            "deltas":    deltas[i],
            "x":         xs[i],
            "y":         ys[i],
        }
        for i in range(N)
    ]

    drivers_meta = [
        {
            "driver":  r.driver, "year": r.year, "gp": r.gp, "session": r.session,
            "lap":     raw["lap_number"], "lapTime": raw["lap_time"], "sectors": raw["sectors"],
        }
        for r, raw in zip(body.laps, raw_laps)
    ]

    result = {"drivers": drivers_meta, "telemetry": telemetry, "corners": corners, "rotation": rotation}
    # Serialized once for both the response and the cache (same settings as
    # FastAPI's own JSON); the cache write runs after the response is sent.
    payload = json.dumps(result, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    return Response(
        content=payload,
        media_type="application/json",
        background=BackgroundTask(redis_cache.set_raw, cache_key, payload, 3600),
    )
