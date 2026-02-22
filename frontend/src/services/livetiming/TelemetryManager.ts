/**
 * METRIK DELTA - Telemetry Manager
 * Orchestrates WebSocket connection and data processing
 */

import { WebSocketManager, type WebSocketData, type SignalRMessage } from './WebSocketManager';
import type { TelemetryData } from './types';
import { DriverProcessor, PositionProcessor, TimingProcessor } from './processors';

export class TelemetryManager {
  private wsManager: WebSocketManager;
  
  // Processors
  private driverProcessor: DriverProcessor;
  private positionProcessor: PositionProcessor;
  private timingProcessor: TimingProcessor;
  
  // Temporary data storage for non-processed data
  private weather: any = null;
  private raceControl: any[] = [];
  private pitStops: any[] = [];
  private stints: any[] = [];
  private session: any = null;
  private carData: any[] = [];
  private positionData: any[] = [];
  private driversWithDRS: number[] = [];
  private timingStats: any[] = [];
  private teamRadio: any = { captures: [] };

  private onDataUpdateCallback: ((data: TelemetryData) => void) | null = null;

  constructor() {
    this.wsManager = new WebSocketManager();
    this.driverProcessor = new DriverProcessor();
    this.positionProcessor = new PositionProcessor();
    this.timingProcessor = new TimingProcessor();
  }

  /**
   * Connect to F1 Live Timing and start receiving data
   */
  connect(url: string, onDataUpdate: (data: TelemetryData) => void) {
    this.onDataUpdateCallback = onDataUpdate;

    this.wsManager.connect(url, (data: WebSocketData) => {
      this.processWebSocketData(data);
    });
  }

  /**
   * Process incoming WebSocket data
   */
  private processWebSocketData(data: WebSocketData) {
    // Handle messages array (M) - streaming updates
    if (Array.isArray(data.M)) {
      data.M.forEach((message: SignalRMessage) => {
        if (message.H && message.A) {
          const dataType = message.A[0];
          const messageData = message.A[1];
          const timestamp = message.A[2];
          this.processDataByType(dataType, messageData, timestamp);
        }
      });
    }

    // Handle response object (R) - initial state
    if (data.R) {
      const R = data.R;
      Object.entries(R).forEach(([dataType, messageData]) => {
        if (messageData !== undefined) {
          this.processDataByType(dataType, messageData);
        }
      });
    }

    this.sendUpdate();
  }

  /**
   * Process data by type (will be replaced by processors)
   */
  private processDataByType(dataType: string, messageData: any, timestamp?: string) {
    console.log(`📊 Received: ${dataType}`, messageData);

    switch (dataType) {
      case "CarData":
      case "CarData.z":
        this.processCarData(messageData);
        break;

      case "Position":
      case "Position.z":
        this.processPositionData(messageData);
        break;

      case "TimingData":
        this.processTimingData(messageData);
        break;

      case "DriverList":
        this.processDriverList(messageData);
        break;

      case "RaceControlMessages":
        this.processRaceControl(messageData);
        break;

      case "WeatherData":
        this.processWeatherData(messageData);
        break;

      case "SessionInfo":
      case "SessionData":
        this.processSessionInfo(messageData);
        break;

      case "TrackStatus":
        this.processTrackStatus(messageData);
        break;

      case "TimingAppData":
        this.processTimingAppData(messageData);
        break;

      case "TyreStintSeries":
        this.processTyreStints(messageData);
        break;

      case "PitStopSeries":
        this.processPitStops(messageData);
        break;

      case "TimingStats":
        this.processTimingStats(messageData);
        break;

      case "TeamRadio":
        this.processTeamRadio(messageData);
        break;

      case "LapCount":
        this.processLapCount(messageData);
        break;

      case "TopThree":
        // Top 3 positions update
        break;

      case "Heartbeat":
        // Keep-alive signal
        break;

      default:
        // Unknown data type
        break;
    }
  }

  /**
   * Temporary processing methods (will be replaced by processors)
   */
  private processCarData(data: any) {
    // TODO: Process with CarDataProcessor
  }

  private processPositionData(data: any) {
    this.positionProcessor.processPositionData(data);
  }

  private processTimingData(data: any) {
    this.timingProcessor.processTimingData(data);
    this.positionProcessor.processTimingDataPositions(data);
  }

  private processDriverList(data: any) {
    this.driverProcessor.processDriverList(data);
  }

  private processRaceControl(data: any) {
    // TODO: Process with RaceControlProcessor
    console.log('🚨 RaceControl:', data);
  }

  private processWeatherData(data: any) {
    // TODO: Process with WeatherProcessor
    console.log('🌤️ Weather:', data);
  }

  private processSessionInfo(data: any) {
    // TODO: Process with SessionProcessor
    console.log('📋 Session:', data);
  }

  private processTrackStatus(data: any) {
    // TODO: Process with SessionProcessor
  }

  private processTimingAppData(data: any) {
    this.driverProcessor.processGridPositions(data);
  }

  private processTyreStints(data: any) {
    // TODO: Process with PitProcessor
  }

  private processPitStops(data: any) {
    // TODO: Process with PitProcessor
  }

  private processTimingStats(data: any) {
    // TODO: Process with TimingStatsProcessor
  }

  private processTeamRadio(data: any) {
    // TODO: Process with TeamRadioProcessor
  }

  private processLapCount(data: any) {
    // TODO: Update session lap count
  }

  /**
   * Send update to callback with current telemetry data
   */
  private sendUpdate() {
    if (!this.onDataUpdateCallback) return;

    const telemetryData: TelemetryData = {
      positions: this.positionProcessor.getCurrentPositions(),
      timing: this.timingProcessor.getAllTiming(),
      weather: this.weather,
      drivers: this.driverProcessor.getAllDrivers(),
      raceControl: this.raceControl,
      pitStops: this.pitStops,
      stints: this.stints,
      session: this.session,
      carData: this.carData,
      positionData: this.positionData,
      driversWithDRS: this.driversWithDRS,
      timingStats: this.timingStats,
      teamRadio: this.teamRadio,
      lastUpdateTime: new Date(),
    };

    this.onDataUpdateCallback(telemetryData);
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    this.wsManager.disconnect();
  }

  /**
   * Get specific driver data
   */
  getDriverPosition(driverNumber: number) {
    return this.positionProcessor.getDriverPosition(driverNumber);
  }

  getDriverTiming(driverNumber: number) {
    return this.timingProcessor.getDriverTiming(driverNumber);
  }

  getDriver(driverNumber: number) {
    return this.driverProcessor.getDriver(driverNumber);
  }

  getDriverCarData(driverNumber: number) {
    return this.carData.find(c => c.driver_number === driverNumber);
  }
}