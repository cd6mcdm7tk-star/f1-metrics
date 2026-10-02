from fastapi import FastAPI, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, List
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.utils.services.redis_cache import redis_cache
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import asyncio
import datetime
import logging
import math
import traceback

logger = logging.getLogger(__name__)
import fastf1
import pandas as pd
import numpy as np
from scipy.interpolate import interp1d
import httpx
import requests
from app.utils.cache import cache as api_cache
from app.utils.error_handler import handle_fastf1_error, log_request, log_success, log_error
from stripe_routes import router as stripe_router
from routes.livetiming import router as livetiming_router
from database import db

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

# Créer l'app FastAPI
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=1000)

# Configuration CORS - LOCAL + PRODUCTION
ALLOWED_ORIGINS = [
    "http://localhost:5173",  # Local dev
    "http://localhost:3000",  # Alternative local
    "https://metrikdelta.com",  # Production
    "https://www.metrikdelta.com",  # Production with www
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,  # True maintenant qu'on a des origins spécifiques
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Stripe router
app.include_router(stripe_router, prefix="/api", tags=["stripe"])

# Include Live Timing router (F1 proxy)
app.include_router(livetiming_router)

# Cache FastF1
cache_dir = 'cache'
fastf1.Cache.enable_cache(cache_dir)
api_cache.clear_old()


@app.on_event("startup")
async def startup_event():
    """Create PostgreSQL tables on startup if DB is available."""
    if db.available:
        await asyncio.to_thread(db.create_tables)
        print("PostgreSQL tables ready", flush=True)
    else:
        print("PostgreSQL not available - running in FastF1-only mode", flush=True)

    # Ingestion gérée par Railway Cron Job séparé (python jobs/schedule_ingest.py)
    print("[Scheduler] Ingestion handled by dedicated Railway Cron Job", flush=True)


# Root endpoint
@app.get("/")
async def root():
    return {
        "name": "METRIK DELTA API",
        "version": "1.0.0",
        "status": "online",
        "endpoints": {
            "stripe": "/api/stripe",
            "livetiming": "/api/livetiming",
            "health": "/health"
        }
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}



# 🔥 ENDPOINT GRANDS-PRIX AVEC REDIS

def _fetch_grands_prix_sync(year: int) -> list[dict]:
    schedule = fastf1.get_event_schedule(year)
    grands_prix = []
    for _, event in schedule.iterrows():
        if event.get('EventFormat', '') == 'testing':
            continue
        grands_prix.append({
            "round": int(event['RoundNumber']),
            "country": event['Country'],
            "location": event['Location'],
            "name": event['Location'],
            "official_name": event['OfficialEventName'],
            "date": event['EventDate'].strftime('%Y-%m-%d'),
            "is_sprint": event.get('EventFormat', 'conventional') != 'conventional',
        })
    return grands_prix


async def _get_grands_prix_cached(year: int) -> list[dict]:
    cache_key = f"grands_prix:{year}"
    cached = redis_cache.get(cache_key)
    if cached:
        return cached.get("grands_prix", [])
    grands_prix = await asyncio.to_thread(_fetch_grands_prix_sync, year)
    redis_cache.set(cache_key, {"grands_prix": grands_prix}, ttl=86400)
    return grands_prix


@app.get("/api/grands-prix/{year}")
@limiter.limit("30/minute")
async def get_grands_prix(request: Request, year: int):
    try:
        grands_prix = await _get_grands_prix_cached(year)
        return {"grands_prix": grands_prix}
    except Exception as e:
        logger.error(f"Error fetching GPs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🔥 ENDPOINT CALENDAR — real race start times, for the homepage countdown

@app.get("/api/calendar/{year}")
@limiter.limit("30/minute")
async def get_calendar(request: Request, year: int):
    try:
        cache_key = f"calendar:{year}"
        cached = redis_cache.get(cache_key)
        if cached:
            return cached

        grands_prix = await _get_grands_prix_cached(year)

        race_sessions = await _openf1_request("sessions", {"year": year, "session_name": "Race"})
        race_sessions = [s for s in race_sessions if "test" not in s.get("meeting_name", "").lower()]

        calendar = []
        for g in grands_prix:
            date_start = f"{g['date']}T00:00:00Z"  # fallback: date-only, midnight UTC
            try:
                target_date = datetime.date.fromisoformat(g["date"])
                if race_sessions:
                    best = min(
                        race_sessions,
                        key=lambda s: abs((datetime.date.fromisoformat(s["date_start"][:10]) - target_date).days),
                    )
                    if abs((datetime.date.fromisoformat(best["date_start"][:10]) - target_date).days) <= 2:
                        date_start = best["date_start"]
            except Exception:
                pass
            calendar.append({
                "round": g["round"],
                "location": g["location"],
                "country": g["country"],
                "date_start": date_start,
            })

        result = {"year": year, "calendar": calendar}
        redis_cache.set(cache_key, result, ttl=21600)  # 6h — session times can firm up as the weekend nears
        return result
    except Exception as e:
        logger.error(f"Error fetching calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# 🔥 ENDPOINT DRIVERS AVEC REDIS

@app.get("/api/drivers/{year}/{gp_round}/{session_type}")
@limiter.limit("20/minute")
async def get_drivers(request: Request, year: int, gp_round: int, session_type: str):
    try:
        # Log de la requête
        log_request("/api/drivers", {"year": year, "gp_round": gp_round, "session_type": session_type})
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = f"drivers:{year}:{gp_round}:{session_type}"
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/drivers", cache_hit=True)
            return cached_data
        
        # 🔥 ÉTAPE 2 : Cache MISS → OpenF1 (2023+) ou FastF1 (< 2023)
        if year >= 2023:
            session_key = await _openf1_get_session_key(year, gp_round, session_type)
            raw = await _openf1_request("drivers", {"session_key": session_key})
            drivers = [
                {
                    "abbreviation": d.get("name_acronym", ""),
                    "number": str(d.get("driver_number", "")),
                    "team": d.get("team_name") or "Unknown",
                    "fullName": d.get("full_name") or d.get("broadcast_name") or d.get("name_acronym", ""),
                }
                for d in raw if d.get("name_acronym")
            ]

            # Order by this session's own classification (finishing/qualifying
            # position) — not raw API insertion order — so the grid always
            # reflects who actually set times, fastest/leader first.
            try:
                results = await _openf1_request("session_result", {"session_key": session_key})
                pos_by_number = {
                    r["driver_number"]: r["position"]
                    for r in results
                    if r.get("position") is not None and r.get("driver_number") is not None
                }
                drivers.sort(key=lambda d: pos_by_number.get(int(d["number"]), 999) if d["number"].isdigit() else 999)
            except Exception as e:
                logger.warning(f"session_result ordering unavailable for {year} R{gp_round} {session_type}: {e}")
        else:
            session = fastf1.get_session(year, gp_round, session_type)
            await asyncio.to_thread(session.load)
            drivers = []
            for driver_code in session.drivers:
                driver_info = session.get_driver(driver_code)
                pos = driver_info.get('Position') if hasattr(driver_info, 'get') else None
                drivers.append({
                    'abbreviation': str(driver_info['Abbreviation']),
                    'number': str(driver_info['DriverNumber']),
                    'team': str(driver_info['TeamName']),
                    'fullName': str(driver_info['FullName']) if 'FullName' in driver_info else str(driver_info['Abbreviation']),
                    '_pos': int(pos) if pos is not None and not pd.isna(pos) else 999,
                })
            drivers.sort(key=lambda d: d['_pos'])
            for d in drivers:
                del d['_pos']

        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis (TTL 24h — grille stable)
        redis_cache.set(cache_key, drivers, ttl=86400)

        log_success("/api/drivers", cache_hit=False)
        return drivers

    except HTTPException:
        raise
    except Exception as e:
        log_error("/api/drivers", e)
        raise handle_fastf1_error(e, f"Année: {year}, GP: {gp_round}, Session: {session_type}")

def _prepare_tel(tel: pd.DataFrame) -> pd.DataFrame:
    """
    Nettoyage défensif d'un DataFrame de télémétrie FastF1/OpenF1 avant interpolation.

    Problèmes rencontrés avec les données 2026 via OpenF1 :
    - Distance contient des NaN → interp1d plante
    - Distance non-monotone (doublons de timestamps) → "x is not increasing"
    - Colonnes nGear / DRS / X / Y absentes → KeyError
    - Colonnes numériques avec NaN résiduels → int(NaN) = ValueError
    """
    if tel is None or tel.empty:
        return tel

    # 0. Si Distance absente, télémétrie inutilisable → retourner vide
    if 'Distance' not in tel.columns:
        return pd.DataFrame()

    # 1. Supprimer les lignes sans Distance valide
    tel = tel.dropna(subset=['Distance'])

    # 2. Garantir que Distance est strictement croissante
    if 'Distance' in tel.columns and len(tel) > 1:
        tel = tel.sort_values('Distance', ascending=True)
        tel = tel.drop_duplicates(subset=['Distance'], keep='first')
        tel = tel.reset_index(drop=True)

    # 3. Colonnes obligatoires : créer si absentes, fillna si présentes
    required = {
        'Speed': 0.0,
        'Throttle': 0.0,
        'Brake': 0,
        'nGear': 0,
        'DRS': 0,
        'X': 0.0,
        'Y': 0.0,
    }
    for col, default in required.items():
        if col not in tel.columns:
            tel[col] = default
        else:
            tel[col] = pd.to_numeric(tel[col], errors='coerce').fillna(default)

    return tel


def _try_telemetry_from_db(
    year: int, gp_round: int, session_type: str,
    driver1: str, lap_number1,
    driver2: str, lap_number2,
) -> dict | None:
    """
    Attempt to serve a telemetry comparison from PostgreSQL.
    Returns the result dict (same shape as the FastF1 path) or None if data is missing.
    This runs in a thread (psycopg2 is synchronous).
    """
    try:
        lap_type1 = "fastest" if lap_number1 is None else f"lap_{lap_number1}"
        lap_type2 = "fastest" if lap_number2 is None else f"lap_{lap_number2}"

        t1 = db.get_telemetry(year, gp_round, session_type, driver1, lap_type1)
        t2 = db.get_telemetry(year, gp_round, session_type, driver2, lap_type2)
        if t1 is None or t2 is None:
            return None

        actual_lap1 = t1["lap_number"]
        actual_lap2 = t2["lap_number"]

        lap1_meta = db.get_lap_metadata(year, gp_round, session_type, driver1, actual_lap1) or {}
        lap2_meta = db.get_lap_metadata(year, gp_round, session_type, driver2, actual_lap2) or {}

        d1 = t1["telemetry_data"]
        d2 = t2["telemetry_data"]

        def _dedup(data: dict, dist_key: str = "distance") -> dict:
            """Remove duplicate/non-monotone distance entries from raw DB telemetry."""
            dist = np.array(data[dist_key], dtype=float)
            _, idx = np.unique(dist, return_index=True)
            return {k: [v[i] for i in idx] for k, v in data.items()}

        d1 = _dedup(d1)
        d2 = _dedup(d2)

        dist1 = np.array(d1["distance"], dtype=float)
        dist2 = np.array(d2["distance"], dtype=float)

        min_distance = max(dist1.min(), dist2.min())
        max_distance = min(dist1.max(), dist2.max())
        common_distance = np.linspace(min_distance, max_distance, 1000)

        interp_speed1    = interp1d(dist1, d1["speed"],                   kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle1 = interp1d(dist1, d1["throttle"],                kind="linear",  bounds_error=False, fill_value=0)
        interp_brake1    = interp1d(dist1, np.array(d1["brake"]).astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear1     = interp1d(dist1, d1["gear"],                    kind="nearest", bounds_error=False, fill_value=0)
        interp_drs1      = interp1d(dist1, d1["drs"],                     kind="nearest", bounds_error=False, fill_value=0)
        interp_rpm1      = interp1d(dist1, d1["rpm"],                     kind="linear",  bounds_error=False, fill_value=10000)
        interp_x1        = interp1d(dist1, d1["x"],                       kind="linear",  bounds_error=False, fill_value="extrapolate")
        interp_y1        = interp1d(dist1, d1["y"],                       kind="linear",  bounds_error=False, fill_value="extrapolate")

        interp_speed2    = interp1d(dist2, d2["speed"],                   kind="linear",  bounds_error=False, fill_value=0)
        interp_throttle2 = interp1d(dist2, d2["throttle"],                kind="linear",  bounds_error=False, fill_value=0)
        interp_brake2    = interp1d(dist2, np.array(d2["brake"]).astype(int), kind="nearest", bounds_error=False, fill_value=0)
        interp_gear2     = interp1d(dist2, d2["gear"],                    kind="nearest", bounds_error=False, fill_value=0)
        interp_drs2      = interp1d(dist2, d2["drs"],                     kind="nearest", bounds_error=False, fill_value=0)
        interp_rpm2      = interp1d(dist2, d2["rpm"],                     kind="linear",  bounds_error=False, fill_value=10000)

        # First pass: compute raw cumulative times from speed/distance
        cum_times1 = [0.0] * len(common_distance)
        cum_times2 = [0.0] * len(common_distance)
        speeds1 = [float(interp_speed1(d)) for d in common_distance]
        speeds2 = [float(interp_speed2(d)) for d in common_distance]

        for i in range(1, len(common_distance)):
            seg = common_distance[i] - common_distance[i - 1]
            avg1 = (speeds1[i] + speeds1[i - 1]) / 2 / 3.6
            avg2 = (speeds2[i] + speeds2[i - 1]) / 2 / 3.6
            cum_times1[i] = cum_times1[i - 1] + (seg / avg1 if avg1 > 0 else 0)
            cum_times2[i] = cum_times2[i - 1] + (seg / avg2 if avg2 > 0 else 0)

        # Normalize to actual lap times so the delta is anchored to real timing
        actual_lap_time1 = lap1_meta.get("lap_time")
        actual_lap_time2 = lap2_meta.get("lap_time")
        if actual_lap_time1 and cum_times1[-1] > 0:
            scale1 = actual_lap_time1 / cum_times1[-1]
            cum_times1 = [t * scale1 for t in cum_times1]
        if actual_lap_time2 and cum_times2[-1] > 0:
            scale2 = actual_lap_time2 / cum_times2[-1]
            cum_times2 = [t * scale2 for t in cum_times2]

        telemetry_data = []
        for i, dist in enumerate(common_distance):
            telemetry_data.append({
                "distance":  float(dist),
                "speed1":    speeds1[i],
                "speed2":    speeds2[i],
                "throttle1": float(interp_throttle1(dist)),
                "throttle2": float(interp_throttle2(dist)),
                "brake1":    bool(interp_brake1(dist)),
                "brake2":    bool(interp_brake2(dist)),
                "gear1":     int(interp_gear1(dist)),
                "gear2":     int(interp_gear2(dist)),
                "drs1":      int(v) if not math.isnan(v := float(interp_drs1(dist))) else 0,
                "drs2":      int(v) if not math.isnan(v := float(interp_drs2(dist))) else 0,
                "x":         float(interp_x1(dist)),
                "y":         float(interp_y1(dist)),
                "delta":     float(cum_times2[i] - cum_times1[i]),
                "rpm1":      float(interp_rpm1(dist)),
                "rpm2":      float(interp_rpm2(dist)),
            })

        return {
            "telemetry":  telemetry_data,
            "lapTime1":   lap1_meta.get("lap_time"),
            "lapTime2":   lap2_meta.get("lap_time"),
            "sectors1":   {"sector1": lap1_meta.get("sector1_time"), "sector2": lap1_meta.get("sector2_time"), "sector3": lap1_meta.get("sector3_time")},
            "sectors2":   {"sector1": lap2_meta.get("sector1_time"), "sector2": lap2_meta.get("sector2_time"), "sector3": lap2_meta.get("sector3_time")},
            "driver1":    driver1,
            "driver2":    driver2,
            "lapNumber1": actual_lap1,
            "lapNumber2": actual_lap2,
            "source":     "postgresql",
        }
    except Exception as e:
        logger.warning(f"PostgreSQL telemetry lookup failed: {e}", exc_info=True)
        return None


# ---------------------------------------------------------------------------
# OpenF1 direct helpers (used for year >= 2024 as fast path)
# ---------------------------------------------------------------------------
OPENF1_BASE = "https://api.openf1.org/v1"
OPENF1_SESSION_TYPE_MAP = {
    "Q":  "Qualifying",
    "R":  "Race",
    "FP1": "Practice 1",
    "FP2": "Practice 2",
    "FP3": "Practice 3",
    "S":  "Sprint",
    "SQ": "Sprint Qualifying",
    "SS": "Sprint Shootout",
}


OPENF1_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}

# JWT token cache — refreshed automatically every ~55 min
_openf1_jwt: dict = {"token": None, "expires_at": 0}

async def _get_openf1_token() -> str | None:
    """Fetch or refresh the OpenF1 JWT token using email/password OAuth2."""
    import time, os
    email    = os.getenv("OPENF1_EMAIL")
    password = os.getenv("OPENF1_PASSWORD")
    if not email or not password:
        return None

    now = time.time()
    if _openf1_jwt["token"] and now < _openf1_jwt["expires_at"]:
        return _openf1_jwt["token"]

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.openf1.org/token",
                data={"username": email, "password": password},
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            resp.raise_for_status()
            data = resp.json()
            _openf1_jwt["token"]      = data["access_token"]
            _openf1_jwt["expires_at"] = now + int(data.get("expires_in", 3600)) - 300  # refresh 5 min early
            logger.info("✅ OpenF1 JWT token refreshed")
            return _openf1_jwt["token"]
    except Exception as e:
        logger.warning(f"⚠️  OpenF1 token fetch failed: {e}")
        return None

async def _openf1_request(path: str, params: dict) -> list:
    """GET OpenF1 avec JWT Bearer auth + retry exponentiel sur 429."""
    delays = [1, 3, 7]
    token = await _get_openf1_token()
    headers = {**OPENF1_HEADERS}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
        for attempt in range(len(delays) + 1):
            if attempt > 0:
                await asyncio.sleep(delays[attempt - 1])
            resp = await client.get(f"{OPENF1_BASE}/{path}", params=params)
            if resp.status_code == 429:
                if attempt < len(delays):
                    logger.warning(f"OpenF1 429 on /{path}, retry in {delays[attempt]}s")
                    continue
                raise HTTPException(
                    status_code=503,
                    detail="OpenF1 API rate limit atteint. Réessayez dans quelques secondes."
                )
            if resp.status_code == 404:
                # OpenF1 returns a bare 404 (not 200 + []) when a filtered
                # query matches nothing — e.g. a real, valid session_key for
                # a session that just hasn't happened yet, so there's no lap
                # data. Every caller already checks for an empty result and
                # raises its own clean, specific 404 (e.g. "No completed
                # laps for driver X") — treating this as empty lets that
                # existing handling run instead of this raising first.
                return []
            resp.raise_for_status()
            return resp.json()


async def _openf1_get_session_key(year: int, gp_round: int, session_type: str) -> int:
    session_name = OPENF1_SESSION_TYPE_MAP.get(session_type.upper(), session_type)

    # 1. PostgreSQL — permanent (session keys never change)
    if db.available:
        cached = await asyncio.to_thread(db.get_session_key, year, gp_round, session_type)
        if cached:
            return cached

    # 2. Redis — fallback when PostgreSQL unavailable
    redis_key = f"openf1:session_key:{year}:{gp_round}:{session_type}"
    cached_redis = redis_cache.get(redis_key)
    if cached_redis:
        return cached_redis["session_key"]

    # 3. Fetch from OpenF1 — bypass /meetings (blocked on Railway), use /sessions directly
    all_sessions = await _openf1_request("sessions", {
        "year": year,
        "session_name": session_name,
    })
    race_sessions = [s for s in all_sessions if "test" not in s.get("meeting_name", "").lower()]
    if not race_sessions:
        raise HTTPException(status_code=404, detail=f"No {session_name} sessions found for {year}")

    # Resolve by DATE, not by position in a date-sorted list: FastF1's schedule
    # (which our round numbers/labels come from) and OpenF1's own session list
    # can disagree on which events are included — e.g. FastF1's 2026 schedule
    # omits Bahrain and Jeddah entirely, silently shifting every later round's
    # *position* out of sync between the two sources even though both agree on
    # the actual calendar date. Matching on date keeps the label and the data
    # pointed at the same physical race regardless of either source's gaps.
    session_key = None
    try:
        grands_prix = await _get_grands_prix_cached(year)
        target_date_str = next((g["date"] for g in grands_prix if g["round"] == gp_round), None)
        if target_date_str:
            target_date = datetime.date.fromisoformat(target_date_str)

            def _date_gap(s):
                try:
                    return abs((datetime.date.fromisoformat(s["date_start"][:10]) - target_date).days)
                except Exception:
                    return 999

            best = min(race_sessions, key=_date_gap)
            if _date_gap(best) <= 2:
                session_key = best["session_key"]
    except Exception as e:
        logger.warning(f"Date-based session resolution failed for {year} R{gp_round}: {e}")

    if session_key is None:
        # Fallback — positional match (only if date resolution above failed)
        race_sessions_by_date = sorted(race_sessions, key=lambda s: s.get("date_start", ""))
        if gp_round < 1 or gp_round > len(race_sessions_by_date):
            raise HTTPException(
                status_code=404,
                detail=f"Round {gp_round} not found for {year} {session_name} ({len(race_sessions_by_date)} sessions found)"
            )
        session_key = race_sessions_by_date[gp_round - 1]["session_key"]

    # Save to both PostgreSQL (permanent) and Redis (TTL fallback)
    if db.available:
        await asyncio.to_thread(db.save_session_key, year, gp_round, session_type, session_key)
    redis_cache.set(redis_key, {"session_key": session_key}, ttl=86400)
    return session_key


async def _openf1_get_driver_number(session_key: int, driver_code: str) -> int:
    drivers = await _openf1_request("drivers", {
        "session_key": session_key,
        "name_acronym": driver_code,
    })
    if not drivers:
        raise HTTPException(status_code=404, detail=f"Driver {driver_code} not found in session")
    return drivers[0]["driver_number"]


async def _openf1_get_lap_info(session_key: int, driver_number: int, lap_number: int | None) -> dict:
    laps = await _openf1_request("laps", {
        "session_key": session_key,
        "driver_number": driver_number,
    })
    valid_laps = [l for l in laps if l.get("lap_duration") is not None and l.get("date_start") is not None]
    if not valid_laps:
        raise HTTPException(status_code=404, detail=f"No completed laps for driver number {driver_number}")

    if lap_number is not None:
        matching = [l for l in valid_laps if l["lap_number"] == lap_number]
        if not matching:
            raise HTTPException(status_code=404, detail=f"Lap {lap_number} not found for driver {driver_number}")
        return matching[0]

    return min(valid_laps, key=lambda l: l["lap_duration"])


async def _openf1_fetch_tel_df(
    session_key: int,
    driver_number: int,
    date_start: str,
    lap_duration: float,
) -> pd.DataFrame:
    """
    Fetch car_data + location from OpenF1 for a lap window, merge them,
    compute cumulative Distance, and return a DataFrame in FastF1 column convention.
    """
    lap_start_dt = pd.to_datetime(date_start, utc=True)
    lap_end_dt = lap_start_dt + pd.Timedelta(seconds=lap_duration + 2.0)

    base_params = {"session_key": session_key, "driver_number": driver_number}
    car_raw, loc_raw = await asyncio.gather(
        _openf1_request("car_data", base_params),
        _openf1_request("location", base_params),
    )

    if not car_raw:
        return pd.DataFrame()

    df_car = pd.DataFrame(car_raw)
    df_car["date"] = pd.to_datetime(df_car["date"], utc=True, format='ISO8601')
    df_car = df_car[(df_car["date"] >= lap_start_dt) & (df_car["date"] <= lap_end_dt)]
    df_car = df_car.sort_values("date").reset_index(drop=True)

    if df_car.empty:
        return pd.DataFrame()

    if loc_raw:
        df_loc = pd.DataFrame(loc_raw)
        df_loc["date"] = pd.to_datetime(df_loc["date"], utc=True, format='ISO8601')
        df_loc = df_loc[(df_loc["date"] >= lap_start_dt) & (df_loc["date"] <= lap_end_dt)]
        df_loc = df_loc.sort_values("date").reset_index(drop=True)
        df = pd.merge_asof(df_car, df_loc[["date", "x", "y"]], on="date", direction="nearest")
    else:
        df = df_car.copy()
        df["x"] = 0.0
        df["y"] = 0.0

    df = df.rename(columns={
        "speed": "Speed",
        "throttle": "Throttle",
        "brake": "Brake",
        "n_gear": "nGear",
        "drs": "DRS",
        "rpm": "RPM",
        "x": "X",
        "y": "Y",
    })

    # Compute cumulative Distance by integrating Speed over time (matches
    # FastF1's own add_distance() convention). Summing raw X/Y position deltas
    # instead inflates the total by ~8-10x — OpenF1's position samples carry
    # enough GPS-level jitter that each small step's noise adds real length
    # onto the cumulative sum, turning a real ~5-7km lap into ~50-60km.
    dt = df["date"].diff().dt.total_seconds().fillna(0).values
    speed_ms = pd.to_numeric(df.get("Speed", 0), errors="coerce").fillna(0).values / 3.6
    df["Distance"] = np.cumsum(speed_ms * dt)

    return df


@app.get("/api/telemetry/{year}/{gp_round}/{session_type}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_telemetry_comparison(
    request: Request,
    year: int, 
    gp_round: int, 
    session_type: str, 
    driver1: str, 
    driver2: str,
    lap_number1: int = Query(None),  # 🔥 Lap pour driver1
    lap_number2: int = Query(None),  # 🔥 Lap pour driver2
):
    try:
        log_request("/api/telemetry", {
            "year": year,
            "gp_round": gp_round,
            "session_type": session_type,
            "driver1": driver1,
            "driver2": driver2,
            "lap_number1": lap_number1,
            "lap_number2": lap_number2,
        })
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = redis_cache.get_cache_key_telemetry(
            year, gp_round, session_type, 
            driver1, lap_number1, 
            driver2, lap_number2
        )
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/telemetry", cache_hit=True)
            return cached_data

        # ÉTAPE 2a : PostgreSQL fast path (pre-computed data)
        if db.available:
            db_result = await asyncio.to_thread(
                _try_telemetry_from_db,
                year, gp_round, session_type,
                driver1, lap_number1,
                driver2, lap_number2,
            )
            if db_result:
                redis_cache.set(cache_key, db_result, ttl=3600)
                log_success("/api/telemetry", cache_hit=False)
                return db_result

        # ÉTAPE 2b : Cache MISS → OpenF1 direct (2026+) ou FastF1 (< 2026)
        if year >= 2026:
            # --- OpenF1 direct (~2-4s vs 15-30s avec FastF1) ---
            session_key = await _openf1_get_session_key(year, gp_round, session_type)

            # Sérialisé pour éviter le rate-limit OpenF1 (max ~10 req/min)
            d1_num = await _openf1_get_driver_number(session_key, driver1)
            await asyncio.sleep(0.3)
            d2_num = await _openf1_get_driver_number(session_key, driver2)
            await asyncio.sleep(0.3)
            lap1_info = await _openf1_get_lap_info(session_key, d1_num, lap_number1)
            await asyncio.sleep(0.3)
            lap2_info = await _openf1_get_lap_info(session_key, d2_num, lap_number2)
            await asyncio.sleep(0.3)
            tel1 = await _openf1_fetch_tel_df(session_key, d1_num, lap1_info["date_start"], lap1_info["lap_duration"])
            await asyncio.sleep(0.3)
            tel2 = await _openf1_fetch_tel_df(session_key, d2_num, lap2_info["date_start"], lap2_info["lap_duration"])

            sectors_driver1 = {
                "sector1": lap1_info.get("duration_sector_1"),
                "sector2": lap1_info.get("duration_sector_2"),
                "sector3": lap1_info.get("duration_sector_3"),
            }
            sectors_driver2 = {
                "sector1": lap2_info.get("duration_sector_1"),
                "sector2": lap2_info.get("duration_sector_2"),
                "sector3": lap2_info.get("duration_sector_3"),
            }
            lap_time1 = lap1_info.get("lap_duration")
            lap_time2 = lap2_info.get("lap_duration")
            actual_lap_number1 = lap1_info["lap_number"]
            actual_lap_number2 = lap2_info["lap_number"]

        else:
            # --- FastF1 fallback (sessions pré-2026 non présentes en DB) ---
            session = fastf1.get_session(year, gp_round, session_type)
            await asyncio.to_thread(session.load)

            if lap_number1 is not None:
                laps1 = session.laps.pick_drivers(driver1)
                lap1_filtered = laps1[laps1['LapNumber'] == lap_number1]
                if lap1_filtered.empty:
                    raise HTTPException(status_code=404, detail=f"Lap {lap_number1} not found for {driver1}")
                lap1 = lap1_filtered.iloc[0]
            else:
                lap1 = session.laps.pick_drivers(driver1).pick_fastest()

            if lap_number2 is not None:
                laps2 = session.laps.pick_drivers(driver2)
                lap2_filtered = laps2[laps2['LapNumber'] == lap_number2]
                if lap2_filtered.empty:
                    raise HTTPException(status_code=404, detail=f"Lap {lap_number2} not found for {driver2}")
                lap2 = lap2_filtered.iloc[0]
            else:
                lap2 = session.laps.pick_drivers(driver2).pick_fastest()

            def _lap_invalid(lap) -> bool:
                return lap is None or (hasattr(lap, '__getitem__') and pd.isna(lap['DriverNumber']))

            if _lap_invalid(lap1) or _lap_invalid(lap2):
                missing = driver1 if _lap_invalid(lap1) else driver2
                raise HTTPException(status_code=404, detail=f"Driver {missing} not found or no valid laps")

            sectors_driver1 = {
                "sector1": float(lap1['Sector1Time'].total_seconds()) if pd.notna(lap1['Sector1Time']) else None,
                "sector2": float(lap1['Sector2Time'].total_seconds()) if pd.notna(lap1['Sector2Time']) else None,
                "sector3": float(lap1['Sector3Time'].total_seconds()) if pd.notna(lap1['Sector3Time']) else None,
            }
            sectors_driver2 = {
                "sector1": float(lap2['Sector1Time'].total_seconds()) if pd.notna(lap2['Sector1Time']) else None,
                "sector2": float(lap2['Sector2Time'].total_seconds()) if pd.notna(lap2['Sector2Time']) else None,
                "sector3": float(lap2['Sector3Time'].total_seconds()) if pd.notna(lap2['Sector3Time']) else None,
            }
            tel1 = lap1.get_telemetry().add_distance()
            tel2 = lap2.get_telemetry().add_distance()
            lap_time1 = float(lap1['LapTime'].total_seconds()) if pd.notna(lap1['LapTime']) else None
            lap_time2 = float(lap2['LapTime'].total_seconds()) if pd.notna(lap2['LapTime']) else None
            actual_lap_number1 = int(lap1['LapNumber']) if pd.notna(lap1['LapNumber']) else lap_number1
            actual_lap_number2 = int(lap2['LapNumber']) if pd.notna(lap2['LapNumber']) else lap_number2

        if tel1 is None or tel1.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data for {driver1}")
        if tel2 is None or tel2.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry data for {driver2}")

        # Nettoyage défensif : NaN, colonnes manquantes, distance monotone
        tel1 = _prepare_tel(tel1)
        tel2 = _prepare_tel(tel2)

        if tel1.empty or len(tel1) < 2:
            raise HTTPException(status_code=404, detail=f"Insufficient telemetry data for {driver1}")
        if tel2.empty or len(tel2) < 2:
            raise HTTPException(status_code=404, detail=f"Insufficient telemetry data for {driver2}")

        # Détecter la colonne RPM (plusieurs noms possibles)
        rpm_col = None
        for possible_col in ['RPM', 'nRPM', 'Rpm', 'EngineRPM']:
            if possible_col in tel1.columns:
                rpm_col = possible_col
                break

        # ✅ INTERPOLATION SUR GRILLE COMMUNE (synchronisation parfaite)
        min_distance = max(tel1['Distance'].min(), tel2['Distance'].min())
        max_distance = min(tel1['Distance'].max(), tel2['Distance'].max())
        common_distance = np.linspace(min_distance, max_distance, 1000)

        # ===== DRIVER 1 =====
        interp_speed1    = interp1d(tel1['Distance'], tel1['Speed'],           kind='linear',  bounds_error=False, fill_value=0)
        interp_throttle1 = interp1d(tel1['Distance'], tel1['Throttle'],        kind='linear',  bounds_error=False, fill_value=0)
        interp_brake1    = interp1d(tel1['Distance'], tel1['Brake'].astype(int), kind='nearest', bounds_error=False, fill_value=0)
        interp_gear1     = interp1d(tel1['Distance'], tel1['nGear'],           kind='nearest', bounds_error=False, fill_value=0)
        interp_drs1      = interp1d(tel1['Distance'], tel1['DRS'],             kind='nearest', bounds_error=False, fill_value=0)
        interp_x1        = interp1d(tel1['Distance'], tel1['X'],               kind='linear',  bounds_error=False, fill_value='extrapolate')
        interp_y1        = interp1d(tel1['Distance'], tel1['Y'],               kind='linear',  bounds_error=False, fill_value='extrapolate')

        if rpm_col and rpm_col in tel1.columns:
            rpm1_series = pd.to_numeric(tel1[rpm_col], errors='coerce').fillna(10000)
            interp_rpm1 = interp1d(tel1['Distance'], rpm1_series, kind='linear', bounds_error=False, fill_value=10000)
        else:
            interp_rpm1 = lambda x: 10000

        # ===== DRIVER 2 =====
        interp_speed2    = interp1d(tel2['Distance'], tel2['Speed'],           kind='linear',  bounds_error=False, fill_value=0)
        interp_throttle2 = interp1d(tel2['Distance'], tel2['Throttle'],        kind='linear',  bounds_error=False, fill_value=0)
        interp_brake2    = interp1d(tel2['Distance'], tel2['Brake'].astype(int), kind='nearest', bounds_error=False, fill_value=0)
        interp_gear2     = interp1d(tel2['Distance'], tel2['nGear'],           kind='nearest', bounds_error=False, fill_value=0)
        interp_drs2      = interp1d(tel2['Distance'], tel2['DRS'],             kind='nearest', bounds_error=False, fill_value=0)

        if rpm_col and rpm_col in tel2.columns:
            rpm2_series = pd.to_numeric(tel2[rpm_col], errors='coerce').fillna(10000)
            interp_rpm2 = interp1d(tel2['Distance'], rpm2_series, kind='linear', bounds_error=False, fill_value=10000)
        else:
            interp_rpm2 = lambda x: 10000
        
        # ===== CONSTRUIRE TELEMETRY_DATA SYNCHRONISÉ AVEC DELTA =====
        telemetry_data = []
        cumulative_time1 = 0.0
        cumulative_time2 = 0.0
        prev_speed1 = 0.0
        prev_speed2 = 0.0
        
        for i, dist in enumerate(common_distance):
            speed1 = float(interp_speed1(dist))
            speed2 = float(interp_speed2(dist))
            
            # 🔥 CALCUL DU DELTA CUMULATIF
            if i > 0:
                # Distance parcourue depuis le dernier point
                segment_distance = dist - common_distance[i-1]
                
                # Vitesse moyenne sur le segment (en m/s)
                avg_speed1 = (speed1 + prev_speed1) / 2 / 3.6  # km/h → m/s
                avg_speed2 = (speed2 + prev_speed2) / 2 / 3.6
                
                # Temps pour parcourir ce segment
                if avg_speed1 > 0:
                    cumulative_time1 += segment_distance / avg_speed1
                if avg_speed2 > 0:
                    cumulative_time2 += segment_distance / avg_speed2
            
            # Delta = temps Driver2 - temps Driver1 (positif = Driver1 plus rapide)
            delta = cumulative_time2 - cumulative_time1
            
            telemetry_data.append({
                'distance': float(dist),
                'speed1': speed1,
                'speed2': speed2,
                'throttle1': float(interp_throttle1(dist)),
                'throttle2': float(interp_throttle2(dist)),
                'brake1': bool(interp_brake1(dist)),
                'brake2': bool(interp_brake2(dist)),
                'gear1': int(interp_gear1(dist)),
                'gear2': int(interp_gear2(dist)),
                'drs1': int(interp_drs1(dist)),
                'drs2': int(interp_drs2(dist)),
                'x': float(interp_x1(dist)),
                'y': float(interp_y1(dist)),
                'delta': float(delta),  # 🔥 Delta cumulatif précis
                'rpm1': float(interp_rpm1(dist)),  # 🔥 RPM
                'rpm2': float(interp_rpm2(dist)),  # 🔥 RPM
            })
            
            # Sauvegarder vitesses pour le prochain segment
            prev_speed1 = speed1
            prev_speed2 = speed2
        
        result = {
            'telemetry': telemetry_data,
            'lapTime1': lap_time1,
            'lapTime2': lap_time2,
            'sectors1': sectors_driver1,
            'sectors2': sectors_driver2,
            'driver1': driver1,
            'driver2': driver2,
            'lapNumber1': actual_lap_number1,
            'lapNumber2': actual_lap_number2,
        }
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis avec TTL 1h
        redis_cache.set(cache_key, result, ttl=3600)
        
        log_success("/api/telemetry", cache_hit=False)
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        log_error("/api/telemetry", e)
        import traceback; traceback.print_exc()
        error_msg = f"Pilotes: {driver1} vs {driver2}, {year} GP{gp_round} {session_type}"
        if lap_number1:
            error_msg += f" Lap1 {lap_number1}"
        if lap_number2:
            error_msg += f" Lap2 {lap_number2}"
        raise handle_fastf1_error(e, error_msg)

# ======================================================================
# MULTI-LAP TELEMETRY (up to 10 laps, cross-season capable)
# ======================================================================

class LapRef(BaseModel):
    year: int
    gp: int
    session: str
    driver: str
    lap: Optional[int] = None  # None = fastest lap

class TelemetryMultiRequest(BaseModel):
    laps: List[LapRef]


def _fetch_raw_lap_from_db(year: int, gp: int, session: str, driver: str, lap_number) -> dict | None:
    """Fetch raw telemetry arrays for one lap from PostgreSQL. Returns None if unavailable."""
    try:
        lap_type = "fastest" if lap_number is None else f"lap_{lap_number}"
        t = db.get_telemetry(year, gp, session, driver, lap_type)
        if t is None:
            return None
        actual_lap = t["lap_number"]
        meta = db.get_lap_metadata(year, gp, session, driver, actual_lap) or {}
        d = t["telemetry_data"]

        dist_arr = np.array(d["distance"], dtype=float)
        _, idx = np.unique(dist_arr, return_index=True)

        def _pick(key, default=0.0):
            arr = d.get(key, [default] * len(dist_arr))
            return np.array(arr)[idx]

        return {
            "dist":     dist_arr[idx],
            "speed":    _pick("speed"),
            "throttle": _pick("throttle"),
            "brake":    np.array(d.get("brake", [False] * len(dist_arr)), dtype=int)[idx],
            "gear":     _pick("gear", 1),
            "rpm":      _pick("rpm", 10000),
            "x":        _pick("x"),
            "y":        _pick("y"),
            "lap_time": meta.get("lap_time"),
            "sectors": {
                "s1": meta.get("sector1_time"),
                "s2": meta.get("sector2_time"),
                "s3": meta.get("sector3_time"),
            },
            "lap_number": actual_lap,
        }
    except Exception as e:
        logger.warning(f"DB fetch failed for {driver} {year} R{gp} {session}: {e}")
        return None


async def _fetch_raw_lap(lap_ref: LapRef) -> dict:
    """Fetch raw telemetry for one lap. Tries DB → OpenF1 → FastF1."""
    year, gp, session, driver, lap = lap_ref.year, lap_ref.gp, lap_ref.session, lap_ref.driver, lap_ref.lap

    # 1. PostgreSQL fast path
    if db.available:
        result = await asyncio.to_thread(_fetch_raw_lap_from_db, year, gp, session, driver, lap)
        if result:
            return result

    # 2. OpenF1 direct (2026+)
    if year >= 2026:
        session_key = await _openf1_get_session_key(year, gp, session)
        await asyncio.sleep(0.3)
        d_num = await _openf1_get_driver_number(session_key, driver)
        await asyncio.sleep(0.3)
        lap_info = await _openf1_get_lap_info(session_key, d_num, lap)
        await asyncio.sleep(0.3)
        tel_df = await _openf1_fetch_tel_df(session_key, d_num, lap_info["date_start"], lap_info["lap_duration"])
        if tel_df is None or tel_df.empty:
            raise HTTPException(status_code=404, detail=f"No telemetry for {driver}")
        tel_df = _prepare_tel(tel_df)
        dist = tel_df["Distance"].values
        rpm_col = next((c for c in ["RPM", "nRPM", "Rpm"] if c in tel_df.columns), None)
        rpm_arr = pd.to_numeric(tel_df[rpm_col], errors="coerce").fillna(10000).values if rpm_col else np.full(len(dist), 10000.0)
        return {
            "dist":     dist,
            "speed":    tel_df["Speed"].values,
            "throttle": tel_df["Throttle"].values,
            "brake":    tel_df["Brake"].astype(int).values,
            "gear":     tel_df["nGear"].values,
            "rpm":      rpm_arr,
            "x":        tel_df["X"].values if "X" in tel_df.columns else np.zeros(len(dist)),
            "y":        tel_df["Y"].values if "Y" in tel_df.columns else np.zeros(len(dist)),
            "lap_time": lap_info.get("lap_duration"),
            "sectors":  {"s1": lap_info.get("duration_sector_1"), "s2": lap_info.get("duration_sector_2"), "s3": lap_info.get("duration_sector_3")},
            "lap_number": lap_info["lap_number"],
        }

    # 3. FastF1 fallback
    def _ff1_fetch():
        sess = fastf1.get_session(year, gp, session)
        sess.load()
        driver_laps = sess.laps.pick_drivers(driver)
        if lap is not None:
            lap_rows = driver_laps[driver_laps["LapNumber"] == lap]
            if lap_rows.empty:
                raise HTTPException(status_code=404, detail=f"Lap {lap} not found for {driver}")
            lap_row = lap_rows.iloc[0]
        else:
            lap_row = driver_laps.pick_fastest()
        tel = lap_row.get_telemetry().add_distance()
        tel = _prepare_tel(tel)
        rpm_col = next((c for c in ["RPM", "nRPM", "Rpm"] if c in tel.columns), None)
        rpm_arr = pd.to_numeric(tel[rpm_col], errors="coerce").fillna(10000).values if rpm_col else np.full(len(tel), 10000.0)
        lap_t = float(lap_row["LapTime"].total_seconds()) if pd.notna(lap_row.get("LapTime")) else None
        return {
            "dist":     tel["Distance"].values,
            "speed":    tel["Speed"].values,
            "throttle": tel["Throttle"].values,
            "brake":    tel["Brake"].astype(int).values,
            "gear":     tel["nGear"].values,
            "rpm":      rpm_arr,
            "x":        tel["X"].values if "X" in tel.columns else np.zeros(len(tel)),
            "y":        tel["Y"].values if "Y" in tel.columns else np.zeros(len(tel)),
            "lap_time": lap_t,
            "sectors": {
                "s1": float(lap_row["Sector1Time"].total_seconds()) if pd.notna(lap_row.get("Sector1Time")) else None,
                "s2": float(lap_row["Sector2Time"].total_seconds()) if pd.notna(lap_row.get("Sector2Time")) else None,
                "s3": float(lap_row["Sector3Time"].total_seconds()) if pd.notna(lap_row.get("Sector3Time")) else None,
            },
            "lap_number": int(lap_row["LapNumber"]) if pd.notna(lap_row.get("LapNumber")) else (lap or 0),
        }

    return await asyncio.to_thread(_ff1_fetch)


def _get_circuit_corners_sync(year: int, gp: int, session_type: str) -> dict:
    """Official FIA corner numbers + static (X, Y) positions, and the circuit's
    own display rotation (degrees) — both from FastF1's circuit reference data."""
    sess = fastf1.get_session(year, gp, session_type)
    sess.load(laps=True, telemetry=False, weather=False, messages=False)
    ci = sess.get_circuit_info()
    corners = [
        {
            "number": int(row.Number),
            "letter": (row.Letter or "").strip() or None,
            "x": float(row.X),
            "y": float(row.Y),
        }
        for row in ci.corners.itertuples()
    ]
    return {"corners": corners, "rotation": float(ci.rotation)}


@app.post("/api/telemetry/multi")
@limiter.limit("5/minute")
async def get_telemetry_multi(request: Request, body: TelemetryMultiRequest):
    """Multi-lap telemetry comparison — up to 10 laps, cross-season capable."""
    if len(body.laps) < 2:
        raise HTTPException(status_code=400, detail="At least 2 laps required")
    if len(body.laps) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 laps allowed")

    import hashlib, json as _json
    cache_key = "tel:multi:" + hashlib.md5(
        _json.dumps([l.model_dump() for l in body.laps], sort_keys=True).encode()
    ).hexdigest()[:16]
    cached = redis_cache.get(cache_key)
    if cached:
        return cached

    # Fetch all laps sequentially (rate-limit safety for OpenF1)
    raw_laps: list[dict] = []
    for i, lap_ref in enumerate(body.laps):
        if i > 0 and lap_ref.year >= 2026:
            await asyncio.sleep(0.5)
        raw = await _fetch_raw_lap(lap_ref)
        raw_laps.append(raw)

    # Official FIA corner numbers — static (X, Y) from FastF1 circuit reference data,
    # matched to the reference lap's own path to get a distance value. X/Y frame is
    # shared between FastF1 and OpenF1 (both trace back to the same F1 live-timing
    # position feed), so nearest-neighbour matching works — but naive whole-lap
    # nearest-neighbour breaks on tracks with tightly-packed technical sections
    # (e.g. Baku's castle section) where several corners sit close together in raw
    # (X, Y) space despite being far apart in lap distance, causing mismatches.
    # Fix: corners are numbered sequentially around the lap by the FIA, so search
    # each one FORWARD ONLY from the previous corner's match — this enforces
    # monotonically increasing distance and eliminates that failure mode.
    corners: list[dict] = []
    rotation: float = 0.0
    try:
        ref = body.laps[0]
        corners_key = f"circuit:corners:{ref.year}:{ref.gp}"
        circuit_data = redis_cache.get(corners_key)
        if circuit_data is None:
            circuit_data = await asyncio.to_thread(_get_circuit_corners_sync, ref.year, ref.gp, ref.session)
            redis_cache.set(corners_key, circuit_data, ttl=2592000)  # 30 days — circuit layout is static

        raw_corners = circuit_data["corners"]
        rotation = circuit_data["rotation"]

        ref_x = raw_laps[0]["x"].astype(float)
        ref_y = raw_laps[0]["y"].astype(float)
        ref_dist_arr = raw_laps[0]["dist"].astype(float)

        ordered_corners = sorted(raw_corners, key=lambda c: c["number"])
        search_start = 0
        for c in ordered_corners:
            d2 = (ref_x[search_start:] - c["x"]) ** 2 + (ref_y[search_start:] - c["y"]) ** 2
            idx = search_start + int(np.argmin(d2))
            corners.append({"number": c["number"], "letter": c["letter"], "distance": float(ref_dist_arr[idx])})
            search_start = idx
    except Exception as e:
        logger.warning(f"circuit corners unavailable for {body.laps[0].year} R{body.laps[0].gp}: {e}")
        corners = []

    # Reference distance grid from first lap (1000 points)
    ref_dist = raw_laps[0]["dist"].astype(float)
    min_d, max_d = float(ref_dist.min()), float(ref_dist.max())
    N = 1000
    common_dist = np.linspace(min_d, max_d, N)

    # Build interpolators — scale each lap's distance to reference range for cross-season
    kw = dict(bounds_error=False)
    i_speed, i_throttle, i_brake, i_gear, i_rpm = [], [], [], [], []
    i_x = i_y = None
    ref_range = max_d - min_d

    for idx, raw in enumerate(raw_laps):
        d = raw["dist"].astype(float)
        d_range = d.max() - d.min()
        d_sc = (d - d.min()) / d_range * ref_range + min_d if d_range > 0 and ref_range > 0 else d

        i_speed.append(interp1d(d_sc, raw["speed"],    kind="linear",  fill_value=0,     **kw))
        i_throttle.append(interp1d(d_sc, raw["throttle"], kind="linear",  fill_value=0,     **kw))
        i_brake.append(interp1d(d_sc, raw["brake"],   kind="nearest", fill_value=0,     **kw))
        i_gear.append(interp1d(d_sc, raw["gear"],     kind="nearest", fill_value=1,     **kw))
        i_rpm.append(interp1d(d_sc, raw["rpm"],      kind="linear",  fill_value=10000, **kw))
        if idx == 0:
            i_x = interp1d(d_sc, raw["x"], kind="linear", fill_value="extrapolate")
            i_y = interp1d(d_sc, raw["y"], kind="linear", fill_value="extrapolate")

    # Pre-compute speeds on grid for vectorized cumulative time
    n_laps = len(raw_laps)
    speeds_grid = np.array([[float(f(d)) for d in common_dist] for f in i_speed])  # (n_laps, N)

    # Cumulative lap time per driver
    cum_times = np.zeros((n_laps, N))
    for i in range(1, N):
        seg = common_dist[i] - common_dist[i - 1]
        avg_spd = (speeds_grid[:, i] + speeds_grid[:, i - 1]) / 2 / 3.6  # km/h → m/s
        dt = np.where(avg_spd > 0, seg / avg_spd, 0.0)
        cum_times[:, i] = cum_times[:, i - 1] + dt

    # Normalize to actual lap times
    for j, raw in enumerate(raw_laps):
        lt = raw["lap_time"]
        if lt and cum_times[j, -1] > 0:
            cum_times[j] *= lt / cum_times[j, -1]

    # Build telemetry array
    telemetry = []
    for i, dist in enumerate(common_dist):
        telemetry.append({
            "distance":  float(dist),
            "speeds":    [float(speeds_grid[j, i]) for j in range(n_laps)],
            "throttles": [float(i_throttle[j](dist)) for j in range(n_laps)],
            "brakes":    [bool(i_brake[j](dist)) for j in range(n_laps)],
            "gears":     [int(i_gear[j](dist)) for j in range(n_laps)],
            "rpms":      [float(i_rpm[j](dist)) for j in range(n_laps)],
            "deltas":    [float(cum_times[j, i] - cum_times[0, i]) for j in range(n_laps)],
            "x":         float(i_x(dist)),
            "y":         float(i_y(dist)),
        })

    drivers_meta = [
        {
            "driver":  r.driver, "year": r.year, "gp": r.gp, "session": r.session,
            "lap":     raw["lap_number"], "lapTime": raw["lap_time"], "sectors": raw["sectors"],
        }
        for r, raw in zip(body.laps, raw_laps)
    ]

    result = {"drivers": drivers_meta, "telemetry": telemetry, "corners": corners, "rotation": rotation}
    redis_cache.set(cache_key, result, ttl=3600)
    return result


@app.get("/api/session-laps/{year}/{gp_round}/{session_type}/{driver}")
@limiter.limit("10/minute")
async def get_session_laps(
    request: Request,
    year: int,
    gp_round: int, 
    session_type: str,
    driver: str
):
    """
    Retourne TOUS les lap times d'un pilote pour une session donnée
    Format GP Tempo compatible avec HasTelemetry flag
    🔥 AVEC REDIS CACHE
    """
    try:
        log_request("/api/session-laps", {
            "year": year,
            "gp_round": gp_round,
            "session_type": session_type,
            "driver": driver
        })
        
        # 🔥 ÉTAPE 1 : Vérifier Redis cache
        cache_key = redis_cache.get_cache_key_laps(year, gp_round, session_type, driver)
        cached_data = redis_cache.get(cache_key)
        
        if cached_data:
            log_success("/api/session-laps", cache_hit=True)
            return cached_data

        # ÉTAPE 2a : PostgreSQL fast path
        if db.available:
            db_laps = await asyncio.to_thread(
                db.get_laps, year, gp_round, session_type, driver
            )
            if db_laps:
                fastest_time = min((l["lap_time"] for l in db_laps if l["lap_time"] is not None), default=None)
                laps_data = []
                for l in db_laps:
                    lt = l["lap_time"]
                    is_pb = fastest_time is not None and lt is not None and abs(lt - fastest_time) < 0.001
                    laps_data.append({
                        "Position":       None,
                        "Id":             f"{year}_{gp_round}_{l['lap_number']}_{driver}",
                        "LapNumber":      l["lap_number"],
                        "LapTime":        lt,
                        "Sector1Time":    l["sector1_time"],
                        "Sector2Time":    l["sector2_time"],
                        "Sector3Time":    l["sector3_time"],
                        "IsPersonalBest": bool(is_pb),
                        "IsHotLap":       lt is not None,
                        "HasTelemetry":   bool(l["telemetry_available"]),
                        "Team":           None,
                        "Driver":         driver,
                        "Compound":       l["compound"],
                        "AirTemp":        None,
                        "TrackTemp":      None,
                        "WindSpeed":      None,
                    })
                result = {
                    "driver":      driver,
                    "team":        None,
                    "session":     f"{year} R{gp_round} {session_type}",
                    "year":        year,
                    "round":       gp_round,
                    "sessionType": session_type,
                    "totalLaps":   len(laps_data),
                    "laps":        laps_data,
                    "source":      "postgresql",
                }
                redis_cache.set(cache_key, result, ttl=3600)
                log_success("/api/session-laps", cache_hit=False)
                return result

        # ÉTAPE 2b : Cache MISS → OpenF1 (2026+) ou FastF1 (< 2026)
        if year >= 2026:
            session_key = await _openf1_get_session_key(year, gp_round, session_type)
            driver_num = await _openf1_get_driver_number(session_key, driver)
            raw_laps = await _openf1_request("laps", {
                "session_key": session_key,
                "driver_number": driver_num,
            })
            if not raw_laps:
                raise HTTPException(status_code=404, detail=f"No laps found for {driver}")

            # OpenF1's /laps has no per-lap compound field — tyre compound only
            # comes from /stints, keyed by lap RANGE (lap_start..lap_end) per
            # driver. Build a lap_number -> compound lookup from that.
            compound_by_lap: dict[int, str] = {}
            try:
                stints = await _openf1_request("stints", {
                    "session_key": session_key,
                    "driver_number": driver_num,
                })
                for stint in stints:
                    compound = stint.get("compound")
                    lap_start, lap_end = stint.get("lap_start"), stint.get("lap_end")
                    if compound and lap_start is not None and lap_end is not None:
                        for n in range(lap_start, lap_end + 1):
                            compound_by_lap[n] = compound
            except Exception as e:
                logger.warning(f"stints fetch failed for {driver} {year} R{gp_round} {session_type}: {e}")

            valid_times = [l["lap_duration"] for l in raw_laps if l.get("lap_duration") is not None]
            fastest_time = min(valid_times) if valid_times else None

            laps_data = []
            for lap in raw_laps:
                lap_num = lap.get("lap_number")
                lap_time = lap.get("lap_duration")
                is_pb = fastest_time is not None and lap_time is not None and abs(lap_time - fastest_time) < 0.001
                laps_data.append({
                    "Position":       None,
                    "Id":             f"{year}_{gp_round}_{lap_num}_{driver}",
                    "LapNumber":      lap_num,
                    "LapTime":        lap_time,
                    "Sector1Time":    lap.get("duration_sector_1"),
                    "Sector2Time":    lap.get("duration_sector_2"),
                    "Sector3Time":    lap.get("duration_sector_3"),
                    "IsPersonalBest": bool(is_pb),
                    "IsHotLap":       lap_time is not None,
                    "HasTelemetry":   lap_time is not None and lap.get("date_start") is not None,
                    "Team":           None,
                    "Driver":         driver,
                    "Compound":       compound_by_lap.get(lap_num) or lap.get("compound"),
                    "AirTemp":        None,
                    "TrackTemp":      None,
                    "WindSpeed":      None,
                })
            laps_data.sort(key=lambda x: x["LapNumber"] if x["LapNumber"] is not None else 0)

            result = {
                "driver":      driver,
                "team":        None,
                "session":     f"{year} R{gp_round} {session_type}",
                "year":        year,
                "round":       gp_round,
                "sessionType": session_type,
                "totalLaps":   len(laps_data),
                "laps":        laps_data,
                "source":      "openf1",
            }
            redis_cache.set(cache_key, result, ttl=3600)
            log_success("/api/session-laps", cache_hit=False)
            return result

        # FastF1 slow path (< 2026)
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)

        # 🔥 RÉCUPÉRER TOUS LES LAPS du pilote
        all_laps = session.laps
        driver_laps = all_laps[all_laps['Driver'] == driver]
        
        if driver_laps.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No laps found for driver {driver}"
            )
        
        # 🔥 RÉCUPÉRER INFOS PILOTE (Team)
        driver_info = session.get_driver(driver)
        team_name = driver_info['TeamName'] if driver_info is not None else "Unknown"
        
        # 🔥 FASTEST LAP pour IsPersonalBest
        fastest_lap_time = driver_laps['LapTime'].min()
        
        laps_data = []
        for idx, lap in driver_laps.iterrows():
            lap_time = lap['LapTime']
            lap_number = lap['LapNumber']
            
            # ✅ Vérifier si le lap a de la télémétrie disponible
            # Utilise IsAccurate (déjà en mémoire) au lieu de charger toute la télémétrie
            # pour chaque lap — évite O(n) appels get_telemetry()
            has_telemetry = bool(
                pd.notna(lap.get('IsAccurate')) and lap.get('IsAccurate') == True
                and pd.notna(lap_time)
            )
            
            # ✅ Inclure TOUS les laps (même ceux sans temps valide)
            # GP Tempo montre tous les laps, même les outlaps/inlaps
            
            # 🔥 SECTEURS
            sector1 = float(lap['Sector1Time'].total_seconds()) if pd.notna(lap['Sector1Time']) else None
            sector2 = float(lap['Sector2Time'].total_seconds()) if pd.notna(lap['Sector2Time']) else None
            sector3 = float(lap['Sector3Time'].total_seconds()) if pd.notna(lap['Sector3Time']) else None
            
            # 🔥 LAP TIME en secondes (float)
            lap_time_seconds = float(lap_time.total_seconds()) if pd.notna(lap_time) else None
            
            # 🔥 FLAGS
            is_personal_best = (lap_time == fastest_lap_time) if pd.notna(lap_time) and pd.notna(fastest_lap_time) else False
            
            # IsHotLap = lap avec temps valide et non marqué comme Out/In lap
            # Dans FastF1, un "hot lap" a généralement un LapTime valide et n'est pas un outlap
            is_hot_lap = pd.notna(lap_time) and not lap.get('IsAccurate', True) == False
            
            # 🔥 WEATHER DATA (si disponible)
            air_temp = float(lap['AirTemp']) if pd.notna(lap.get('AirTemp')) else None
            track_temp = float(lap['TrackTemp']) if pd.notna(lap.get('TrackTemp')) else None
            
            # 🔥 COMPOUND (pneu)
            compound = lap['Compound'] if pd.notna(lap.get('Compound')) else None
            
            laps_data.append({
                # GP Tempo format
                "Position": None,  # Position in race (not relevant for practice/quali)
                "Id": f"{year}_{gp_round}_{lap_number}_{driver}",  # Unique identifier
                "LapNumber": int(lap_number) if pd.notna(lap_number) else None,
                "LapTime": lap_time_seconds,  # 🔥 Float en secondes
                "Sector1Time": sector1,
                "Sector2Time": sector2,
                "Sector3Time": sector3,
                "IsPersonalBest": bool(is_personal_best),
                "IsHotLap": bool(is_hot_lap),
                "HasTelemetry": bool(has_telemetry),  # 🔥 FLAG CRUCIAL pour ⊕ icon
                "Team": team_name,
                "Driver": driver,
                "Compound": compound,
                "AirTemp": air_temp,
                "TrackTemp": track_temp,
                "WindSpeed": None  # FastF1 ne fournit pas WindSpeed dans les laps
            })
        
        # Trier par numéro de tour
        laps_data.sort(key=lambda x: x['LapNumber'] if x['LapNumber'] is not None else 0)
        
        result = {
            'driver': driver,
            'team': team_name,
            'session': f"{year} R{gp_round} {session_type}",
            'year': year,
            'round': gp_round,
            'sessionType': session_type,
            'totalLaps': len(laps_data),
            'laps': laps_data  # 🔥 Format GP Tempo
        }
        
        # 🔥 ÉTAPE 3 : Sauvegarder dans Redis avec TTL 1h
        redis_cache.set(cache_key, result, ttl=3600)
        
        log_success("/api/session-laps", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/session-laps", e)
        raise handle_fastf1_error(e, f"Driver {driver}, {year} GP{gp_round} {session_type}")


@app.get("/api/animation-optimized/{year}/{gp_round}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_animation_optimized(request: Request, year: int, gp_round: int, driver1: str, driver2: str):
    """
    🎯 GPS BATTLE ANIMATION - SYNCHRONISÉ SUR LA DISTANCE DU TOUR
    
    CHANGEMENT MAJEUR : Les points sont synchronisés sur la DISTANCE (progress 0→1)
    au lieu du TEMPS pour avoir une synchronisation PARFAITE.
    
    Quand progress = 0.5 (50% du tour) :
    - Driver 1 à exactement 50% de SA distance
    - Driver 2 à exactement 50% de SA distance
    → Même position sur le circuit, télémétrie synchronisée !
    """
    try:
        log_request("/api/animation-optimized", {
            "year": year,
            "gp_round": gp_round,
            "driver1": driver1,
            "driver2": driver2
        })
        
        cache_key_parts = ['animation_optimized_v2', year, gp_round, driver1, driver2]
        cached_data = api_cache.get(*cache_key_parts)
        if cached_data:
            log_success("/api/animation-optimized", cache_hit=True)
            return cached_data
        
        session = fastf1.get_session(year, gp_round, 'Q')
        await asyncio.to_thread(session.load)
        
        lap1 = session.laps.pick_drivers(driver1).pick_fastest()
        lap2 = session.laps.pick_drivers(driver2).pick_fastest()
        
        if lap1 is None or lap2 is None:
            missing_driver = driver1 if lap1 is None else driver2
            raise HTTPException(status_code=404, detail=f"No fastest lap found for {missing_driver}")
        
        # Secteurs
        sector1_time1 = float(lap1['Sector1Time'].total_seconds()) if pd.notna(lap1['Sector1Time']) else None
        sector2_time1 = float(lap1['Sector2Time'].total_seconds()) if pd.notna(lap1['Sector2Time']) else None
        sector3_time1 = float(lap1['Sector3Time'].total_seconds()) if pd.notna(lap1['Sector3Time']) else None
        
        sector1_time2 = float(lap2['Sector1Time'].total_seconds()) if pd.notna(lap2['Sector1Time']) else None
        sector2_time2 = float(lap2['Sector2Time'].total_seconds()) if pd.notna(lap2['Sector2Time']) else None
        sector3_time2 = float(lap2['Sector3Time'].total_seconds()) if pd.notna(lap2['Sector3Time']) else None
        
        # Télémétrie + Position
        tel1 = lap1.get_telemetry().add_distance().reset_index(drop=True)
        tel2 = lap2.get_telemetry().add_distance().reset_index(drop=True)
        pos1 = lap1.get_pos_data().reset_index(drop=True)
        pos2 = lap2.get_pos_data().reset_index(drop=True)
        
        # SVG Path du circuit
        track_points = []
        min_pos_length = min(len(pos1), len(tel1))
        track_sample_step = max(1, min_pos_length // 200)
        
        for i in range(0, min_pos_length, track_sample_step):
            if i >= len(pos1):
                break
            track_points.append({
                'x': float(pos1.iloc[i]['X']),
                'y': float(pos1.iloc[i]['Y'])
            })
        
        # Normaliser coordonnées (viewBox 1000x1000)
        all_x = [p['x'] for p in track_points]
        all_y = [p['y'] for p in track_points]
        
        min_x, max_x = min(all_x), max(all_x)
        min_y, max_y = min(all_y), max(all_y)
        
        range_x = max_x - min_x
        range_y = max_y - min_y
        padding = 0.1
        
        min_x -= range_x * padding
        max_x += range_x * padding
        min_y -= range_y * padding
        max_y += range_y * padding
        
        range_x = max_x - min_x
        range_y = max_y - min_y
        
        for point in track_points:
            point['x'] = ((point['x'] - min_x) / range_x) * 1000
            point['y'] = ((point['y'] - min_y) / range_y) * 1000
        
        svg_path = f"M {track_points[0]['x']:.2f} {track_points[0]['y']:.2f}"
        for i in range(1, len(track_points)):
            svg_path += f" L {track_points[i]['x']:.2f} {track_points[i]['y']:.2f}"
        svg_path += " Z"
        
        # Détecter RPM
        rpm_col = None
        for possible_col in ['RPM', 'nRPM', 'Rpm', 'EngineRPM']:
            if possible_col in tel1.columns:
                rpm_col = possible_col
                break
        
        # 🔥 TÉLÉMÉTRIE DRIVER 1 - SYNCHRONISÉE SUR PROGRESS (0→1)
        driver1_telemetry = []
        min_length1 = min(len(tel1), len(pos1))
        step1 = max(1, min_length1 // 500)
        
        for i in range(0, min_length1, step1):
            if i >= len(tel1) or i >= len(pos1):
                continue
            
            point_tel = tel1.iloc[i]
            point_pos = pos1.iloc[i]
            
            normalized_x = ((float(point_pos['X']) - min_x) / range_x) * 1000
            normalized_y = ((float(point_pos['Y']) - min_y) / range_y) * 1000
            
            rpm_value = float(point_tel[rpm_col]) if rpm_col and pd.notna(point_tel.get(rpm_col)) else 10000
            
            # 🔥 PROGRESS = Position dans le tour (0.0 à 1.0)
            progress = i / (min_length1 - 1) if min_length1 > 1 else 0.0
            
            driver1_telemetry.append({
                'x': normalized_x,
                'y': normalized_y,
                'speed': float(point_tel['Speed']) if pd.notna(point_tel['Speed']) else 0.0,
                'throttle': float(point_tel['Throttle']) if pd.notna(point_tel['Throttle']) else 0.0,
                'brake': bool(point_tel['Brake']) if pd.notna(point_tel['Brake']) else False,
                'gear': int(point_tel['nGear']) if pd.notna(point_tel['nGear']) else 0,
                'drs': int(point_tel['DRS']) if pd.notna(point_tel['DRS']) else 0,
                'rpm': rpm_value,
                'progress': progress,  # 🔥 0.0 → 1.0 (distance dans le tour)
                'time': float(point_tel['Time'].total_seconds())  # Gardé pour info
            })
        
        # 🔥 TÉLÉMÉTRIE DRIVER 2 - SYNCHRONISÉE SUR PROGRESS (0→1)
        driver2_telemetry = []
        min_length2 = min(len(tel2), len(pos2))
        step2 = max(1, min_length2 // 500)
        
        for i in range(0, min_length2, step2):
            if i >= len(tel2) or i >= len(pos2):
                continue
            
            point_tel = tel2.iloc[i]
            point_pos = pos2.iloc[i]
            
            normalized_x = ((float(point_pos['X']) - min_x) / range_x) * 1000
            normalized_y = ((float(point_pos['Y']) - min_y) / range_y) * 1000
            
            rpm_value = float(point_tel[rpm_col]) if rpm_col and pd.notna(point_tel.get(rpm_col)) else 10000
            
            # 🔥 PROGRESS = Position dans le tour (0.0 à 1.0)
            progress = i / (min_length2 - 1) if min_length2 > 1 else 0.0
            
            driver2_telemetry.append({
                'x': normalized_x,
                'y': normalized_y,
                'speed': float(point_tel['Speed']) if pd.notna(point_tel['Speed']) else 0.0,
                'throttle': float(point_tel['Throttle']) if pd.notna(point_tel['Throttle']) else 0.0,
                'brake': bool(point_tel['Brake']) if pd.notna(point_tel['Brake']) else False,
                'gear': int(point_tel['nGear']) if pd.notna(point_tel['nGear']) else 0,
                'drs': int(point_tel['DRS']) if pd.notna(point_tel['DRS']) else 0,
                'rpm': rpm_value,
                'progress': progress,  # 🔥 0.0 → 1.0
                'time': float(point_tel['Time'].total_seconds())
            })
        
        # Couleurs team
        def get_team_color(driver_code: str) -> str:
            team_colors = {
                'VER': '#3671C6', 'TSU': '#3671C6',
                'LEC': '#E8002D', 'HAM': '#E8002D',
                'RUS': '#27F4D2', 'ANT': '#27F4D2',
                'NOR': '#FF8700', 'PIA': '#FF8700',
                'GAS': '#FF87BC', 'DOO': '#FF87BC', 'COL': '#FF87BC',
                'ALO': '#229971', 'STR': '#229971',
                'LAW': '#6692FF', 'HAD': '#6692FF',
                'HUL': '#00E701', 'BOR': '#00E701', 'BOT': '#00E701', 'ZHO': '#00E701',
                'OCO': '#B6BABD', 'BEA': '#B6BABD', 'MAG': '#B6BABD',
                'ALB': '#00A0DE', 'SAI': '#00A0DE', 'SAR': '#00A0DE',
            }
            return team_colors.get(driver_code.upper(), '#00D2BE')
        
        lap1_time = float(lap1['LapTime'].total_seconds()) if pd.notna(lap1['LapTime']) else 0.0
        lap2_time = float(lap2['LapTime'].total_seconds()) if pd.notna(lap2['LapTime']) else 0.0
        
        team1 = str(lap1['Team']) if 'Team' in lap1.index and pd.notna(lap1['Team']) else 'Unknown'
        team2 = str(lap2['Team']) if 'Team' in lap2.index and pd.notna(lap2['Team']) else 'Unknown'
        
        result = {
            'driver1Telemetry': driver1_telemetry,
            'driver2Telemetry': driver2_telemetry,
            'driver1Info': {
                'code': driver1.upper(),
                'team': team1,
                'color': get_team_color(driver1)
            },
            'driver2Info': {
                'code': driver2.upper(),
                'team': team2,
                'color': get_team_color(driver2)
            },
            'lapTime1': lap1_time,
            'lapTime2': lap2_time,
            'sector1Time1': sector1_time1,
            'sector2Time1': sector2_time1,
            'sector3Time1': sector3_time1,
            'sector1Time2': sector1_time2,
            'sector2Time2': sector2_time2,
            'sector3Time2': sector3_time2,
            'trackPath': svg_path,
            'viewBox': {
                'minX': 0,
                'minY': 0,
                'width': 1000,
                'height': 1000
            }
        }
        
        api_cache.set(result, *cache_key_parts)
        log_success("/api/animation-optimized", cache_hit=False)
        return result
        
    except Exception as e:
        log_error("/api/animation-optimized", e)
        raise handle_fastf1_error(e, f"Animation: {driver1} vs {driver2}, {year} GP{gp_round} Qualifying")


@app.get("/api/animation-race-full/{year}/{gp_round}/{driver1}/{driver2}")
@limiter.limit("10/minute")
async def get_animation_race_full(request: Request, year: int, gp_round: int, driver1: str, driver2: str):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps1 = session.laps.pick_drivers(driver1)
        laps2 = session.laps.pick_drivers(driver2)
        
        if laps1.empty or laps2.empty:
            raise HTTPException(status_code=404, detail="No laps found for drivers")
        
        # ✅ EXTRACTION DES TEMPS DE SECTEUR (tour le plus rapide de chaque pilote)
        fastest_lap1 = laps1.pick_fastest()
        fastest_lap2 = laps2.pick_fastest()
        
        sector1_time1 = float(fastest_lap1['Sector1Time'].total_seconds()) if pd.notna(fastest_lap1['Sector1Time']) else None
        sector2_time1 = float(fastest_lap1['Sector2Time'].total_seconds()) if pd.notna(fastest_lap1['Sector2Time']) else None
        sector3_time1 = float(fastest_lap1['Sector3Time'].total_seconds()) if pd.notna(fastest_lap1['Sector3Time']) else None
        
        sector1_time2 = float(fastest_lap2['Sector1Time'].total_seconds()) if pd.notna(fastest_lap2['Sector1Time']) else None
        sector2_time2 = float(fastest_lap2['Sector2Time'].total_seconds()) if pd.notna(fastest_lap2['Sector2Time']) else None
        sector3_time2 = float(fastest_lap2['Sector3Time'].total_seconds()) if pd.notna(fastest_lap2['Sector3Time']) else None
        
        all_telemetry_driver1 = []
        all_telemetry_driver2 = []
        cumulative_time1 = 0
        cumulative_time2 = 0
        
        max_laps = min(len(laps1), len(laps2))
        
        for lap_number in range(1, max_laps + 1):
            lap1 = laps1[laps1['LapNumber'] == lap_number].iloc[0] if len(laps1[laps1['LapNumber'] == lap_number]) > 0 else None
            lap2 = laps2[laps2['LapNumber'] == lap_number].iloc[0] if len(laps2[laps2['LapNumber'] == lap_number]) > 0 else None
            
            if lap1 is None or lap2 is None:
                continue
            
            try:
                tel1 = lap1.get_telemetry()
                tel2 = lap2.get_telemetry()
                pos1 = lap1.get_pos_data()
                pos2 = lap2.get_pos_data()
                
                tel1 = tel1.add_distance()
                tel2 = tel2.add_distance()
                
                tel1 = tel1.reset_index(drop=True)
                tel2 = tel2.reset_index(drop=True)
                pos1 = pos1.reset_index(drop=True)
                pos2 = pos2.reset_index(drop=True)
                
                min_points1 = min(len(tel1), len(pos1))
                min_points2 = min(len(tel2), len(pos2))
                
                step1 = max(1, min_points1 // 150)
                step2 = max(1, min_points2 // 150)
                
                for i in range(0, min_points1, step1):
                    if i >= len(tel1) or i >= len(pos1):
                        continue
                    
                    point1 = tel1.iloc[i]
                    pos_point1 = pos1.iloc[i]
                    
                    relative_time = cumulative_time1 + (i / min_points1) * float(lap1['LapTime'].total_seconds() if lap1['LapTime'] is not None else 90)
                    
                    all_telemetry_driver1.append({
                        'lapNumber': int(lap_number),
                        'time': relative_time,
                        'x': float(pos_point1['X']),
                        'y': float(pos_point1['Y']),
                        'speed': float(point1['Speed']) if point1['Speed'] is not None else 0.0,
                        'gear': int(point1['nGear']) if point1['nGear'] is not None else 0,
                        'throttle': float(point1['Throttle']) if point1['Throttle'] is not None else 0.0,
                        'brake': bool(point1['Brake']) if point1['Brake'] is not None else False,
                    })
                
                for i in range(0, min_points2, step2):
                    if i >= len(tel2) or i >= len(pos2):
                        continue
                    
                    point2 = tel2.iloc[i]
                    pos_point2 = pos2.iloc[i]
                    
                    relative_time = cumulative_time2 + (i / min_points2) * float(lap2['LapTime'].total_seconds() if lap2['LapTime'] is not None else 90)
                    
                    all_telemetry_driver2.append({
                        'lapNumber': int(lap_number),
                        'time': relative_time,
                        'x': float(pos_point2['X']),
                        'y': float(pos_point2['Y']),
                        'speed': float(point2['Speed']) if point2['Speed'] is not None else 0.0,
                        'gear': int(point2['nGear']) if point2['nGear'] is not None else 0,
                        'throttle': float(point2['Throttle']) if point2['Throttle'] is not None else 0.0,
                        'brake': bool(point2['Brake']) if point2['Brake'] is not None else False,
                    })
                
                cumulative_time1 += float(lap1['LapTime'].total_seconds() if lap1['LapTime'] is not None else 90)
                cumulative_time2 += float(lap2['LapTime'].total_seconds() if lap2['LapTime'] is not None else 90)
                
            except Exception as e:
                logger.error(f"Error processing lap {lap_number}: {str(e)}")
                continue
        
        max_time = max(
            all_telemetry_driver1[-1]['time'] if all_telemetry_driver1 else 0,
            all_telemetry_driver2[-1]['time'] if all_telemetry_driver2 else 0
        )
        
        animation_data = []
        time_step = 0.2
        
        idx1 = 0
        idx2 = 0
        
        for t in range(0, int(max_time * 5)):
            current_time = t * time_step
            
            while idx1 < len(all_telemetry_driver1) - 1 and all_telemetry_driver1[idx1 + 1]['time'] <= current_time:
                idx1 += 1
            
            while idx2 < len(all_telemetry_driver2) - 1 and all_telemetry_driver2[idx2 + 1]['time'] <= current_time:
                idx2 += 1
            
            if idx1 >= len(all_telemetry_driver1) or idx2 >= len(all_telemetry_driver2):
                break
            
            data1 = all_telemetry_driver1[idx1]
            data2 = all_telemetry_driver2[idx2]
            
            animation_data.append({
                'lapNumber': max(data1['lapNumber'], data2['lapNumber']),
                'time': current_time,
                'driver1': {
                    'x': data1['x'],
                    'y': data1['y'],
                    'speed': data1['speed'],
                    'gear': data1['gear'],
                    'throttle': data1['throttle'],
                    'brake': data1['brake'],
                },
                'driver2': {
                    'x': data2['x'],
                    'y': data2['y'],
                    'speed': data2['speed'],
                    'gear': data2['gear'],
                    'throttle': data2['throttle'],
                    'brake': data2['brake'],
                }
            })
        
        return {
            'animation': animation_data,
            'totalLaps': max_laps,
            'driver1': driver1,
            'driver2': driver2,
            'totalTime': max_time,
            # ✅ NOUVEAUX CHAMPS - TEMPS DE SECTEUR RÉELS
            'sector1Time1': sector1_time1,
            'sector2Time1': sector2_time1,
            'sector3Time1': sector3_time1,
            'sector1Time2': sector1_time2,
            'sector2Time2': sector2_time2,
            'sector3Time2': sector3_time2,
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-data/{year}/{gp_round}")
async def get_race_data(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        
        race_data = []
        max_lap = int(laps['LapNumber'].max())
        
        for lap_num in range(1, max_lap + 1):
            lap_data = laps[laps['LapNumber'] == lap_num]
            
            positions = []
            for _, lap in lap_data.iterrows():
                try:
                    lap_time_value = None
                    if lap['LapTime'] is not None:
                        lap_time_seconds = float(lap['LapTime'].total_seconds())
                        if not math.isnan(lap_time_seconds) and not math.isinf(lap_time_seconds):
                            lap_time_value = lap_time_seconds
                    
                    positions.append({
                        'driver': str(lap['Driver']),
                        'team': str(lap['Team']) if 'Team' in lap else 'Unknown',
                        'position': int(lap['Position']) if lap['Position'] is not None and not math.isnan(lap['Position']) else 99,
                        'lapTime': lap_time_value,
                        'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                        'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None and not math.isnan(lap['TyreLife']) else 0,
                        'stint': int(lap['Stint']) if 'Stint' in lap and not math.isnan(lap['Stint']) else 1,
                        'pitOutTime': bool(lap['PitOutTime']) if 'PitOutTime' in lap and lap['PitOutTime'] is not None else False,
                        'pitInTime': bool(lap['PitInTime']) if 'PitInTime' in lap and lap['PitInTime'] is not None else False,
                    })
                except Exception:
                    continue
            
            positions.sort(key=lambda x: x['position'])
            
            race_data.append({
                'lapNumber': lap_num,
                'positions': positions
            })
        
        return {
            'raceData': race_data,
            'totalLaps': max_lap,
            'circuitName': session.event['EventName'],
            'country': session.event['Country']
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/pit-stops/{year}/{gp_round}")
async def get_pit_stops(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        
        pit_stops = []
        
        for driver in laps['Driver'].unique():
            driver_laps = laps[laps['Driver'] == driver]
            
            for _, lap in driver_laps.iterrows():
                if lap['PitOutTime'] is not None:
                    try:
                        pit_duration = None
                        if lap['PitInTime'] is not None and lap['PitOutTime'] is not None:
                            duration_seconds = float((lap['PitOutTime'] - lap['PitInTime']).total_seconds())
                            if not math.isnan(duration_seconds) and not math.isinf(duration_seconds):
                                pit_duration = duration_seconds
                        
                        pit_stops.append({
                            'driver': str(lap['Driver']),
                            'team': str(lap['Team']) if 'Team' in lap else 'Unknown',
                            'lap': int(lap['LapNumber']),
                            'duration': pit_duration,
                            'compound': str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN',
                            'tyreLife': int(lap['TyreLife']) if lap['TyreLife'] is not None else 0,
                            'stint': int(lap['Stint']) if 'Stint' in lap else 1,
                        })
                    except Exception:
                        continue
        
        pit_stops.sort(key=lambda x: x['lap'])
        
        return {'pitStops': pit_stops}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/race-events/{year}/{gp_round}")
async def get_race_events(year: int, gp_round: int):
    try:

        
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        events = []
        
        if hasattr(session, 'laps') and session.laps is not None:
            laps = session.laps
            
            for lap_num in range(2, int(laps['LapNumber'].max()) + 1):
                prev_lap = laps[laps['LapNumber'] == lap_num - 1]
                curr_lap = laps[laps['LapNumber'] == lap_num]
                
                if not prev_lap.empty and not curr_lap.empty:
                    prev_leader = prev_lap[prev_lap['Position'] == 1]
                    curr_leader = curr_lap[curr_lap['Position'] == 1]
                    
                    if not prev_leader.empty and not curr_leader.empty:
                        prev_driver = prev_leader.iloc[0]['Driver']
                        curr_driver = curr_leader.iloc[0]['Driver']
                        
                        if prev_driver != curr_driver:
                            events.append({
                                'lap': lap_num,
                                'type': 'LEAD_CHANGE',
                                'description': f'{curr_driver} takes the lead from {prev_driver}',
                                'driver': str(curr_driver),
                                'severity': 'high'
                            })
            
            max_lap = int(laps['LapNumber'].max())
            for driver in laps['Driver'].unique():
                driver_laps = laps[laps['Driver'] == driver]
                last_lap = int(driver_laps['LapNumber'].max())
                
                if last_lap < max_lap - 2:
                    events.append({
                        'lap': last_lap,
                        'type': 'DNF',
                        'description': f'{driver} retired from the race',
                        'driver': str(driver),
                        'severity': 'critical'
                    })
            
            fastest_laps_by_lap = {}
            for lap_num in range(1, int(laps['LapNumber'].max()) + 1):
                lap_data = laps[laps['LapNumber'] == lap_num]
                valid_laps = lap_data[lap_data['LapTime'].notna()]
                
                if not valid_laps.empty:
                    fastest = valid_laps.loc[valid_laps['LapTime'].idxmin()]
                    fastest_laps_by_lap[lap_num] = {
                        'driver': str(fastest['Driver']),
                        'time': float(fastest['LapTime'].total_seconds())
                    }
            
            if fastest_laps_by_lap:
                overall_fastest_lap = min(fastest_laps_by_lap.items(), key=lambda x: x[1]['time'])
                events.append({
                    'lap': overall_fastest_lap[0],
                    'type': 'FASTEST_LAP',
                    'description': f'{overall_fastest_lap[1]["driver"]} sets fastest lap: {overall_fastest_lap[1]["time"]:.3f}s',
                    'driver': overall_fastest_lap[1]['driver'],
                    'severity': 'info'
                })
            
            for lap_num in range(2, int(laps['LapNumber'].max()) + 1):
                prev_lap = laps[laps['LapNumber'] == lap_num - 1]
                curr_lap = laps[laps['LapNumber'] == lap_num]
                
                for driver in laps['Driver'].unique():
                    prev_pos = prev_lap[prev_lap['Driver'] == driver]
                    curr_pos = curr_lap[curr_lap['Driver'] == driver]
                    
                    if not prev_pos.empty and not curr_pos.empty:
                        prev_position = prev_pos.iloc[0]['Position']
                        curr_position = curr_pos.iloc[0]['Position']
                        
                        if not math.isnan(prev_position) and not math.isnan(curr_position):
                            prev_position = int(prev_position)
                            curr_position = int(curr_position)
                            
                            if prev_position - curr_position >= 3:
                                events.append({
                                    'lap': lap_num,
                                    'type': 'OVERTAKE',
                                    'description': f'{driver} gains {prev_position - curr_position} positions (P{prev_position} → P{curr_position})',
                                    'driver': str(driver),
                                    'severity': 'medium'
                                })
        
        events.sort(key=lambda x: x['lap'])
        
        return {'events': events}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/position-evolution/{year}/{gp_round}")
async def get_position_evolution(year: int, gp_round: int):
    try:

        
        # Load race session
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        max_lap = int(laps['LapNumber'].max())
        
        # ✅ Get ALL drivers who participated in the race with their teams
        all_drivers = laps['Driver'].unique().tolist()
        
        # Get driver to team mapping
        driver_teams = {}
        for driver in all_drivers:
            driver_laps = laps[laps['Driver'] == driver]
            if not driver_laps.empty:
                driver_teams[str(driver)] = str(driver_laps.iloc[0]['Team'])
        
        evolution_data = []
        
        for lap_num in range(1, max_lap + 1):
            lap_data = laps[laps['LapNumber'] == lap_num]
            lap_positions = {'lap': lap_num}
            
            # Include all drivers for this lap
            for driver in all_drivers:
                driver_lap = lap_data[lap_data['Driver'] == driver]
                if not driver_lap.empty:
                    position = driver_lap.iloc[0]['Position']
                    if not math.isnan(position):
                        lap_positions[str(driver)] = int(position)
            
            evolution_data.append(lap_positions)
        
        return {
            'evolution': evolution_data,
            'drivers': [str(d) for d in all_drivers],
            'teams': driver_teams
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/strategy-comparison/{year}/{gp_round}")
async def get_strategy_comparison(year: int, gp_round: int):
    try:
        session = fastf1.get_session(year, gp_round, 'R')
        await asyncio.to_thread(session.load)
        
        laps = session.laps
        strategies = []
        
        for driver in laps['Driver'].unique():
            driver_laps = laps[laps['Driver'] == driver]
            stints = []
            
            current_stint = None
            for _, lap in driver_laps.iterrows():
                stint_num = int(lap['Stint']) if 'Stint' in lap and lap['Stint'] is not None else 1
                compound = str(lap['Compound']) if 'Compound' in lap else 'UNKNOWN'
                
                if current_stint is None or current_stint['stint'] != stint_num:
                    if current_stint is not None:
                        stints.append(current_stint)
                    
                    current_stint = {
                        'stint': stint_num,
                        'compound': compound,
                        'startLap': int(lap['LapNumber']),
                        'laps': 0
                    }
                
                current_stint['laps'] += 1
            
            if current_stint is not None:
                stints.append(current_stint)
            
            strategies.append({
                'driver': str(driver),
                'team': str(driver_laps.iloc[0]['Team']) if 'Team' in driver_laps.iloc[0] else 'Unknown',
                'stints': stints,
                'totalStops': len(stints) - 1
            })
        
        return {'strategies': strategies}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/drivers")
async def get_driver_standings(year: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/driverStandings.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        standings_list = data['MRData']['StandingsTable']['StandingsLists']
        
        if not standings_list:
            return {'standings': []}
        
        drivers = standings_list[-1]['DriverStandings']
        
        standings = []
        for driver in drivers:
            standings.append({
                'position': int(driver['position']),
                'driver': f"{driver['Driver']['givenName']} {driver['Driver']['familyName']}",
                'code': driver['Driver']['code'] if 'code' in driver['Driver'] else driver['Driver']['familyName'][:3].upper(),
                'team': driver['Constructors'][0]['name'],
                'points': float(driver['points']),
                'wins': int(driver['wins'])
            })
        
        return {'standings': standings}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/constructors")
async def get_constructor_standings(year: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/constructorStandings.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        standings_list = data['MRData']['StandingsTable']['StandingsLists']
        
        if not standings_list:
            return {'standings': []}
        
        constructors = standings_list[-1]['ConstructorStandings']
        
        standings = []
        for constructor in constructors:
            standings.append({
                'position': int(constructor['position']),
                'team': constructor['Constructor']['name'],
                'points': float(constructor['points']),
                'wins': int(constructor['wins'])
            })
        
        return {'standings': standings}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/{gp_round}/results")
async def get_race_results(year: int, gp_round: int):
    try:
        url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/results.json"
        response = requests.get(url, timeout=10)
        data = response.json()
        
        races = data['MRData']['RaceTable']['Races']
        
        if not races:
            return {'results': []}
        
        results_data = races[0]['Results']
        
        results = []
        for result in results_data:
            lap_time = None
            if 'Time' in result:
                lap_time = result['Time']['time']
            
            results.append({
                'position': int(result['position']),
                'driver': f"{result['Driver']['givenName']} {result['Driver']['familyName']}",
                'code': result['Driver']['code'] if 'code' in result['Driver'] else result['Driver']['familyName'][:3].upper(),
                'team': result['Constructor']['name'],
                'grid': int(result['grid']),
                'points': float(result['points']),
                'status': result['status'],
                'time': lap_time
            })
        
        return {
            'results': results,
            'raceName': races[0]['raceName'],
            'circuitName': races[0]['Circuit']['circuitName'],
            'date': races[0]['date']
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/championship/{year}/{gp_round}/standings")
async def get_standings_after_race(year: int, gp_round: int):
    try:
        driver_url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/driverStandings.json"
        constructor_url = f"http://api.jolpi.ca/ergast/f1/{year}/{gp_round}/constructorStandings.json"
        
        driver_response = requests.get(driver_url, timeout=10)
        constructor_response = requests.get(constructor_url, timeout=10)
        
        driver_data = driver_response.json()
        constructor_data = constructor_response.json()
        
        driver_standings_list = driver_data['MRData']['StandingsTable']['StandingsLists']
        constructor_standings_list = constructor_data['MRData']['StandingsTable']['StandingsLists']
        
        drivers = []
        constructors = []
        
        if driver_standings_list:
            for driver in driver_standings_list[0]['DriverStandings']:
                drivers.append({
                    'position': int(driver['position']),
                    'driver': f"{driver['Driver']['givenName']} {driver['Driver']['familyName']}",
                    'code': driver['Driver']['code'] if 'code' in driver['Driver'] else driver['Driver']['familyName'][:3].upper(),
                    'team': driver['Constructors'][0]['name'],
                    'points': float(driver['points']),
                    'wins': int(driver['wins'])
                })
        
        if constructor_standings_list:
            for constructor in constructor_standings_list[0]['ConstructorStandings']:
                constructors.append({
                    'position': int(constructor['position']),
                    'team': constructor['Constructor']['name'],
                    'points': float(constructor['points']),
                    'wins': int(constructor['wins'])
                })
        
        return {
            'drivers': drivers,
            'constructors': constructors
        }
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/circuits/{year}")
async def get_circuits(year: int):
    try:
        schedule = fastf1.get_event_schedule(year)
        circuits = []
        
        for _, event in schedule.iterrows():
            circuits.append({
                'round': int(event['RoundNumber']),
                'name': str(event['EventName']),
                'location': str(event['Location']),
                'country': str(event['Country']),
                'date': str(event['EventDate'].date()) if 'EventDate' in event else None,
            })
        
        return {'circuits': circuits}
    except Exception as e:

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/racing-line/{year}/{gp_round}/{session_type}/{driver}")
async def get_racing_line(year: int, gp_round: int, session_type: str, driver: str):
    try:
        # Charger la session
        session = fastf1.get_session(year, gp_round, session_type)
        await asyncio.to_thread(session.load)
        
        # Récupérer le pilote
        driver_laps = session.laps.pick_driver(driver)
        
        if driver_laps.empty:
            raise HTTPException(status_code=404, detail=f"No data for driver {driver}")
        
        # Prendre le meilleur tour
        fastest_lap = driver_laps.pick_fastest()
        
        # Récupérer la télémétrie avec positions GPS
        telemetry = fastest_lap.get_telemetry()
        
        if telemetry.empty:
            raise HTTPException(status_code=404, detail="No telemetry data available")
        
        # Extraire les données GPS
        gps_data = []
        for idx, row in telemetry.iterrows():
            gps_data.append({
                "x": float(row['X']) if pd.notna(row['X']) else 0,
                "y": float(row['Y']) if pd.notna(row['Y']) else 0,
                "speed": float(row['Speed']) if pd.notna(row['Speed']) else 0,
                "distance": float(row['Distance']) if pd.notna(row['Distance']) else 0
            })
        
        # Infos du tour
        lap_info = {
            "driver": driver,
            "lap_time": str(fastest_lap['LapTime']),
            "lap_number": int(fastest_lap['LapNumber']),
            "compound": fastest_lap['Compound']
        }
        
        return {
            "lap_info": lap_info,
            "gps_data": gps_data,
            "total_points": len(gps_data)
        }
        
    except Exception as e:
        logger.error(f"Error in racing line: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------
@app.get("/api/admin/ingestion-status")
async def admin_ingestion_status(request: Request, year: int, round: int):
    import os
    secret = request.headers.get("X-Admin-Secret", "")
    if secret != os.getenv("ADMIN_SECRET", ""):
        raise HTTPException(status_code=403, detail="Forbidden")

    sessions = ["SQ", "S", "Q", "R"]
    result = {}
    for s in sessions:
        row = db._execute(
            "SELECT COUNT(*) FROM laps WHERE year=%s AND gp_round=%s AND session_type=%s",
            (year, round, s), fetch="one"
        )
        tel_row = db._execute(
            "SELECT COUNT(*) FROM telemetry WHERE year=%s AND gp_round=%s AND session_type=%s",
            (year, round, s), fetch="one"
        )
        result[s] = {"laps": row[0] if row else 0, "telemetry": tel_row[0] if tel_row else 0}
    return result


@app.post("/api/admin/reingest")
async def admin_reingest(request: Request):
    import os
    secret = request.headers.get("X-Admin-Secret", "")
    if secret != os.getenv("ADMIN_SECRET", ""):
        raise HTTPException(status_code=403, detail="Forbidden")

    body = await request.json()
    year = int(body["year"])
    gp_round = int(body["round"])
    session_type = str(body["session"])

    from jobs.ingest_session import ingest
    try:
        ingest(year, gp_round, session_type)
        return {"status": "ok", "message": f"Ingested {year} R{gp_round} {session_type}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
