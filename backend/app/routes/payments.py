"""METRIK PRO subscriptions: Stripe Checkout, its webhook, and the customer portal.
Subscription state lives in Supabase's `subscriptions` table."""
import logging
import os

import jwt
import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import create_client

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
security = HTTPBearer()

SITE_URL = "https://metrikdelta.com"
PLANS = {
    "monthly": ("metrik_pro_monthly", os.getenv("STRIPE_PRICE_ID_MONTHLY")),
    "annual": ("metrik_pro_annual", os.getenv("STRIPE_PRICE_ID_ANNUAL")),
}

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
supabase = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


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
async def create_checkout_session(request: Request):
    body = await request.json()
    user_id = body.get("user_id")
    plan_type = body.get("plan_type", "annual")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id required")
    if plan_type not in PLANS:
        raise HTTPException(status_code=400, detail="Invalid plan_type. Use 'monthly' or 'annual'")
    plan_name, price_id = PLANS[plan_type]
    if not price_id:
        raise HTTPException(status_code=500, detail=f"STRIPE_PRICE_ID_{plan_type.upper()} not configured")

    try:
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{"price": price_id, "quantity": 1}],
            mode="subscription",
            success_url=f"{SITE_URL}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{SITE_URL}/cancel",
            client_reference_id=user_id,
            metadata={"user_id": user_id, "plan_type": plan_type},
        )
    except Exception as e:
        logger.error(f"Checkout session creation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    logger.info(f"Checkout session {checkout_session.id} created for {user_id} ({plan_name})")
    return JSONResponse(content={"checkout_url": checkout_session.url, "session_id": checkout_session.id})


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

    event_type = event["type"]
    obj = event["data"]["object"]
    logger.info(f"Stripe webhook: {event_type}")

    try:
        if event_type == "checkout.session.completed":
            user_id = obj.get("client_reference_id")
            if not user_id:
                logger.warning(f"Checkout session {obj.get('id')} has no user id")
            else:
                plan_type = obj.get("metadata", {}).get("plan_type")
                supabase.table("subscriptions").upsert({
                    "user_id": user_id,
                    "stripe_customer_id": obj.get("customer"),
                    "stripe_subscription_id": obj.get("subscription"),
                    "status": "active",
                    "plan": PLANS[plan_type][0] if plan_type in PLANS else "metrik_pro",
                }).execute()
                logger.info(f"Subscription activated for {user_id}")

        elif event_type == "customer.subscription.updated":
            # Renewals, card changes, failed payments (past_due), etc.
            supabase.table("subscriptions").update({"status": obj["status"]}) \
                .eq("stripe_subscription_id", obj["id"]).execute()
            logger.info(f"Subscription {obj['id']} is now {obj['status']}")

        elif event_type == "customer.subscription.deleted":
            supabase.table("subscriptions").update({"status": "cancelled"}) \
                .eq("stripe_subscription_id", obj["id"]).execute()
            logger.info(f"Subscription {obj['id']} cancelled")
    except Exception as e:
        logger.error(f"Supabase update failed for {event_type}: {e}")

    return JSONResponse(content={"status": "success"})


@router.get("/customer-portal/{user_id}")
async def create_customer_portal_session(user_id: str, token_user_id: str = Depends(get_authenticated_user_id)):
    """Stripe's customer portal: cancel, change card, download invoices."""
    if token_user_id != user_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    try:
        result = supabase.table("subscriptions").select("stripe_customer_id").eq("user_id", user_id).execute()
        customer_id = result.data[0].get("stripe_customer_id") if result.data else None
        if not customer_id:
            raise HTTPException(status_code=404, detail="No subscription found")
        portal_session = stripe.billing_portal.Session.create(customer=customer_id, return_url=f"{SITE_URL}/app")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Customer portal session failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    return JSONResponse(content={"portal_url": portal_session.url})
