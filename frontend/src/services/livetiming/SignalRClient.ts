/**
 * METRIK DELTA - SignalR Client
 * Points to our backend WebSocket relay.
 * The backend handles F1 SignalR negotiation + subscription server-side (no CORS).
 */

import { getBackendUrl } from '../../config';

export class SignalRClient {
  /**
   * Returns the backend WebSocket relay URL.
   * No negotiation needed — the backend does it server-side.
   */
  static getWebSocketUrl(): string {
    const backendUrl = getBackendUrl();
    return backendUrl
      .replace('https://', 'wss://')
      .replace('http://', 'ws://')
      + '/api/livetiming/ws';
  }
}
