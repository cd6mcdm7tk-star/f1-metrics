from datetime import datetime, timezone

from app.featured import front_row_gap, grand_prix_of, last_settled

NOW = datetime(2026, 11, 1, 13, 0, tzinfo=timezone.utc)


def session(start: str, end: str, **extra) -> dict:
    return {"date_start": start, "date_end": end, "meeting_name": "Mexico City Grand Prix", **extra}


def test_the_latest_qualifying_whose_results_are_final():
    sessions = [
        session("2026-10-24T21:00:00+00:00", "2026-10-24T22:00:00+00:00", session_key=1),
        session("2026-10-31T21:00:00+00:00", "2026-10-31T22:00:00+00:00", session_key=2),
        session("2026-11-01T12:30:00+00:00", "2026-11-01T12:45:00+00:00", session_key=3),  # just over
        session("2026-03-01T12:00:00+00:00", "2026-03-01T13:00:00+00:00", session_key=4, meeting_name="Pre-Season Testing"),
        session("2026-04-11T15:00:00+00:00", "2026-04-11T16:00:00+00:00", session_key=5, is_cancelled=True),
    ]
    assert last_settled(sessions, NOW)["session_key"] == 2


def test_none_before_the_first_qualifying():
    assert last_settled([], NOW) is None


def test_the_gap_comes_from_the_last_part_both_ran():
    pole = {"duration": [77.341, 76.953, 76.514]}
    assert front_row_gap(pole, {"duration": [77.659, 77.027, 76.523]}) == 0.009
    # A part one of them has no time in is skipped
    assert front_row_gap(pole, {"duration": [77.5, 77.0, None]}) == 0.047
    assert front_row_gap(pole, {"duration": []}) is None


def test_a_qualifying_belongs_to_the_race_up_to_two_days_later():
    grands_prix = [{"round": 18, "date": "2026-10-25"}, {"round": 19, "date": "2026-11-01"}]
    assert grand_prix_of({"date_start": "2026-10-31T21:00:00+00:00"}, grands_prix)["round"] == 19
    assert grand_prix_of({"date_start": "2026-10-20T21:00:00+00:00"}, grands_prix) is None
