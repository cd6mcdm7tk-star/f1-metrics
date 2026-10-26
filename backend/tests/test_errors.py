import pytest
from fastf1.core import DataNotLoadedError

from app.errors import fastf1_http_error


@pytest.mark.parametrize("message, status", [
    ("Session type 'X' does not exist", 404),
    ("No data for this session", 404),
    ("Driver ABC not found", 404),
    ("Read timeout", 503),
    ("Something unexpected", 500),
])
def test_fastf1_errors_map_to_http_statuses(message, status):
    assert fastf1_http_error(Exception(message)).status_code == status


def test_unexpected_errors_keep_their_details():
    error = fastf1_http_error(ValueError("boom"), "2025 round 1 Q.")
    assert error.detail["technical_details"] == "boom"
    assert "2025 round 1 Q." in error.detail["message"]


def test_a_session_the_timing_archive_refused_is_unavailable_not_a_crash():
    error = fastf1_http_error(DataNotLoadedError("The data you are trying to access has not been loaded yet."))
    assert error.status_code == 503
    assert "requires an account" in error.detail["message"]
