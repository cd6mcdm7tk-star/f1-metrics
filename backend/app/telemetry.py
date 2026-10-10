"""Lap telemetry: cleaning, reading it from PostgreSQL / OpenF1 / FastF1, and
interpolating laps onto a shared distance grid."""
import asyncio
import logging
import math
from typing import Optional

import fastf1
import numpy as np
import pandas as pd
from fastapi import HTTPException
from pydantic import BaseModel
from scipy.interpolate import interp1d

from app import openf1
from database import db

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


def comparison_from_db(
    year: int, gp_round: int, session_type: str,
    driver1: str, lap_number1,
    driver2: str, lap_number2,
) -> dict | None:
    """A two-driver comparison from PostgreSQL, same shape as the live path,
    or None if either lap isn't stored. Runs in a thread (psycopg2 is sync)."""
    try:
        lap_type1 = "fastest" if lap_number1 is None else f"lap_{lap_number1}"
        lap_type2 = "fastest" if lap_number2 is None else f"lap_{lap_number2}"

        t1 = db.get_telemetry(year, gp_round, session_type, driver1, lap_type1)
        t2 = db.get_telemetry(year, gp_round, session_type, driver2, lap_type2)
        if t1 is None or t2 is None:
            return None

        actual_lap1 = t1["lap_number"]
        actual_lap2 = t2["lap_number"]
        lap1_meta = db.get_lap_metadata(year, gp_round, session_type, driver1, actual_lap1) or {}
        lap2_meta = db.get_lap_metadata(year, gp_round, session_type, driver2, actual_lap2) or {}

        def _dedup(data: dict, dist_key: str = "distance") -> dict:
            dist = np.array(data[dist_key], dtype=float)
            _, idx = np.unique(dist, return_index=True)
            return {k: [v[i] for i in idx] for k, v in data.items()}

        d1 = _dedup(t1["telemetry_data"])
        d2 = _dedup(t2["telemetry_data"])

        dist1 = np.array(d1["distance"], dtype=float)
        dist2 = np.array(d2["distance"], dtype=float)

        min_distance = max(dist1.min(), dist2.min())
        max_distance = min(dist1.max(), dist2.max())
        common_distance = np.linspace(min_distance, max_distance, 1000)

        interp_speed1    = interp1d(dist1, d1["speed"],                   kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle1 = interp1d(dist1, d1["throttle"],                kind="linear",  bounds_error=False, fill_value=0)
        interp_brake1    = interp1d(dist1, np.array(d1["brake"]).astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear1     = interp1d(dist1, d1["gear"],                    kind="nearest", bounds_error=False, fill_value=0)
        interp_drs1      = interp1d(dist1, d1["drs"],                     kind="nearest", bounds_error=False, fill_value=0)
        interp_rpm1      = interp1d(dist1, d1["rpm"],                     kind="linear",  bounds_error=False, fill_value=10000)
        interp_x1        = interp1d(dist1, d1["x"],                       kind="linear",  bounds_error=False, fill_value="extrapolate")
        interp_y1        = interp1d(dist1, d1["y"],                       kind="linear",  bounds_error=False, fill_value="extrapolate")

        interp_speed2    = interp1d(dist2, d2["speed"],                   kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle2 = interp1d(dist2, d2["throttle"],                kind="linear",  bounds_error=False, fill_value=0)
        interp_brake2    = interp1d(dist2, np.array(d2["brake"]).astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear2     = interp1d(dist2, d2["gear"],                    kind="nearest", bounds_error=False, fill_value=0)
        interp_drs2      = interp1d(dist2, d2["drs"],                     kind="nearest", bounds_error=False, fill_value=0)
        interp_rpm2      = interp1d(dist2, d2["rpm"],                     kind="linear",  bounds_error=False, fill_value=10000)

        # Cumulative time from speed over distance...
        cum_times1 = [0.0] * len(common_distance)
        cum_times2 = [0.0] * len(common_distance)
        speeds1 = [float(interp_speed1(d)) for d in common_distance]
        speeds2 = [float(interp_speed2(d)) for d in common_distance]
        for i in range(1, len(common_distance)):
            seg = common_distance[i] - common_distance[i - 1]
            avg1 = (speeds1[i] + speeds1[i - 1]) / 2 / 3.6
            avg2 = (speeds2[i] + speeds2[i - 1]) / 2 / 3.6
            cum_times1[i] = cum_times1[i - 1] + (seg / avg1 if avg1 > 0 else 0)
            cum_times2[i] = cum_times2[i - 1] + (seg / avg2 if avg2 > 0 else 0)

        # ...scaled to the official lap times, so the delta ends on the real gap
        actual_lap_time1 = lap1_meta.get("lap_time")
        actual_lap_time2 = lap2_meta.get("lap_time")
        if actual_lap_time1 and cum_times1[-1] > 0:
            scale1 = actual_lap_time1 / cum_times1[-1]
            cum_times1 = [t * scale1 for t in cum_times1]
        if actual_lap_time2 and cum_times2[-1] > 0:
            scale2 = actual_lap_time2 / cum_times2[-1]
            cum_times2 = [t * scale2 for t in cum_times2]

        telemetry_data = []
        for i, dist in enumerate(common_distance):
            telemetry_data.append({
                "distance":  float(dist),
                "speed1":    speeds1[i],
                "speed2":    speeds2[i],
                "throttle1": float(interp_throttle1(dist)),
                "throttle2": float(interp_throttle2(dist)),
                "brake1":    bool(interp_brake1(dist)),
                "brake2":    bool(interp_brake2(dist)),
                "gear1":     int(interp_gear1(dist)),
                "gear2":     int(interp_gear2(dist)),
                "drs1":      int(v) if not math.isnan(v := float(interp_drs1(dist))) else 0,
                "drs2":      int(v) if not math.isnan(v := float(interp_drs2(dist))) else 0,
                "x":         float(interp_x1(dist)),
                "y":         float(interp_y1(dist)),
                "delta":     float(cum_times2[i] - cum_times1[i]),
                "rpm1":      float(interp_rpm1(dist)),
                "rpm2":      float(interp_rpm2(dist)),
            })

        return {
            "telemetry":  telemetry_data,
            "lapTime1":   lap1_meta.get("lap_time"),
            "lapTime2":   lap2_meta.get("lap_time"),
            "sectors1":   {"sector1": lap1_meta.get("sector1_time"), "sector2": lap1_meta.get("sector2_time"), "sector3": lap1_meta.get("sector3_time")},
            "sectors2":   {"sector1": lap2_meta.get("sector1_time"), "sector2": lap2_meta.get("sector2_time"), "sector3": lap2_meta.get("sector3_time")},
            "driver1":    driver1,
            "driver2":    driver2,
            "lapNumber1": actual_lap1,
            "lapNumber2": actual_lap2,
            "source":     "postgresql",
        }
    except Exception as e:
        logger.warning(f"PostgreSQL telemetry lookup failed: {e}", exc_info=True)
        return None


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
