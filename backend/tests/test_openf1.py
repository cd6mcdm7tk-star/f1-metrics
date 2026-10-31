from datetime import datetime, timezone

from app.openf1 import is_settled

NOW = datetime(2026, 10, 31, 23, 0, tzinfo=timezone.utc)


def test_a_session_is_final_an_hour_after_its_end():
    assert is_settled({"date_end": "2026-10-31T21:00:00+00:00"}, NOW)


def test_a_session_still_running_or_just_over_is_not():
    assert not is_settled({"date_end": "2026-10-31T22:30:00+00:00"}, NOW)
    assert not is_settled({"date_end": "2026-11-01T21:00:00+00:00"}, NOW)
    assert not is_settled({}, NOW)
