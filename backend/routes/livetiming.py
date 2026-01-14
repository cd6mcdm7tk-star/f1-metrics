# backend/routes/livetiming.py
"""
METRIK DELTA - F1 Live Timing Proxy
Proxies requests to F1 SignalR to avoid CORS issues
"""

from fastapi import APIRouter, HTTPException
import httpx
import logging

router = APIRouter(prefix="/api/livetiming", tags=["livetiming"])
logger = logging.getLogger(__name__)

F1_BASE_URL = "https://livetiming.formula1.com/signalr"


@router.get("/negotiate")
async def negotiate_f1_connection():
    """
    Negotiate F1 SignalR connection
    Returns: ConnectionToken, ConnectionId, etc.
    """
    try:
        connection_data = '[{"name":"Streaming"}]'
        
        url = f"{F1_BASE_URL}/negotiate"
        params = {
            "connectionData": connection_data,
            "clientProtocol": "1.5"
        }
        
        logger.info(f"🔄 Negotiating F1 SignalR connection...")
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"✅ F1 negotiation successful: {data.get('ConnectionId')}")
            
            return data
            
    except httpx.HTTPError as e:
        logger.error(f"❌ F1 negotiation failed: {e}")
        raise HTTPException(status_code=503, detail=f"F1 API error: {str(e)}")
    except Exception as e:
        logger.error(f"❌ Unexpected error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")


@router.get("/status")
async def check_f1_status():
    """
    Check if F1 Live Timing API is available
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{F1_BASE_URL}/negotiate")
            return {
                "status": "online" if response.status_code == 200 else "offline",
                "status_code": response.status_code
            }
    except Exception as e:
        return {
            "status": "offline",
            "error": str(e)
        }