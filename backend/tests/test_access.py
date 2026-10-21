import time

import jwt
import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app import access
from app.routes import laps, season, telemetry

SECRET = "a-test-secret-as-long-as-supabase-ones"
THIS_YEAR = access.current_season()


def token(user_id: str, secret: str = SECRET, expires_in: int = 3600) -> str:
    return jwt.encode({"sub": user_id, "aud": "authenticated", "exp": int(time.time()) + expires_in}, secret, algorithm="HS256")


def bearer(user_id: str, **kwargs) -> dict:
    return {"Authorization": f"Bearer {token(user_id, **kwargs)}"}


@pytest.fixture
def subscribers(monkeypatch):
    """The users with a subscription, and how many times Supabase was asked."""
    state = {"users": {"pro-user"}, "lookups": 0}

    def has_subscription(user_id):
        state["lookups"] += 1
        return user_id in state["users"]

    monkeypatch.setenv("SUPABASE_JWT_SECRET", SECRET)
    monkeypatch.setenv("ADMIN_SECRET", "admin-secret")
    monkeypatch.setattr(access, "has_subscription", has_subscription)
    monkeypatch.setattr(access, "_trusted_until", {})
    return state


@pytest.fixture
def client():
    app = FastAPI()

    @app.get("/data/{year}", dependencies=[Depends(access.season_access)])
    async def data(year: int):
        return {"year": year}

    return TestClient(app)


def test_past_seasons_are_free(client, subscribers):
    assert client.get(f"/data/{THIS_YEAR - 1}").status_code == 200
    assert subscribers["lookups"] == 0


def test_the_current_season_needs_a_valid_sign_in(client, subscribers):
    assert client.get(f"/data/{THIS_YEAR}").status_code == 401
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("pro-user", secret="x" * 40)).status_code == 401
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("pro-user", expires_in=-10)).status_code == 401
    assert client.get(f"/data/{THIS_YEAR + 1}").status_code == 401


def test_the_current_season_needs_a_subscription(client, subscribers):
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("free-user")).status_code == 403
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("pro-user")).json() == {"year": THIS_YEAR}


def test_a_subscriber_is_trusted_for_a_while_a_refusal_is_not_remembered(client, subscribers):
    for _ in range(3):
        client.get(f"/data/{THIS_YEAR}", headers=bearer("pro-user"))
    assert subscribers["lookups"] == 1

    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("new-user")).status_code == 403
    subscribers["users"].add("new-user")  # their payment is recorded
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("new-user")).status_code == 200


def test_our_own_tools_get_in_with_the_admin_secret(client, subscribers, monkeypatch):
    assert client.get(f"/data/{THIS_YEAR}", headers={"X-Admin-Secret": "admin-secret"}).status_code == 200
    assert client.get(f"/data/{THIS_YEAR}", headers={"X-Admin-Secret": "wrong"}).status_code == 401
    monkeypatch.setenv("ADMIN_SECRET", "")
    assert client.get(f"/data/{THIS_YEAR}", headers={"X-Admin-Secret": ""}).status_code == 401


def test_a_failed_check_refuses_rather_than_lets_through(client, subscribers, monkeypatch):
    def down(_user_id):
        raise RuntimeError("Supabase is down")

    monkeypatch.setattr(access, "has_subscription", down)
    assert client.get(f"/data/{THIS_YEAR}", headers=bearer("pro-user")).status_code == 503


def test_the_data_routes_check_before_anything_else(subscribers):
    app = FastAPI()
    for router in (laps.router, season.router, telemetry.router):
        app.include_router(router)
    api = TestClient(app)
    assert api.get(f"/api/session-laps/{THIS_YEAR}/1/Q/VER").status_code == 401
    assert api.get(f"/api/season/{THIS_YEAR}").status_code == 401
    lap = {"year": THIS_YEAR, "gp": 1, "session": "Q", "driver": "VER"}
    assert api.post("/api/telemetry/multi", json={"laps": [lap, {**lap, "driver": "LEC"}]}).status_code == 401
    assert api.get(f"/api/season/{THIS_YEAR}", headers=bearer("free-user")).status_code == 403
