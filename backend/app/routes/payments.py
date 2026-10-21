"""METRIK PRO subscriptions: Stripe Checkout, its webhook, and the customer portal.
Subscription state lives in Supabase's `subscriptions` table, a row per Stripe
subscription: a user who subscribes again gets a new row beside the old one."""
import logging
import os
from datetime import datetime, timezone
from functools import cache

import jwt
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
security = HTTPBearer()

SITE_URL = "https://metrikdelta.com"
PLANS = {
    "monthly": ("metrik_pro_monthly", os.getenv("STRIPE_PRICE_ID_MONTHLY")),
    "annual": ("metrik_pro_annual", os.getenv("STRIPE_PRICE_ID_ANNUAL")),
}
# A subscription's billing interval, back to its plan (a portal plan switch changes it)
PLAN_BY_INTERVAL = {"month": "metrik_pro_monthly", "year": "metrik_pro_annual"}
# The statuses that give PRO access, as the site reads them
CURRENT = ("active", "trialing")
# Shown above Stripe's pay button: PRO starts at once, so the subscriber gives up the
# 14-day withdrawal period (French Consumer Code, art. L221-28 13°), as they agreed on the site
WAIVER_NOTICE = (
    "You asked for METRIK PRO to start immediately: by paying, you acknowledge that you lose "
    "your 14-day right of withdrawal (French Consumer Code, art. L221-28 13°). You can cancel "
    "any time; PRO stays until the end of the period paid for."
)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")


@cache
def _supabase() -> Client:
    """Supabase with the service key, which bypasses the table's row security."""
    return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


def subscriptions():
    return _supabase().table("subscriptions")


def get_authenticated_user_id(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """The user id from a valid Supabase access token."""
    try:
        payload = jwt.decode(credentials.credentials, SUPABASE_JWT_SECRET, algorithms=["HS256"], audience="authenticated")
        return payload["sub"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@router.post("/create-checkout-session")
async def create_checkout_session(request: Request, user_id: str = Depends(get_authenticated_user_id)):
    """Stripe Checkout for the signed-in user: the token says who subscribes, not the
    request. The user must have waived their withdrawal period on the site."""
    body = await request.json()
    plan_type = body.get("plan_type", "annual")
    if body.get("withdrawal_waiver") is not True:
        raise HTTPException(status_code=400, detail="The immediate start and the withdrawal waiver must be accepted")
    if plan_type not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan_type. Use 'monthly' or 'annual'")
    plan_name, price_id = PLANS[plan_type]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"STRIPE_PRICE_ID_{plan_type.upper()} not configured")

    # Kept on the session and on the subscription: the record of the waiver and when it was given
    metadata = {
        "user_id": user_id,
        "plan_type": plan_type,
        "withdrawal_waiver": "accepted",
        "withdrawal_waiver_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{SITE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{SITE_URL}/cancel",
            client_reference_id=user_id,
            metadata=metadata,
            subscription_data={"metadata": metadata},
            custom_text={"submit": {"message": WAIVER_NOTICE}},
        )
    except Exception as e:
        logger.error(f"Checkout session creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    logger.info(f"Checkout session {checkout_session.id} created for {user_id} ({plan_name})")
    return JSONResponse(content={"checkout_url": checkout_session.url, "session_id": checkout_session.id})


def subscription_plan(subscription) -> str | None:
    """The plan a Stripe subscription is on, from its price's billing interval."""
    try:
        return PLAN_BY_INTERVAL.get(subscription["items"]["data"][0]["price"]["recurring"]["interval"])
    except (KeyError, IndexError, TypeError):
        return None


def record_event(table, event_type: str, obj) -> None:
    """A Stripe event applied to the subscriptions table."""
    if event_type == "checkout.session.completed":
        user_id, subscription_id = obj.get("client_reference_id"), obj.get("subscription")
        if not user_id or not subscription_id:
            logger.warning(f"Checkout session {obj.get('id')} has no user or subscription")
            return
        plan_type = (obj.get("metadata") or {}).get("plan_type")
        row = {
            "user_id": user_id,
            "stripe_customer_id": obj.get("customer"),
            "stripe_subscription_id": subscription_id,
            "status": "active",
            "plan": PLANS[plan_type][0] if plan_type in PLANS else "metrik_pro",
        }
        # Stripe can send an event more than once: the subscription keeps its one row
        if table.select("id").eq("stripe_subscription_id", subscription_id).execute().data:
            table.update(row).eq("stripe_subscription_id", subscription_id).execute()
        else:
            table.insert(row).execute()
        logger.info(f"Subscription {subscription_id} activated for {user_id}")

    elif event_type == "customer.subscription.updated":
        # Renewals, failed payments (past_due, unpaid), plan switches in the portal
        changes = {"status": obj["status"]}
        plan = subscription_plan(obj)
        if plan:
            changes["plan"] = plan
        table.update(changes).eq("stripe_subscription_id", obj["id"]).execute()
        logger.info(f"Subscription {obj['id']} is now {obj['status']}")

    elif event_type == "customer.subscription.deleted":
        table.update({"status": "cancelled"}).eq("stripe_subscription_id", obj["id"]).execute()
        logger.info(f"Subscription {obj['id']} cancelled")


@router.post("/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, STRIPE_WEBHOOK_SECRET)
    except ValueError as e:
        logger.error(f"Invalid webhook payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid webhook signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    logger.info(f"Stripe webhook: {event['type']}")
    try:
        record_event(subscriptions(), event["type"], event["data"]["object"])
    except Exception as e:
        logger.error(f"Supabase update failed for {event['type']}: {e}")
        # Not acknowledged, so Stripe sends the event again later
        raise HTTPException(status_code=500, detail="Subscription update failed")
    return JSONResponse(content={"status": "success"})


def portal_customer(rows: list[dict]) -> str | None:
    """The Stripe customer to manage, from the user's rows newest first: the
    current subscription's, else the latest one's."""
    current = [r for r in rows if r.get("status") in CURRENT] or rows
    return next((r["stripe_customer_id"] for r in current if r.get("stripe_customer_id")), None)


@router.get("/customer-portal/{user_id}")
async def create_customer_portal_session(user_id: str, token_user_id: str = Depends(get_authenticated_user_id)):
    """Stripe's customer portal: cancel, change card, download invoices."""
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    try:
        rows = subscriptions().select("stripe_customer_id, status").eq("user_id", user_id) \
            .order("created_at", desc=True).execute().data
        customer_id = portal_customer(rows)
        if not customer_id:
            raise HTTPException(status_code=404, detail="No subscription found")
        portal_session = stripe.billing_portal.Session.create(customer=customer_id, return_url=f"{SITE_URL}/app")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Customer portal session failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"portal_url": portal_session.url})
