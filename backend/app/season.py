"""Everything the Statistics page needs for one season, from Jolpica (Ergast).

Built once per season and shared through Redis: the page computes every
head-to-head locally from it, instead of each visitor calling Jolpica and
hitting its rate limit on their own."""
import asyncio
import datetime
import json
import logging

import httpx
from fastapi import HTTPException

from app.cache import redis_cache

logger = logging.getLogger(__name__)

JOLPICA_BASE = "https://api.jolpi.ca/ergast/f1"
# Jolpica allows a ~4 req/s burst (500/h sustained) per client IP, and every
# request from this server shares that budget.
_JOLPICA_MIN_INTERVAL = 0.3
_jolpica_slot_lock = asyncio.Lock()
_jolpica_next_slot = 0.0
_season_build_locks: dict[int, asyncio.Lock] = {}


async def _jolpica_get(client: httpx.AsyncClient, path: str, params: dict | None = None) -> dict:
    global _jolpica_next_slot
    loop = asyncio.get_running_loop()
    for attempt in range(5):
        async with _jolpica_slot_lock:
            now = loop.time()
            wait = _jolpica_next_slot - now
            _jolpica_next_slot = max(now, _jolpica_next_slot) + _JOLPICA_MIN_INTERVAL
        if wait > 0:
            await asyncio.sleep(wait)
        resp = await client.get(f"{JOLPICA_BASE}/{path}", params=params, timeout=20)
        if resp.status_code == 429:
            await asyncio.sleep(min(2 * 2 ** attempt, 16))
            continue
        resp.raise_for_status()
        return resp.json()["MRData"]
    raise HTTPException(status_code=503, detail="Jolpica rate limit — try again shortly")


def _slim_driver(d: dict) -> dict:
    return {k: d[k] for k in ("driverId", "code", "givenName", "familyName", "permanentNumber") if k in d}


def _slim_result(r: dict) -> dict:
    """A classification entry reduced to the fields the page reads, under
    Jolpica's own key names."""
    out = {"position": r.get("position"), "Driver": _slim_driver(r["Driver"])}
    for k in ("points", "grid", "status"):
        if k in r:
            out[k] = r[k]
    if "Constructor" in r:
        out["Constructor"] = {"name": r["Constructor"]["name"]}
    if (r.get("FastestLap") or {}).get("rank"):
        out["FastestLap"] = {"rank": r["FastestLap"]["rank"]}
    return out


async def _jolpica_all_races(client: httpx.AsyncClient, path: str, key: str) -> list[dict]:
    """Every race of a season-wide endpoint with its full classification under
    `key`. Pages are capped at 100 entries whatever `limit` says, so the first
    page gives the total, the rest come in parallel, and entries are merged by
    round (one race can straddle two pages)."""
    first = await _jolpica_get(client, path, {"limit": 100, "offset": 0})
    total = int(first.get("total", 0))
    rest = await asyncio.gather(*[
        _jolpica_get(client, path, {"limit": 100, "offset": off}) for off in range(100, total, 100)
    ])
    by_round: dict[int, dict] = {}
    for page in [first, *rest]:
        for race in page["RaceTable"]["Races"]:
            entry = by_round.setdefault(int(race["round"]), {"round": race["round"], "raceName": race["raceName"], key: []})
            entry[key].extend(_slim_result(r) for r in race.get(key, []))
    return [by_round[r] for r in sorted(by_round)]


async def _build_season_bundle(year: int) -> dict:
    async with httpx.AsyncClient() as client:
        results, qualifying, sprints, driver_st, constructor_st = await asyncio.gather(
            _jolpica_all_races(client, f"{year}/results.json", "Results"),
            _jolpica_all_races(client, f"{year}/qualifying.json", "QualifyingResults"),
            _jolpica_all_races(client, f"{year}/sprint.json", "SprintResults"),
            _jolpica_get(client, f"{year}/driverStandings.json"),
            _jolpica_get(client, f"{year}/constructorStandings.json"),
        )
    driver_lists = driver_st["StandingsTable"]["StandingsLists"]
    constructor_lists = constructor_st["StandingsTable"]["StandingsLists"]
    return {
        "year": year,
        "results": results,
        "qualifying": qualifying,
        "sprints": sprints,
        "driverStandings": [
            {
                "position": s.get("position"),
                "points": s.get("points"),
                "Driver": _slim_driver(s["Driver"]),
                "Constructors": [{"name": c["name"]} for c in s.get("Constructors", [])],
            }
            for s in (driver_lists[0]["DriverStandings"] if driver_lists else [])
        ],
        "constructorStandings": [
            {"position": s.get("position"), "points": s.get("points"), "Constructor": {"name": s["Constructor"]["name"]}}
            for s in (constructor_lists[0]["ConstructorStandings"] if constructor_lists else [])
        ],
    }


def season_is_closed(year: int) -> bool:
    return year < datetime.date.today().year


async def get_season_payload(year: int) -> str:
    """The season bundle as JSON text, from Redis or built and cached. One
    build at a time per season: concurrent requests wait for it."""
    cache_key = f"season:v1:{year}"
    cached = await redis_cache.aget_raw(cache_key)
    if cached:
        return cached
    lock = _season_build_locks.setdefault(year, asyncio.Lock())
    async with lock:
        cached = await redis_cache.aget_raw(cache_key)
        if cached:
            return cached
        bundle = await _build_season_bundle(year)
        payload = json.dumps(bundle, ensure_ascii=False, separators=(",", ":"))
        # A finished season only gets rare corrections; the current one changes every race weekend
        ttl = 7 * 86400 if season_is_closed(year) else 3600
        await asyncio.to_thread(redis_cache.set_raw, cache_key, payload, ttl)
        return payload


async def prewarm_seasons():
    """Builds last season (the default) and the current one at startup if
    they aren't cached, so no visitor waits on that first build."""
    this_year = datetime.date.today().year
    for year in (this_year - 1, this_year):
        try:
            await get_season_payload(year)
        except Exception as e:
            logger.warning(f"Season prewarm failed for {year}: {e}")
