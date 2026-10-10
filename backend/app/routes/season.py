import datetime
import logging

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import Response

from app.limiter import limiter
from app.season import get_season_payload, season_is_closed

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/season/{year}")
@limiter.limit("30/minute")
async def get_season(request: Request, year: int):
    if year < 1950 or year > datetime.date.today().year:
        raise HTTPException(status_code=404, detail=f"No season {year}")
    try:
        payload = await get_season_payload(year)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Season bundle failed for {year}: {e}")
        raise HTTPException(status_code=502, detail="Season data source unavailable")
    return Response(
        content=payload,
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={86400 if season_is_closed(year) else 300}"},
    )
