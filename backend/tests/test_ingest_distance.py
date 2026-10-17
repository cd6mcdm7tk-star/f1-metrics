from datetime import datetime, timedelta, timezone

from jobs.ingest_session import _build_telemetry_from_raw, _distance_from_speed

START = datetime(2026, 10, 10, 13, 0, tzinfo=timezone.utc)


def stamps(count: int, step: float) -> list[str]:
    return [(START + timedelta(seconds=i * step)).isoformat() for i in range(count)]


def test_distance_is_speed_integrated_over_time():
    # 360 km/h is 100 m/s: 10 steps of 0.1 s cover 100 m
    dist = _distance_from_speed(stamps(11, 0.1), [360] * 11)
    assert dist[0] == 0
    assert abs(dist[-1] - 100) < 1e-6


def test_a_lap_is_as_long_as_its_speed_covers_not_its_gps_steps():
    car = [{"date": d, "speed": 180, "rpm": 11000, "n_gear": 7, "throttle": 100, "brake": 0, "drs": 0} for d in stamps(101, 0.2)]
    # Positions in tenths of a metre, as OpenF1 gives them: 10 m a step in GPS units
    pos = [{"date": d, "x": i * 100.0, "y": 0.0} for i, d in enumerate(stamps(101, 0.2))]
    tel = _build_telemetry_from_raw(car, pos)
    # 180 km/h for 20 s is 1000 m, not the 10 km the GPS steps add up to
    assert abs(tel["distance"][-1] - 1000) < 1e-6
    assert tel["x"][-1] == 10000.0
