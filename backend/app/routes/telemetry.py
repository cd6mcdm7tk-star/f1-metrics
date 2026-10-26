"""Multi-lap telemetry comparison on a shared 1000-point distance grid."""
import asyncio
import hashlib
import json
import logging
from typing import List

import numpy as np
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response
from pydantic import BaseModel
from scipy.interpolate import interp1d
from starlette.background import BackgroundTask

from app import openf1
from app.access import check_season_access
from app.cache import redis_cache
from app.limiter import limiter
from app.telemetry import (
    LapRef, aligned_distance, circuit_corners, corner_distances, db_lap_ref, fetch_raw_lap, raw_lap_from_db_row,
)
from database import db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


class TelemetryMultiRequest(BaseModel):
    laps: List[LapRef]


def _channel(dist: np.ndarray, values: np.ndarray, kind: str = "linear") -> interp1d:
    """One channel of a lap over distance. An aligned lap can stop a few
    metres short of the grid's ends: its end values carry on."""
    return interp1d(dist, values, kind=kind, bounds_error=False, fill_value=(values[0], values[-1]))


@router.post("/telemetry/multi")
@limiter.limit("5/minute")
async def get_telemetry_multi(request: Request, body: TelemetryMultiRequest):
    """2 to 10 laps — any drivers, sessions or seasons — on one distance grid."""
    if len(body.laps) < 2:
        raise HTTPException(status_code=400, detail="At least 2 laps required")
    if len(body.laps) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 laps allowed")
    # Before the cache: a comparison cached for a subscriber isn't served to anyone else
    await check_season_access(request, max(lap.year for lap in body.laps))

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
            from_openf1 = lap_ref.year >= openf1.FIRST_SEASON
            if openf1_used and from_openf1:
                await asyncio.sleep(0.5)
            raw = await fetch_raw_lap(lap_ref)
            openf1_used = openf1_used or from_openf1
        raw_laps.append(raw)

    corners: list[dict] = []
    rotation: float = 0.0
    try:
        if circuit_data is None:
            circuit_data = await circuit_corners(ref.year, ref.gp, ref.session)
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
    # from other seasons (slightly different lengths) line up corner for corner,
    # then a lap of the same event is put onto the reference by their positions
    ref_x, ref_y = raw_laps[0]["x"].astype(float), raw_laps[0]["y"].astype(float)
    i_speed, i_throttle, i_brake, i_gear, i_rpm = [], [], [], [], []
    i_x = i_y = None
    ref_range = max_d - min_d
    for idx, (lap_ref, raw) in enumerate(zip(body.laps, raw_laps)):
        d = raw["dist"].astype(float)
        d_range = d.max() - d.min()
        d_sc = (d - d.min()) / d_range * ref_range + min_d if d_range > 0 and ref_range > 0 else d
        if idx > 0 and (lap_ref.year, lap_ref.gp) == (ref.year, ref.gp):
            d_sc = aligned_distance(d_sc, raw["x"].astype(float), raw["y"].astype(float), ref_dist, ref_x, ref_y)

        i_speed.append(_channel(d_sc, raw["speed"]))
        i_throttle.append(_channel(d_sc, raw["throttle"]))
        i_brake.append(_channel(d_sc, raw["brake"], "nearest"))
        i_gear.append(_channel(d_sc, raw["gear"], "nearest"))
        i_rpm.append(_channel(d_sc, raw["rpm"]))
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
