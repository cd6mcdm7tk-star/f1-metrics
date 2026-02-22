/**
 * METRIK DELTA - Live Timing WebSocket Manager
 * Handles connection to F1 SignalR WebSocket and message parsing
 */

import pako from 'pako';

// SignalR Message Structure
export interface SignalRMessage {
  H: string;  // Hub name (always "Streaming")
  M: string;  // Method (always "feed")
  A: [string, any, string];  // [topic, data, timestamp]
}

// WebSocket Data Structure
export interface WebSocketData {
  R?: {
    Heartbeat?: any;
    "CarData.z"?: string;
    "Position.z"?: string;
    CarData?: any;
    Position?: any;
    ExtrapolatedClock?: any;
    TopThree?: any;
    TimingStats?: any;
    TimingAppData?: any;
    WeatherData?: any;
    TrackStatus?: any;
    DriverList?: any;
    RaceControlMessages?: any;
    SessionInfo?: any;
    SessionData?: any;
    LapCount?: any;
    TimingData?: any;
    ChampionshipPrediction?: any;
    TyreStintSeries?: any;
    PitStopSeries?: any;
  };
  M?: SignalRMessage[];
  C?: string;
  H?: string;
  A?: [string, any, string];
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private onDataCallback: ((data: WebSocketData) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  /**
   * Connect to F1 SignalR WebSocket
   * @param url WebSocket URL (from negotiation)
   * @param onData Callback for incoming data
   */
  connect(url: string, onData: (data: WebSocketData) => void) {
    this.onDataCallback = onData;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('✅ METRIK DELTA - WebSocket connected to F1 Live Timing');
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = async (event) => {
      try {
        const blob = event.data;
        const text = await blob.text();
        const rawData = JSON.parse(text) as WebSocketData;
        
        const processedData: WebSocketData = {};

        // Handle messages array (M)
        if (rawData.M && Array.isArray(rawData.M)) {
          processedData.M = rawData.M as SignalRMessage[];
        }
        // Handle response object (R)
        else if (rawData.R) {
          processedData.R = this.decompressData(rawData.R);
        }

        if (this.onDataCallback) {
          this.onDataCallback(processedData);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket data:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      this.attemptReconnect(url);
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  /**
   * Decompress .z (zlib) data using pako
   */
  private decompressData(data: any): any {
    const decompressed: any = {};

    Object.entries(data).forEach(([key, value]) => {
      if (key.endsWith('.z') && typeof value === 'string') {
        try {
          // Decode base64 and decompress with pako
          const decoded = atob(value);
          const charData = decoded.split('').map(x => x.charCodeAt(0));
          const binData = new Uint8Array(charData);
          const inflated = pako.inflate(binData, { to: 'string' });
          const parsed = JSON.parse(inflated);
          
          // Store without .z suffix
          const cleanKey = key.replace('.z', '');
          decompressed[cleanKey] = parsed;
        } catch (error) {
          console.error(`❌ Error decompressing ${key}:`, error);
          decompressed[key] = value;
        }
      } else {
        decompressed[key] = value;
      }
    });

    return decompressed;
  }

  /**
   * Attempt to reconnect with exponential backoff
   */
  private attemptReconnect(url: string) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      if (this.onDataCallback) {
        this.connect(url, this.onDataCallback);
      }
    }, delay);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message to WebSocket (for Subscribe)
   */
  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }
}