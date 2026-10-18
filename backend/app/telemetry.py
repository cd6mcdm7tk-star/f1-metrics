"""Lap telemetry: cleaning it, and reading it from PostgreSQL, OpenF1 or FastF1."""
import asyncio
import logging
from typing import Optional

import fastf1
import numpy as np
import pandas as pd
from fastapi import HTTPException
from pydantic import BaseModel

from app import openf1

logger = logging.getLogger(__name__)


class LapRef(BaseModel):
    year: int
    gp: int
    session: str
    driver: str
    lap: Optional[int] = None  # None = fastest lap


def prepare_tel(tel: pd.DataFrame) -> pd.DataFrame:
    """Makes a FastF1/OpenF1 telemetry frame safe to interpolate: drops rows
    without Distance, keeps Distance strictly increasing, and fills missing
    or NaN channels (seen in 2026 OpenF1 data)."""
    if tel is None or tel.empty:
        return tel
    if "Distance" not in tel.columns:
        return pd.DataFrame()

    tel = tel.dropna(subset=["Distance"])
    if "Distance" in tel.columns and len(tel) > 1:
        tel = tel.sort_values("Distance", ascending=True)
        tel = tel.drop_duplicates(subset=["Distance"], keep="first")
        tel = tel.reset_index(drop=True)

    required = {"Speed": 0.0, "Throttle": 0.0, "Brake": 0, "nGear": 0, "DRS": 0, "X": 0.0, "Y": 0.0}
    for col, default in required.items():
        if col not in tel.columns:
            tel[col] = default
        else:
            tel[col] = pd.to_numeric(tel[col], errors="coerce").fillna(default)
    return tel


def db_lap_ref(lap_ref: LapRef) -> tuple:
    """A lap's key in the telemetry table: (year, gp_round, session_type, driver_code, lap_type)."""
    lap_type = "fastest" if lap_ref.lap is None else f"lap_{lap_ref.lap}"
    return (lap_ref.year, lap_ref.gp, lap_ref.session, lap_ref.driver, lap_type)


def raw_lap_from_db_row(lap_ref: LapRef, row: dict) -> dict | None:
    """Raw telemetry arrays for one lap from its db.get_telemetry_with_metadata()
    row, or None if the stored data is unusable."""
    try:
        d = row["telemetry_data"]
        dist_arr = np.array(d["distance"], dtype=float)
        _, idx = np.unique(dist_arr, return_index=True)

        def _pick(key, default=0.0):
            arr = d.get(key, [default] * len(dist_arr))
            return np.array(arr)[idx]

        return {
            "dist":     dist_arr[idx],
            "speed":    _pick("speed"),
            "throttle": _pick("throttle"),
            "brake":    np.array(d.get("brake", [False] * len(dist_arr)), dtype=int)[idx],
            "gear":     _pick("gear", 1),
            "rpm":      _pick("rpm", 10000),
            "x":        _pick("x"),
            "y":        _pick("y"),
            "lap_time": row.get("lap_time"),
            "sectors": {
                "s1": row.get("sector1_time"),
                "s2": row.get("sector2_time"),
                "s3": row.get("sector3_time"),
            },
            "lap_number": row["lap_number"],
        }
    except Exception as e:
        logger.warning(f"DB data unusable for {lap_ref.driver} {lap_ref.year} R{lap_ref.gp} {lap_ref.session}: {e}")
        return None


