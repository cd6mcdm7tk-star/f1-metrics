import datetime
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import Response

from app.access import current_season, season_access
from app.limiter import limiter
from app.season import get_season_payload, season_is_closed

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


@router.get("/season/{year}", dependencies=[Depends(season_access)])
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
        # The current season is for subscribers: kept by the browser, never by a shared cache
        headers={"Cache-Control": "public, max-age=86400" if season_is_closed(year)
                 else "private, max-age=300" if year >= current_season() else "public, max-age=300"},
    )
