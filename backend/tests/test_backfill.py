from datetime import datetime, timezone

from jobs.backfill_season import sessions_to_fill
from jobs.ingest_session import lap_query_window

NOW = datetime(2026, 10, 30, tzinfo=timezone.utc)


def session(meeting: int, name: str, date: str = "2024-03-02T15:00:00+00:00") -> dict:
    return {"meeting_key": meeting, "session_name": name, "date_start": date}


def test_only_the_sites_sessions_that_ran_and_are_not_stored():
    schedule = [
        session(1, "Practice 1"), session(1, "Qualifying"), session(1, "Race"),
        session(2, "Sprint Qualifying"), session(2, "Sprint"), session(2, "Qualifying"), session(2, "Race"),
        session(3, "Race", "2027-03-01T15:00:00+00:00"),
    ]
    assert sessions_to_fill(schedule, {(1, "Q")}, NOW) == [(1, "R"), (2, "SQ"), (2, "S"), (2, "Q"), (2, "R")]


def test_a_laps_window_reads_as_openf1_date_filters():
    begin, end = lap_query_window("2024-12-08T14:03:33.867000+00:00", 88.325)
    assert "+" not in begin and "+" not in end
    assert begin < "2024-12-08T14:03:33.867" < end
    assert end > "2024-12-08T14:05:02.192"
