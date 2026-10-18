import pandas as pd

from app.lap_samples import lap_samples
from jobs.ingest_session import _extract_lap_telemetry, _session_frame

START = pd.Timestamp("2026-10-03T08:58:39.243Z")


def car_rows(times: list[float], speed=lambda t: 360.0) -> pd.DataFrame:
    return pd.DataFrame({
        "date": [START + pd.Timedelta(seconds=t) for t in times],
        "speed": [speed(t) for t in times],
        "throttle": [100] * len(times),
        "brake": [0] * len(times),
        "n_gear": [8] * len(times),
        "drs": [0] * len(times),
        "rpm": [11000] * len(times),
    })


def test_distance_counts_from_the_line_when_the_car_data_starts_late():
    # 360 km/h is 100 m/s; the first sample comes a second after the line
    lap = lap_samples(car_rows([1.0 + 0.25 * i for i in range(30)]), None, START, 5.0)

    assert lap["distance"].iloc[0] == 0
    assert abs(lap["distance"].iloc[1] - 100) < 1e-6


def test_a_lap_is_cut_on_both_lines():
    lap = lap_samples(car_rows([-1.5 + 0.25 * i for i in range(40)]), None, START, 5.0)

    assert lap["date"].iloc[0] == START
    assert lap["date"].iloc[-1] == START + pd.Timedelta(seconds=5)
    assert abs(lap["distance"].iloc[-1] - 500) < 1e-6


def test_speed_is_integrated_with_the_trapezoid_rule():
    # From 0 to 72 km/h (20 m/s) in 10 s, evenly: 100 m
    lap = lap_samples(car_rows([i * 1.0 for i in range(11)], speed=lambda t: 7.2 * t), None, START, 10.0)

    assert abs(lap["distance"].iloc[-1] - 100) < 1e-6


def test_positions_are_interpolated_in_time():
    car = car_rows([0.0, 0.5, 1.0])
    loc = pd.DataFrame({"date": [START, START + pd.Timedelta(seconds=1)], "x": [0.0, 1000.0], "y": [0.0, -500.0]})

    lap = lap_samples(car, loc, START, 1.0)

    assert lap["x"].tolist() == [0.0, 500.0, 1000.0]
    assert lap["y"].tolist() == [0.0, -250.0, -500.0]


def test_ingested_lap_is_as_long_as_its_speed_covers_not_its_gps_steps():
    stamps = [(START + pd.Timedelta(seconds=0.2 * i)).isoformat() for i in range(111)]
    car = [{"date": d, "speed": 180, "rpm": 11000, "n_gear": 7, "throttle": 100, "brake": 0, "drs": 0} for d in stamps]
    # Positions in tenths of a metre, as OpenF1 gives them: 10 m a step in GPS units
    pos = [{"date": d, "x": i * 100.0, "y": 0.0} for i, d in enumerate(stamps)]

    tel = _extract_lap_telemetry(_session_frame(car), _session_frame(pos), START.isoformat(), 20.0)

    # 180 km/h for 20 s is 1000 m, not the 10 km the GPS steps add up to
    assert abs(tel["distance"][-1] - 1000) < 1e-6
    assert tel["x"][-1] == 10000.0
    assert tel["brake"][0] is False and tel["gear"][0] == 7


def test_a_lap_without_enough_car_data_is_skipped():
    car = _session_frame([{"date": START.isoformat(), "speed": 200}])

    assert _extract_lap_telemetry(car, _session_frame([]), START.isoformat(), 90.0) is None
