"""The season's Grands Prix, from FastF1's event schedule (testing excluded)."""
import asyncio

import fastf1

from app.cache import redis_cache


def _fetch_grands_prix(year: int) -> list[dict]:
    schedule = fastf1.get_event_schedule(year)
    grands_prix = []
    for _, event in schedule.iterrows():
        if event.get("EventFormat", "") == "testing":
            continue
        grands_prix.append({
            "round": int(event["RoundNumber"]),
            "country": event["Country"],
            "location": event["Location"],
            "name": event["Location"],
            "official_name": event["OfficialEventName"],
            "date": event["EventDate"].strftime("%Y-%m-%d"),
            "is_sprint": event.get("EventFormat", "conventional") != "conventional",
        })
    return grands_prix


async def get_grands_prix(year: int) -> list[dict]:
    cache_key = f"grands_prix:{year}"
    cached = await redis_cache.aget(cache_key)
    if cached:
        return cached.get("grands_prix", [])
    grands_prix = await asyncio.to_thread(_fetch_grands_prix, year)
    redis_cache.set(cache_key, {"grands_prix": grands_prix}, ttl=86400)
    return grands_prix
