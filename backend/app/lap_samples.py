"""One lap's telemetry out of OpenF1's session-long streams. Car data and
positions come about four times a second, and a lap's first car sample can
come a second after the line: the lap is cut from line to line and its
distance counted from the line, not from its first sample."""
import numpy as np
import pandas as pd

# Samples kept either side of a lap, so both of its ends fall between real samples (s)
MARGIN = 2.0

# Channels that change smoothly are interpolated at the lines; the others hold their last value
SMOOTH = ("speed", "throttle", "rpm")
STEPPED = ("brake", "n_gear", "drs")


def lap_window(start: pd.Timestamp, duration: float) -> tuple[pd.Timestamp, pd.Timestamp]:
    """The time range to read a lap from: the lap and a margin either side."""
    return start - pd.Timedelta(seconds=MARGIN), start + pd.Timedelta(seconds=duration + MARGIN)


def lap_samples(car: pd.DataFrame, loc: pd.DataFrame | None, start: pd.Timestamp, duration: float) -> pd.DataFrame:
    """The lap's car samples from line to line, with a row on each line.

    `car` holds OpenF1 car_data rows (date, speed, throttle, brake, n_gear,
    drs, rpm) around the lap, `loc` its location rows (date, x, y). The
    distance is speed integrated over time with the trapezoid rule, counted
    from the start line; x and y are interpolated in time onto each sample."""
    car = car.sort_values("date").reset_index(drop=True)
    t = (car["date"] - start).dt.total_seconds().to_numpy()
    channels = {
        name: pd.to_numeric(car[name], errors="coerce").fillna(0).to_numpy(dtype=float) if name in car else np.zeros(len(car))
        for name in SMOOTH + STEPPED
    }
    speed = channels["speed"] / 3.6
    travelled = np.concatenate([[0.0], np.cumsum(np.diff(t) * (speed[1:] + speed[:-1]) / 2)])

    def distance_at(time: float) -> float:
        # Past the data, the car carries on at its first or last sample's speed
        if time <= t[0]:
            return travelled[0] - (t[0] - time) * speed[0]
        if time >= t[-1]:
            return travelled[-1] + (time - t[-1]) * speed[-1]
        return float(np.interp(time, t, travelled))

    def row_at(time: float) -> dict:
        last = max(int(np.searchsorted(t, time, side="right")) - 1, 0)
        row = {name: float(np.interp(time, t, channels[name])) for name in SMOOTH}
        row.update({name: channels[name][last] for name in STEPPED})
        return {**row, "t": time, "distance": distance_at(time)}

    inside = (t > 0) & (t < duration)
    rows = [row_at(0.0)]
    rows += [{**{name: channels[name][i] for name in SMOOTH + STEPPED}, "t": t[i], "distance": travelled[i]} for i in np.flatnonzero(inside)]
    rows.append(row_at(duration))
    lap = pd.DataFrame(rows)
    lap["distance"] -= distance_at(0.0)

    if loc is not None and not loc.empty:
        loc = loc.sort_values("date")
        t_loc = (loc["date"] - start).dt.total_seconds().to_numpy()
        lap["x"] = np.interp(lap["t"], t_loc, pd.to_numeric(loc["x"], errors="coerce").fillna(0).to_numpy(dtype=float))
        lap["y"] = np.interp(lap["t"], t_loc, pd.to_numeric(loc["y"], errors="coerce").fillna(0).to_numpy(dtype=float))
    else:
        lap["x"] = 0.0
        lap["y"] = 0.0

    lap["date"] = start + pd.to_timedelta(lap["t"], unit="s")
    return lap.drop(columns="t")
