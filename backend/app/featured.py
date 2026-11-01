"""The homepage's first card: the latest qualifying session whose results are
final, and its front row."""
import datetime

from app import openf1
from app.cache import redis_cache
from app.schedule import get_grands_prix

CACHE_KEY = "featured:latest_qualifying"
# A new pole shows within this long of its results being final (s)
TTL = 1800


def last_settled(sessions: list[dict], now: datetime.datetime) -> dict | None:
    """The latest Grand Prix session that ended long enough ago for its results to be final."""
    done = [
        s for s in sessions
        if not s.get("is_cancelled") and "test" not in s.get("meeting_name", "").lower() and openf1.is_settled(s, now)
    ]
    return max(done, key=lambda s: s["date_start"], default=None)


def front_row_gap(pole: dict, second: dict) -> float | None:
    """The gap between the first two in the last part of qualifying both drivers set a time in (s)."""
    times = [(a, b) for a, b in zip(pole.get("duration") or [], second.get("duration") or []) if a is not None and b is not None]
    return round(times[-1][1] - times[-1][0], 3) if times else None


def grand_prix_of(session: dict, grands_prix: list[dict]) -> dict | None:
    """The Grand Prix a qualifying session belongs to: the one whose race is up to two days later."""
    day = datetime.date.fromisoformat(session["date_start"][:10])
    return next((g for g in grands_prix if 0 <= (datetime.date.fromisoformat(g["date"]) - day).days <= 2), None)


async def latest_qualifying(now: datetime.datetime) -> dict | None:
    """{year, round, location, drivers: [{code, name}] × 2, gap}, or None before a season's first qualifying."""
    cached = await redis_cache.aget(CACHE_KEY)
    if cached:
        return cached

    session = None
    for year in (now.year, now.year - 1):
        session = last_settled(await openf1.request("sessions", {"year": year, "session_name": "Qualifying"}), now)
        if session:
            break
    if session is None:
        return None
    year = int(session["date_start"][:4])
    grand_prix = grand_prix_of(session, await get_grands_prix(year))

    key = session["session_key"]
    front_row = sorted(await openf1.request("session_result", {"session_key": key, "position<": 3}), key=lambda r: r["position"])
    names = {d["driver_number"]: d for d in await openf1.request("drivers", {"session_key": key})}
    if grand_prix is None or len(front_row) < 2 or any(r["driver_number"] not in names for r in front_row[:2]):
        return None

    result = {
        "year": year,
        "round": grand_prix["round"],
        "location": grand_prix["location"],
        "drivers": [{"code": names[r["driver_number"]]["name_acronym"], "name": names[r["driver_number"]]["last_name"]} for r in front_row[:2]],
        "gap": front_row_gap(front_row[0], front_row[1]),
    }
    redis_cache.set(CACHE_KEY, result, ttl=TTL)
    return result
