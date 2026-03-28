/**
 * METRIK DELTA - WebSocket Manager
 * Connects to our backend relay, parses raw SignalR messages,
 * decompresses .z payloads, and forwards structured data upstream.
 */

import pako from 'pako';

export interface SignalRFeedMessage {
  H: string;   // "Streaming"
  M: string;   // "feed"
  A: any[];    // [data, timestamp?] or ["Topic.z", compressed, timestamp?]
}

export interface WebSocketData {
  /** Initial snapshot — keys are topic names, values are data (already decompressed). */
  R?: Record<string, any>;
  /** Incremental feed messages. */
  M?: SignalRFeedMessage[];
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private onDataCallback: ((data: WebSocketData) => void) | null = null;
  private reconnectAttempts = 0;
  private readonly maxReconnect = 5;
  private readonly reconnectDelay = 3000;

  connect(url: string, onData: (data: WebSocketData) => void) {
    this.onDataCallback = onData;
    this._open(url);
  }

  private _open(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ METRIK DELTA — WebSocket relay connected');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const text = typeof event.data === 'string'
          ? event.data
          : '';
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
      console.log('🔌 WebSocket relay disconnected');
      this._scheduleReconnect(url);
    };

    this.ws.onerror = () => {
      console.error('❌ WebSocket relay error');
    };
  }

  /** Decompress every .z key in an object (R snapshot). */
  private _decompressObject(obj: Record<string, any>): Record<string, any> {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.endsWith('.z') && typeof value === 'string') {
        const decompressed = WebSocketManager.decompress(value);
        if (decompressed !== null) {
          out[key.slice(0, -2)] = decompressed;
        }
        // If decompression fails, skip the key entirely (don't pass corrupt data)
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  /** Decompress a single .z string (M feed).
   *  F1 uses raw deflate (no zlib header) — must use inflateRaw, not inflate. */
  static decompress(value: string): any {
    try {
      const bytes = Uint8Array.from(atob(value), c => c.charCodeAt(0));
      return JSON.parse(pako.inflateRaw(bytes, { to: 'string' }));
    } catch {
      return null;
    }
  }

  private _scheduleReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnect) return;
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay}ms (${this.reconnectAttempts}/${this.maxReconnect})`);
    setTimeout(() => this._open(url), delay);
  }

  disconnect() {
    this.ws?.close();
    this.ws = null;
  }

  send(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
}
