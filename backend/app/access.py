"""Who may see what. Past seasons are free; the current one is METRIK PRO: a
signed-in subscriber (a valid Supabase token and an active or trialing
subscription), or our own tools with the admin secret."""
import asyncio
import hmac
import logging
import os
import time
from datetime import datetime, timezone
from functools import cache

import jwt
from fastapi import HTTPException, Request
from supabase import Client, create_client

logger = logging.getLogger(__name__)

# The statuses that give PRO access, as the site reads them
CURRENT = ("active", "trialing")
# How long a subscriber, once found, is trusted before Supabase is asked again (s)
TRUSTED_FOR = 300

_trusted_until: dict[str, float] = {}


@cache
def _supabase() -> Client:
    """Supabase with the service key, which bypasses the table's row security."""
    return create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))


def subscriptions():
    return _supabase().table("subscriptions")


def current_season() -> int:
    return datetime.now(timezone.utc).year


def user_from_token(token: str) -> str:
    """The user id of a valid Supabase access token."""
    return token_claims(token)["sub"]


def token_claims(token: str) -> dict:
    """What a valid Supabase access token says: `sub` the user id, `email` their address."""
    try:
        return jwt.decode(token, os.getenv("SUPABASE_JWT_SECRET"), algorithms=["HS256"], audience="authenticated")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def is_admin(request: Request) -> bool:
    expected = os.getenv("ADMIN_SECRET", "")
    given = request.headers.get("X-Admin-Secret", "")
    # An unset secret must lock, not open to an empty header
    return bool(expected) and hmac.compare_digest(given, expected)


def has_subscription(user_id: str) -> bool:
    rows = subscriptions().select("status").eq("user_id", user_id).in_("status", list(CURRENT)).limit(1).execute().data
    return bool(rows)


async def check_season_access(request: Request, year: int) -> None:
    """Lets a request for `year` through, or refuses it: 401 without a valid
    sign-in, 403 without a subscription. A subscriber found is trusted for
    TRUSTED_FOR seconds; a refusal isn't remembered, so a new subscriber gets
    in as soon as their payment is recorded."""
    if year < current_season() or is_admin(request):
        return
    header = request.headers.get("Authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Sign in to see the current season")
    user_id = user_from_token(header[7:].strip())
    now = time.monotonic()
    if _trusted_until.get(user_id, 0) > now:
        return
    try:
        # Off the event loop: other visitors' requests don't wait on Supabase
        subscribed = await asyncio.to_thread(has_subscription, user_id)
    except Exception as e:
        logger.error(f"Subscription check failed: {e}")
        raise HTTPException(status_code=503, detail="Couldn't check the subscription, try again")
    if not subscribed:
        raise HTTPException(status_code=403, detail="The current season is part of METRIK PRO")
    if len(_trusted_until) > 10_000:
        for uid in [u for u, until in _trusted_until.items() if until <= now]:
            del _trusted_until[uid]
    _trusted_until[user_id] = now + TRUSTED_FOR


async def season_access(request: Request, year: int) -> None:
    """check_season_access as a dependency of the routes with a {year} in their path."""
    await check_season_access(request, year)