async def fetch_raw_lap(lap_ref: LapRef) -> dict:
    """Raw telemetry for one lap that isn't in PostgreSQL: OpenF1 for the
    current season, FastF1 before that."""
    year, gp, session, driver, lap = lap_ref.year, lap_ref.gp, lap_ref.session, lap_ref.driver, lap_ref.lap

    if year >= 2026:
        session_key = await openf1.get_session_key(year, gp, session)
        await asyncio.sleep(0.3)
        d_num = await openf1.get_driver_number(session_key, driver)
        await asyncio.sleep(0.3)
        lap_info = await openf1.get_lap_info(session_key, d_num, lap)
        await asyncio.sleep(0.3)
        tel_df = await openf1.fetch_lap_telemetry(session_key, d_num, lap_info["date_start"], lap_info["lap_duration"])
        if tel_df is None or tel_df.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry for {driver}")
        tel_df = prepare_tel(tel_df)
        dist = tel_df["Distance"].values
        rpm_col = next((c for c in ["RPM", "nRPM", "Rpm"] if c in tel_df.columns), None)
        rpm_arr = pd.to_numeric(tel_df[rpm_col], errors="coerce").fillna(10000).values if rpm_col else np.full(len(dist), 10000.0)
        return {
            "dist":     dist,
            "speed":    tel_df["Speed"].values,
            "throttle": tel_df["Throttle"].values,
            "brake":    tel_df["Brake"].astype(int).values,
            "gear":     tel_df["nGear"].values,
            "rpm":      rpm_arr,
            "x":        tel_df["X"].values if "X" in tel_df.columns else np.zeros(len(dist)),
            "y":        tel_df["Y"].values if "Y" in tel_df.columns else np.zeros(len(dist)),
            "lap_time": lap_info.get("lap_duration"),
            "sectors":  {"s1": lap_info.get("duration_sector_1"), "s2": lap_info.get("duration_sector_2"), "s3": lap_info.get("duration_sector_3")},
            "lap_number": lap_info["lap_number"],
        }

    def _ff1_fetch():
        sess = fastf1.get_session(year, gp, session)
        sess.load()
        driver_laps = sess.laps.pick_drivers(driver)
        if lap is not None:
            lap_rows = driver_laps[driver_laps["LapNumber"] == lap]
            if lap_rows.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap} not found for {driver}")
            lap_row = lap_rows.iloc[0]
        else:
            lap_row = driver_laps.pick_fastest()
        tel = lap_row.get_telemetry().add_distance()
        tel = prepare_tel(tel)
        rpm_col = next((c for c in ["RPM", "nRPM", "Rpm"] if c in tel.columns), None)
        rpm_arr = pd.to_numeric(tel[rpm_col], errors="coerce").fillna(10000).values if rpm_col else np.full(len(tel), 10000.0)
        lap_t = float(lap_row["LapTime"].total_seconds()) if pd.notna(lap_row.get("LapTime")) else None
        return {
            "dist":     tel["Distance"].values,
            "speed":    tel["Speed"].values,
            "throttle": tel["Throttle"].values,
            "brake":    tel["Brake"].astype(int).values,
            "gear":     tel["nGear"].values,
            "rpm":      rpm_arr,
            "x":        tel["X"].values if "X" in tel.columns else np.zeros(len(tel)),
            "y":        tel["Y"].values if "Y" in tel.columns else np.zeros(len(tel)),
            "lap_time": lap_t,
            "sectors": {
                "s1": float(lap_row["Sector1Time"].total_seconds()) if pd.notna(lap_row.get("Sector1Time")) else None,
                "s2": float(lap_row["Sector2Time"].total_seconds()) if pd.notna(lap_row.get("Sector2Time")) else None,
                "s3": float(lap_row["Sector3Time"].total_seconds()) if pd.notna(lap_row.get("Sector3Time")) else None,
            },
            "lap_number": int(lap_row["LapNumber"]) if pd.notna(lap_row.get("LapNumber")) else (lap or 0),
        }

    return await asyncio.to_thread(_ff1_fetch)


def circuit_corners(year: int, gp: int, session_type: str) -> dict:
    """Official FIA corner numbers with their (X, Y) positions, and the
    circuit's display rotation — FastF1's circuit reference data."""
    sess = fastf1.get_session(year, gp, session_type)
    sess.load(laps=True, telemetry=False, weather=False, messages=False)
    ci = sess.get_circuit_info()
    corners = [
        {
            "number": int(row.Number),
            "letter": (row.Letter or "").strip() or None,
            "x": float(row.X),
            "y": float(row.Y),
        }
        for row in ci.corners.itertuples()
    ]
    return {"corners": corners, "rotation": float(ci.rotation)}


