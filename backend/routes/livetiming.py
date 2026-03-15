# backend/routes/livetiming.py
"""
METRIK DELTA - F1 Live Timing Proxy
====================================
- /negotiate : HTTP proxy for F1 SignalR negotiation
- /ws        : WebSocket relay — backend connects to F1 SignalR (no CORS),
               forwards all messages to the browser client.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
import httpx
import websockets
import asyncio
import json
import logging
import urllib.parse

router = APIRouter(prefix="/api/livetiming", tags=["livetiming"])
logger = logging.getLogger(__name__)

F1_HTTP  = "https://livetiming.formula1.com/signalr"
F1_WS    = "wss://livetiming.formula1.com/signalr"
F1_HEADERS = {
    "User-Agent": "BestHTTP",
    "Accept-Encoding": "gzip, identity",
}

F1_TOPICS = [
    "Heartbeat", "CarData.z", "Position.z", "ExtrapolatedClock",
    "TopThree", "TimingStats", "TimingAppData", "WeatherData",
    "TrackStatus", "DriverList", "RaceControlMessages", "SessionInfo",
    "SessionData", "LapCount", "TimingData", "TyreStintSeries",
    "PitStopSeries", "TeamRadio",
]


# ---------------------------------------------------------------------------
# HTTP endpoints
# ---------------------------------------------------------------------------

@router.get("/negotiate")
async def negotiate_f1_connection():
    """Legacy HTTP negotiate — kept for compatibility."""
    try:
        connection_data = '[{"name":"Streaming"}]'
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{F1_HTTP}/negotiate",
                params={"connectionData": connection_data, "clientProtocol": "1.5"},
                headers=F1_HEADERS,
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"F1 API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



# Simple in-process cache for circuit map data
_circuit_map_cache: dict = {}

@router.get("/circuit-map")
async def get_circuit_map(circuit_short_name: str = "", session_key: int = 0):
    """
    Fetch track outline coordinates from OpenF1 API.
    Accepts either a session_key directly or a circuit_short_name to look up the latest session.
    Results are cached in memory for the lifetime of the process.
    """
    cache_key = f"{circuit_short_name}:{session_key}"
    if cache_key in _circuit_map_cache:
        return _circuit_map_cache[cache_key]

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            # Resolve session_key if not provided
            resolved_key = session_key
            if not resolved_key and circuit_short_name:
                sessions_resp = await client.get(
                    "https://api.openf1.org/v1/sessions",
                    params={"circuit_short_name": circuit_short_name, "year": 2026},
                )
                sessions_resp.raise_for_status()
                sessions = sessions_resp.json()
                if not sessions:
                    raise HTTPException(status_code=404, detail="No sessions found for this circuit")
                # Take the most recent session
                resolved_key = sessions[-1].get("session_key")

            if not resolved_key:
                raise HTTPException(status_code=404, detail="No session_key available")

            # Fetch location data for driver_number=1
            loc_resp = await client.get(
                "https://api.openf1.org/v1/location",
                params={"session_key": resolved_key, "driver_number": 1},
            )
            loc_resp.raise_for_status()
            points_raw = loc_resp.json()

        if not points_raw:
            raise HTTPException(status_code=404, detail="No location data for this session")

        # Downsample to ~400 points
        total = len(points_raw)
        step = max(1, total // 400)
        points = [{"x": p["x"], "y": p["y"]} for p in points_raw[::step]]

        result = {"points": points, "session_key": resolved_key}
        _circuit_map_cache[cache_key] = result
        return result

    except HTTPException:
        raise
    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"OpenF1 API error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def check_f1_status():
    """Check if F1 Live Timing API is reachable."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"{F1_HTTP}/negotiate",
                params={"connectionData": '[{"name":"Streaming"}]', "clientProtocol": "1.5"},
                headers=F1_HEADERS,
            )
            return {"status": "online" if response.status_code == 200 else "offline"}
    except Exception as e:
        return {"status": "offline", "error": str(e)}


# ---------------------------------------------------------------------------
# WebSocket relay
# ---------------------------------------------------------------------------

@router.websocket("/ws")
async def livetiming_ws_relay(websocket: WebSocket):
    """
    Relay F1 SignalR WebSocket to the browser.

    Flow:
      1. Accept browser connection
      2. Negotiate with F1 SignalR (HTTP, server-side — no CORS)
      3. Open WebSocket to F1 SignalR
      4. Subscribe to all telemetry topics
      5. Bidirectional relay until either side disconnects
    """
    await websocket.accept()
    logger.info("🔌 Client connected to live timing relay")

    try:
        # ── Step 1 : negotiate ────────────────────────────────────────────
        connection_data = '[{"name":"Streaming"}]'
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{F1_HTTP}/negotiate",
                params={"connectionData": connection_data, "clientProtocol": "1.5"},
                headers=F1_HEADERS,
            )
            resp.raise_for_status()
            neg = resp.json()

        token = neg["ConnectionToken"]
        logger.info(f"✅ F1 negotiation OK  id={neg.get('ConnectionId')}")

        # ── Step 2 : build F1 WebSocket URL ──────────────────────────────
        qs = urllib.parse.urlencode({
            "transport":      "webSockets",
            "connectionToken": token,
            "connectionData":  connection_data,
            "clientProtocol": "1.5",
        })
        f1_url = f"{F1_WS}/connect?{qs}"

        # ── Step 3 : open F1 WebSocket ────────────────────────────────────
        async with websockets.connect(
            f1_url,
            additional_headers=F1_HEADERS,
            ping_interval=None,
            open_timeout=30,
        ) as f1_ws:
            logger.info("✅ Connected to F1 SignalR WebSocket")

            # ── Step 4 : subscribe ────────────────────────────────────────
            await f1_ws.send(json.dumps({
                "H": "Streaming",
                "M": "Subscribe",
                "A": [F1_TOPICS],
                "I": 1,
            }))
            logger.info(f"✅ Subscribed to {len(F1_TOPICS)} F1 topics")

            # ── Step 5 : relay ────────────────────────────────────────────
            async def f1_to_client():
                try:
                    async for msg in f1_ws:
                        text = msg.decode("utf-8") if isinstance(msg, bytes) else msg
                        await websocket.send_text(text)
                except Exception as e:
                    logger.debug(f"F1→client relay ended: {e}")

            async def client_to_f1():
                try:
                    while True:
                        data = await websocket.receive_text()
                        await f1_ws.send(data)
                except WebSocketDisconnect:
                    pass
                except Exception as e:
                    logger.debug(f"Client→F1 relay ended: {e}")

            tasks = [
                asyncio.create_task(f1_to_client()),
                asyncio.create_task(client_to_f1()),
            ]
            _done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
            for t in pending:
                t.cancel()
                try:
                    await t
                except asyncio.CancelledError:
                    pass

    except WebSocketDisconnect:
        logger.info("🔌 Client disconnected from live timing relay")
    except Exception as e:
        logger.error(f"❌ Live timing relay error: {type(e).__name__}: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass

    logger.info("🔌 Live timing relay closed")
