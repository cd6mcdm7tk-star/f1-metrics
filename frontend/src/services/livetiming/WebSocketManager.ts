/**
 * METRIK DELTA - WebSocket Manager
 * Architecture: Browser → backend /negotiate → F1 token
 *               Browser ══WS══════════════════▶ F1 SignalR direct
 *
 * The browser connects directly to F1's SignalR WebSocket.
 * This avoids all Python WebSocket library issues (Transfer-Encoding, etc.)
 * and matches how sites like f1telemetry.com work.
 */

import pako from 'pako';

const F1_WS_BASE = 'wss://livetiming.formula1.com/signalr';
const F1_CONNECTION_DATA = encodeURIComponent(JSON.stringify([{ name: 'Streaming' }]));

const F1_TOPICS = [
  'Heartbeat', 'CarData.z', 'Position.z', 'ExtrapolatedClock',
  'TopThree', 'TimingStats', 'TimingAppData', 'WeatherData',
  'TrackStatus', 'DriverList', 'RaceControlMessages', 'SessionInfo',
  'SessionData', 'LapCount', 'TimingData', 'TyreStintSeries',
  'PitStopSeries', 'TeamRadio',
];

export interface SignalRFeedMessage {
  H: string;
  M: string;
  A: any[];
}

export interface WebSocketData {
  R?: Record<string, any>;
  M?: SignalRFeedMessage[];
}

export class WebSocketManager {
  private ws:               WebSocket | null = null;
  private negotiateUrl:     string = '';
  private onDataCallback:   ((data: WebSocketData) => void) | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnect   = 8;
  private readonly reconnectDelay = 3000;

  connect(negotiateUrl: string, onData: (data: WebSocketData) => void) {
    this.negotiateUrl   = negotiateUrl;
    this.onDataCallback = onData;
    this._negotiate();
  }

  // ── Step 1: get F1 connection token from our backend proxy ────────────────

  private async _negotiate() {
    try {
      const resp = await fetch(this.negotiateUrl);
      if (!resp.ok) throw new Error(`Negotiate HTTP ${resp.status}`);
      const data  = await resp.json();
      const token = data.ConnectionToken;
      if (!token) throw new Error('No ConnectionToken in negotiate response');

      const f1Url = `${F1_WS_BASE}/connect` +
        `?transport=webSockets` +
        `&connectionToken=${encodeURIComponent(token)}` +
        `&connectionData=${F1_CONNECTION_DATA}` +
        `&clientProtocol=1.5`;

      this._open(f1Url);
    } catch (err) {
      console.warn('[METRIK] Negotiate failed:', err);
      this._scheduleReconnect();
    }
  }

  // ── Step 2: open native WebSocket directly to F1 ─────────────────────────

  private _open(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ METRIK DELTA — F1 SignalR connected (direct)');
      this.reconnectAttempts = 0;
      // Subscribe to all telemetry topics
      this.ws!.send(JSON.stringify({
        H: 'Streaming',
        M: 'Subscribe',
        A: [F1_TOPICS],
        I: 1,
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const text = typeof event.data === 'string' ? event.data : '';
        if (!text) return;

        const raw = JSON.parse(text);
        const out: WebSocketData = {};

        // ── Initial state snapshot ─────────────────────────────────────
        if (raw.R && typeof raw.R === 'object') {
          out.R = this._decompressObject(raw.R);
        }

        // ── Incremental feed ───────────────────────────────────────────
        if (Array.isArray(raw.M) && raw.M.length > 0) {
          out.M = raw.M as SignalRFeedMessage[];
        }

        if (out.R || out.M) {
          this.onDataCallback?.(out);
        }
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 F1 SignalR disconnected');
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      console.error('❌ F1 SignalR WebSocket error');
    };
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Decompress every .z key in the R snapshot object. */
  private _decompressObject(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('.z') && typeof value === 'string') {
        const decompressed = WebSocketManager.decompress(value);
        if (decompressed !== null) out[key.slice(0, -2)] = decompressed;
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  /** Decompress a .z base64 string.
   *  F1 uses raw deflate (no zlib header) → inflateRaw, not inflate. */
  static decompress(value: string): any {
    try {
      const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
      return JSON.parse(pako.inflateRaw(bytes, { to: 'string' }));
    } catch (e) {
      console.warn('[METRIK] decompress failed:', e instanceof Error ? e.message : e);
      return null;
    }
  }

  private _scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnect) {
      console.error('[METRIK] Max reconnect attempts reached');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnect})`);
    setTimeout(() => this._negotiate(), delay);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }
}