# Positions further than this from the reference path aren't used to align a lap (X/Y units: 0.1 m)
ALIGN_MAX_MISS = 300.0
# Half-width of the window the alignment's correction is smoothed over (m)
ALIGN_SMOOTHING = 100.0
# Corrections larger than this mean the positions can't be trusted (m)
ALIGN_MAX_SHIFT = 150.0


def path_distances(x: np.ndarray, y: np.ndarray, ref_x: np.ndarray, ref_y: np.ndarray, ref_dist: np.ndarray) -> np.ndarray:
    """How far along the reference lap each position is, NaN when it's off
    the reference's path. Projected onto the path's segments, searching only
    forward from the previous match, like corner_distances()."""
    seg_x, seg_y = np.diff(ref_x), np.diff(ref_y)
    seg_len2 = np.maximum(seg_x ** 2 + seg_y ** 2, 1e-9)
    out = np.full(len(x), np.nan)
    k = 0
    for i, (px, py) in enumerate(zip(x, y)):
        lo, hi = max(k - 5, 0), min(k + 60, len(seg_x))
        u = np.clip(((px - ref_x[lo:hi]) * seg_x[lo:hi] + (py - ref_y[lo:hi]) * seg_y[lo:hi]) / seg_len2[lo:hi], 0, 1)
        miss = np.hypot(ref_x[lo:hi] + u * seg_x[lo:hi] - px, ref_y[lo:hi] + u * seg_y[lo:hi] - py)
        best = int(np.argmin(miss))
        if miss[best] <= ALIGN_MAX_MISS:
            k = lo + best
            out[i] = ref_dist[k] + u[best] * (ref_dist[k + 1] - ref_dist[k])
    return out


def aligned_distance(dist: np.ndarray, x: np.ndarray, y: np.ndarray,
                     ref_dist: np.ndarray, ref_x: np.ndarray, ref_y: np.ndarray) -> np.ndarray:
    """A lap's distance put onto the reference lap's by their positions.

    Speed integrated from a lap's start is smooth but drifts: OpenF1's lap
    start times are a tenth of a second or so out, and its car data has gaps,
    so two laps can sit 10 m apart, enough to make up a braking point or
    20 km/h into a corner. Where each sample is along the reference's path,
    against where its own distance puts it, gives the drift; smoothed, it
    corrects the distance. Unchanged when the positions can't be used."""
    if len(dist) < 10 or not np.any(x) or not np.any(ref_x):
        return dist
    along = path_distances(x, y, ref_x, ref_y, ref_dist)
    valid = ~np.isnan(along)
    if valid.mean() < 0.8:
        return dist
    drift = along[valid] - dist[valid]
    at = dist[valid]
    smooth = np.array([np.median(drift[np.abs(at - d) <= ALIGN_SMOOTHING]) for d in at])
    if np.abs(smooth).max() > ALIGN_MAX_SHIFT:
        return dist
    corrected = dist + np.interp(dist, at, smooth)
    # Still strictly increasing, for the interpolation onto the shared grid
    return np.maximum.accumulate(corrected) + np.arange(len(corrected)) * 1e-6


def corner_distances(raw_corners: list[dict], ref_x: np.ndarray, ref_y: np.ndarray, ref_dist: np.ndarray) -> list[dict]:
    """Places each corner at a distance along the reference lap by nearest
    (X, Y) point. FIA corners are numbered in lap order, so each one is only
    searched forward from the previous match — a whole-lap search mismatches
    corners packed close together in space (e.g. Baku's castle section)."""
    corners = []
    search_start = 0
    for c in sorted(raw_corners, key=lambda c: c["number"]):
        d2 = (ref_x[search_start:] - c["x"]) ** 2 + (ref_y[search_start:] - c["y"]) ** 2
        idx = search_start + int(np.argmin(d2))
        corners.append({"number": c["number"], "letter": c["letter"], "distance": float(ref_dist[idx])})
        search_start = idx
    return corners
