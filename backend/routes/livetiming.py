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
F1_HEADERS = {"User-Agent": "BestHTTP"}

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
        logger.error(f"❌ Live timing relay error: {e}")
        try:
            await websocket.send_text(json.dumps({"error": str(e)}))
        except Exception:
            pass

    logger.info("🔌 Live timing relay closed")
