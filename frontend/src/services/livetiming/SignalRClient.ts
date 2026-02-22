/**
 * METRIK DELTA - SignalR Client
 * Handles F1 SignalR negotiation and WebSocket connection via backend proxy
 */

import { getBackendUrl } from '../../config';

export interface NegotiationResponse {
  ConnectionToken: string;
  ConnectionId: string;
  Url: string;
  ProtocolVersion: string;
  TryWebSockets: boolean;
}

export class SignalRClient {
  private static readonly F1_BASE_URL = 'https://livetiming.formula1.com/signalr';
  private static readonly HUB_NAME = 'Streaming';

  /**
   * Negotiate connection with F1 SignalR via backend proxy
   */
  static async negotiate(): Promise<NegotiationResponse> {
    const backendUrl = getBackendUrl();
    const url = `${backendUrl}/api/livetiming/negotiate`;

    console.log('🔄 METRIK DELTA - Negotiating via backend proxy...');
    console.log('📡 Backend URL:', backendUrl);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Negotiation failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Negotiation successful:', data.ConnectionId);
      
      return data as NegotiationResponse;
    } catch (error) {
      console.error('❌ Negotiation error:', error);
      throw error;
    }
  }

  /**
   * Build WebSocket URL from negotiation response
   * Note: WebSocket connection is DIRECT to F1 (not proxied)
   */
  static buildWebSocketUrl(negotiation: NegotiationResponse): string {
    const connectionData = encodeURIComponent(
      JSON.stringify([{ name: this.HUB_NAME }])
    );

    const params = new URLSearchParams({
      transport: 'webSockets',
      connectionToken: negotiation.ConnectionToken,
      connectionData: connectionData,
      clientProtocol: '1.5',
    });

    return `wss://livetiming.formula1.com/signalr/connect?${params.toString()}`;
  }

  /**
   * Create subscribe message for F1 topics
   */
  static createSubscribeMessage(topics: string[]): any {
    return {
      H: this.HUB_NAME,
      M: 'Subscribe',
      A: [topics],
      I: 1,
    };
  }

  /**
   * Default topics to subscribe to
   */
  static getDefaultTopics(): string[] {
    return [
      'Heartbeat',
      'CarData.z',
      'Position.z',
      'ExtrapolatedClock',
      'TopThree',
      'TimingStats',
      'TimingAppData',
      'WeatherData',
      'TrackStatus',
      'DriverList',
      'RaceControlMessages',
      'SessionInfo',
      'SessionData',
      'LapCount',
      'TimingData',
      'TyreStintSeries',
      'PitStopSeries',
      'TeamRadio',
    ];
  }

  /**
   * Complete connection flow: negotiate + connect
   */
  static async connect(): Promise<{ url: string; subscribeMessage: any }> {
    // Step 1: Negotiate
    const negotiation = await this.negotiate();

    // Step 2: Build WebSocket URL
    const wsUrl = this.buildWebSocketUrl(negotiation);

    // Step 3: Prepare subscribe message
    const subscribeMessage = this.createSubscribeMessage(this.getDefaultTopics());

    console.log('✅ Connection ready:', wsUrl);

    return {
      url: wsUrl,
      subscribeMessage,
    };
  }
}