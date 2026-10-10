import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import admin

URL = "/api/admin/ingestion-status?year=2025&round=1"


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(admin.router)
    return TestClient(app)


def test_locked_when_no_secret_is_configured(client, monkeypatch):
    monkeypatch.delenv("ADMIN_SECRET", raising=False)
    assert client.get(URL).status_code == 403
    assert client.get(URL, headers={"X-Admin-Secret": ""}).status_code == 403


def test_needs_the_right_secret(client, monkeypatch):
    monkeypatch.setenv("ADMIN_SECRET", "s3cret")
    assert client.get(URL, headers={"X-Admin-Secret": "nope"}).status_code == 403

    response = client.get(URL, headers={"X-Admin-Secret": "s3cret"})
    assert response.status_code == 200
    assert set(response.json()) == {"SQ", "S", "Q", "R"}
