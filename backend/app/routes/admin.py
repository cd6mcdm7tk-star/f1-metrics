"""Ingestion checks and manual re-ingestion, behind the X-Admin-Secret header."""
import asyncio
import hmac
import os

from fastapi import APIRouter, Depends, HTTPException, Request

from database import db


def is_admin(request: Request) -> bool:
    expected = os.getenv("ADMIN_SECRET", "")
    given = request.headers.get("X-Admin-Secret", "")
    # An unset secret must lock, not open to an empty header
    return bool(expected) and hmac.compare_digest(given, expected)


def require_admin(request: Request):
    if not is_admin(request):
        raise HTTPException(status_code=403, detail="Forbidden")


router = APIRouter(prefix="/api/admin", dependencies=[Depends(require_admin)])


@router.get("/ingestion-status")
async def ingestion_status(year: int, round: int):
    return {
        s: await asyncio.to_thread(db.count_ingested, year, round, s)
        for s in ("SQ", "S", "Q", "R")
    }


@router.get("/feedback")
async def feedback(limit: int = 50):
    """The latest messages sent from the site's Feedback panel."""
    return await asyncio.to_thread(db.list_feedback, min(max(limit, 1), 500))


@router.post("/reingest")
async def reingest(request: Request):
    body = await request.json()
    year = int(body["year"])
    gp_round = int(body["round"])
    session_type = str(body["session"])

    from jobs.ingest_session import ingest
    try:
        # In a thread: an ingestion takes minutes and would block every other request
        await asyncio.to_thread(ingest, year, gp_round, session_type)
        return {"status": "ok", "message": f"Ingested {year} R{gp_round} {session_type}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
