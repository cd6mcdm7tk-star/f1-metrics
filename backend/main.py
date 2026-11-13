"""METRIK DELTA API: F1 telemetry and season statistics for metrikdelta.com.

Data sources: PostgreSQL for ingested sessions (jobs/), OpenF1 for the
current season, FastF1 for past seasons, Jolpica for results and standings."""
import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

import fastf1  # noqa: E402
from fastapi import FastAPI  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from fastapi.middleware.gzip import GZipMiddleware  # noqa: E402
from slowapi import _rate_limit_exceeded_handler  # noqa: E402
from slowapi.errors import RateLimitExceeded  # noqa: E402

from app.cache import redis_cache  # noqa: E402
from app.limiter import limiter  # noqa: E402
from app.routes import admin, feedback, laps, season, sessions, telemetry  # noqa: E402
from app.season import prewarm_seasons  # noqa: E402
from database import db  # noqa: E402

os.makedirs("cache", exist_ok=True)  # FastF1 refuses a missing cache directory
fastf1.Cache.enable_cache("cache")

app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://metrikdelta.com",
        "https://www.metrikdelta.com",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

for module in (sessions, telemetry, laps, season, feedback, admin):
    app.include_router(module.router)


@app.on_event("startup")
async def startup_event():
    if db.available:
        await asyncio.to_thread(db.create_tables)
        print("PostgreSQL tables ready", flush=True)
    else:
        print("PostgreSQL not available, serving live data only", flush=True)

    # Production only: locally the in-memory cache resets on every reload, and
    # each prewarm would spend ~30 requests of Jolpica's hourly quota.
    if redis_cache.client:
        app.state.season_prewarm = asyncio.create_task(prewarm_seasons())


@app.get("/")
async def root():
    return {"name": "METRIK DELTA API", "status": "online"}


@app.get("/health")
async def health():
    return {"status": "healthy"}
