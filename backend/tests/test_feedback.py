import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request

from app.limiter import client_ip, limiter
from app.routes import feedback
from database import db

URL = "/api/feedback"


@pytest.fixture
def client():
    app = FastAPI()
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
    app.include_router(feedback.router)
    limiter.reset()
    return TestClient(app)


@pytest.fixture
def saved(monkeypatch):
    """What the route stores"""
    rows = []
    monkeypatch.setattr(type(db), "available", property(lambda self: True))
    monkeypatch.setattr(db, "save_feedback", lambda *row: rows.append(row))
    return rows


def test_keeps_the_message_the_address_and_the_page(client, saved):
    response = client.post(URL, json={"message": "  T1 looks off  ", "email": "fan@example.com", "page": "/app?y=2026"})
    assert response.status_code == 204
    assert saved == [("T1 looks off", "fan@example.com", "/app?y=2026")]


def test_the_address_is_optional(client, saved):
    assert client.post(URL, json={"message": "Great site", "email": "  "}).status_code == 204
    assert saved == [("Great site", None, None)]


def test_turns_down_an_empty_message_or_a_wrong_address(client, saved):
    assert client.post(URL, json={"message": "  "}).status_code == 422
    assert client.post(URL, json={"message": "Hello there", "email": "not an address"}).status_code == 422
    assert saved == []


def test_drops_what_a_bot_sends_without_telling_it(client, saved):
    assert client.post(URL, json={"message": "Buy now", "website": "spam.example"}).status_code == 204
    assert saved == []


def test_says_so_when_it_cannot_keep_it(client, monkeypatch):
    monkeypatch.setattr(type(db), "available", property(lambda self: False))
    assert client.post(URL, json={"message": "Hello there"}).status_code == 503


def test_five_messages_an_hour_from_one_visitor(client, saved):
    for _ in range(5):
        assert client.post(URL, json={"message": "Hello there"}).status_code == 204
    assert client.post(URL, json={"message": "Hello there"}).status_code == 429
    # Another visitor, behind the same proxy, still gets through
    assert client.post(URL, json={"message": "Hello there"}, headers={"X-Forwarded-For": "203.0.113.9"}).status_code == 204


def test_a_visitor_is_the_address_the_proxy_added_last():
    def request(forwarded: str | None) -> Request:
        headers = [(b"x-forwarded-for", forwarded.encode())] if forwarded else []
        return Request({"type": "http", "headers": headers, "client": ("10.0.0.1", 1234)})

    assert client_ip(request("198.51.100.7, 203.0.113.9")) == "203.0.113.9"
    assert client_ip(request(None)) == "10.0.0.1"
