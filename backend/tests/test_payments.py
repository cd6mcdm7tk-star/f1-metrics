import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.routes import payments


class FakeTable:
    """Supabase's query builder over a list of rows, enough for the payments routes."""

    def __init__(self, rows=None, fail=False):
        self.rows = rows if rows is not None else []
        self.fail = fail
        self._query = None

    def select(self, _columns):
        self._query = ("select", None)
        return self

    def insert(self, row):
        self._query = ("insert", row)
        return self

    def update(self, changes):
        self._query = ("update", changes)
        return self

    def eq(self, column, value):
        self._filter = (column, value)
        return self

    def execute(self):
        if self.fail:
            raise RuntimeError("Supabase is down")
        kind, data = self._query
        if kind == "insert":
            self.rows.append(dict(data))
            return type("Result", (), {"data": [data]})
        column, value = self._filter
        matched = [r for r in self.rows if r.get(column) == value]
        if kind == "update":
            for r in matched:
                r.update(data)
        return type("Result", (), {"data": matched})


def checkout_completed(subscription_id="sub_1", plan_type="monthly"):
    return {"id": "cs_1", "client_reference_id": "user-1", "customer": "cus_1",
            "subscription": subscription_id, "metadata": {"plan_type": plan_type}}


def subscription(status, interval="month"):
    return {"id": "sub_1", "status": status, "items": {"data": [{"price": {"recurring": {"interval": interval}}}]}}


def test_a_subscription_keeps_one_row_when_stripe_sends_its_event_twice():
    table = FakeTable()
    payments.record_event(table, "checkout.session.completed", checkout_completed())
    payments.record_event(table, "checkout.session.completed", checkout_completed())
    assert len(table.rows) == 1
    assert table.rows[0] == {"user_id": "user-1", "stripe_customer_id": "cus_1", "stripe_subscription_id": "sub_1",
                             "status": "active", "plan": "metrik_pro_monthly"}


def test_subscribing_again_adds_a_row_beside_the_old_one():
    table = FakeTable([{"user_id": "user-1", "stripe_subscription_id": "sub_0", "status": "cancelled"}])
    payments.record_event(table, "checkout.session.completed", checkout_completed("sub_1"))
    assert [r["status"] for r in table.rows] == ["cancelled", "active"]


def test_updates_follow_the_status_and_a_plan_switch():
    table = FakeTable()
    payments.record_event(table, "checkout.session.completed", checkout_completed())
    payments.record_event(table, "customer.subscription.updated", subscription("past_due"))
    assert table.rows[0]["status"] == "past_due"
    payments.record_event(table, "customer.subscription.updated", subscription("active", "year"))
    assert (table.rows[0]["status"], table.rows[0]["plan"]) == ("active", "metrik_pro_annual")
    payments.record_event(table, "customer.subscription.deleted", {"id": "sub_1"})
    assert table.rows[0]["status"] == "cancelled"


def test_the_portal_opens_the_current_subscription_customer():
    rows = [{"stripe_customer_id": "cus_new", "status": "cancelled"}, {"stripe_customer_id": "cus_old", "status": "active"}]
    assert payments.portal_customer(rows) == "cus_old"
    assert payments.portal_customer([{"stripe_customer_id": "cus_2", "status": "cancelled"},
                                     {"stripe_customer_id": "cus_1", "status": "cancelled"}]) == "cus_2"
    assert payments.portal_customer([]) is None


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(payments.router)
    return TestClient(app)


# As long as Supabase's own: PyJWT warns about HMAC keys under 32 bytes
TEST_SECRET = "a-test-secret-as-long-as-supabase-ones"


def token(user_id: str, secret: str, email: str | None = None) -> str:
    claims = {"sub": user_id, "aud": "authenticated", **({"email": email} if email else {})}
    return jwt.encode(claims, secret, algorithm="HS256")


@pytest.fixture
def not_subscribed(monkeypatch):
    monkeypatch.setattr(payments, "has_subscription", lambda _user_id: False)


def test_checkout_needs_a_signed_in_user_and_uses_theirs(client, monkeypatch, not_subscribed):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(payments, "PLANS", {"monthly": ("metrik_pro_monthly", "price_m"), "annual": ("metrik_pro_annual", "price_a")})
    created = {}

    def fake_create(**kwargs):
        created.update(kwargs)
        return type("Session", (), {"id": "cs_1", "url": "https://checkout.stripe.com/c/cs_1"})

    monkeypatch.setattr(payments.stripe.checkout.Session, "create", fake_create)

    body = {"user_id": "victim", "plan_type": "monthly", "withdrawal_waiver": True}
    assert client.post("/api/create-checkout-session", json=body).status_code in (401, 403)

    response = client.post(
        "/api/create-checkout-session", json=body,
        headers={"Authorization": f"Bearer {token('user-1', TEST_SECRET)}"},
    )
    assert response.status_code == 200
    assert created["client_reference_id"] == "user-1"
    assert created["line_items"] == [{"price": "price_m", "quantity": 1}]


def test_checkout_records_the_withdrawal_waiver_and_needs_it(client, monkeypatch, not_subscribed):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(payments, "PLANS", {"monthly": ("metrik_pro_monthly", "price_m"), "annual": ("metrik_pro_annual", "price_a")})
    created = {}
    monkeypatch.setattr(payments.stripe.checkout.Session, "create",
                        lambda **kwargs: created.update(kwargs) or type("Session", (), {"id": "cs_1", "url": "https://checkout.stripe.com"}))
    headers = {"Authorization": f"Bearer {token('user-1', TEST_SECRET)}"}

    assert client.post("/api/create-checkout-session", json={"plan_type": "annual"}, headers=headers).status_code == 400
    assert not created

    assert client.post("/api/create-checkout-session", json={"plan_type": "annual", "withdrawal_waiver": True}, headers=headers).status_code == 200
    assert created["metadata"]["withdrawal_waiver"] == "accepted"
    assert created["subscription_data"]["metadata"]["withdrawal_waiver_at"] == created["metadata"]["withdrawal_waiver_at"]
    assert "right of withdrawal" in created["custom_text"]["submit"]["message"]


def test_checkout_starts_with_the_users_address_and_never_charges_a_subscriber_twice(client, monkeypatch):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setattr(payments, "PLANS", {"monthly": ("metrik_pro_monthly", "price_m"), "annual": ("metrik_pro_annual", "price_a")})
    created = {}
    monkeypatch.setattr(payments.stripe.checkout.Session, "create",
                        lambda **kwargs: created.update(kwargs) or type("Session", (), {"id": "cs_1", "url": "https://checkout.stripe.com"}))
    subscribers = {"user-2"}
    monkeypatch.setattr(payments, "has_subscription", lambda user_id: user_id in subscribers)
    body = {"plan_type": "annual", "withdrawal_waiver": True}

    headers = {"Authorization": f"Bearer {token('user-1', TEST_SECRET, 'fan@example.com')}"}
    assert client.post("/api/create-checkout-session", json=body, headers=headers).status_code == 200
    assert created["customer_email"] == "fan@example.com"

    created.clear()
    headers = {"Authorization": f"Bearer {token('user-2', TEST_SECRET, 'pro@example.com')}"}
    assert client.post("/api/create-checkout-session", json=body, headers=headers).status_code == 409
    assert not created


def test_an_event_that_cannot_be_recorded_is_sent_again(client, monkeypatch):
    event = {"type": "customer.subscription.deleted", "data": {"object": {"id": "sub_1"}}}
    monkeypatch.setattr(payments.stripe.Webhook, "construct_event", lambda *args: event)
    monkeypatch.setattr(payments, "subscriptions", lambda: FakeTable(fail=True))
    assert client.post("/api/webhook", content=b"{}", headers={"stripe-signature": "t=1"}).status_code == 500

    monkeypatch.setattr(payments, "subscriptions", lambda: FakeTable())
    assert client.post("/api/webhook", content=b"{}", headers={"stripe-signature": "t=1"}).status_code == 200
