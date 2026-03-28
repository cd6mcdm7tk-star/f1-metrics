/**
 * METRIK DELTA - Telemetry Manager
 * Processes all F1 SignalR feed messages and maintains live state.
 */

import { WebSocketManager } from './WebSocketManager';
import type {
  TelemetryData,
  ProcessedWeather,
  ProcessedRaceControl,
  ProcessedSession,
  ProcessedCarData,
  ProcessedPositionData,
  ProcessedTimingStats,
  ProcessedStint,
  ProcessedPitStop,
} from './types';
import { DriverProcessor, PositionProcessor, TimingProcessor } from './processors';

export class TelemetryManager {
  private wsManager: WebSocketManager;

  // Processors
  private driverProcessor   = new DriverProcessor();
  private positionProcessor = new PositionProcessor();
  private timingProcessor   = new TimingProcessor();

  // Live state
  private weather:       ProcessedWeather | null = null;
  private raceControl:   ProcessedRaceControl[]  = [];
  private session:       ProcessedSession | null = null;
  private carData:       Map<number, ProcessedCarData> = new Map();
  private positionData:  Map<number, ProcessedPositionData> = new Map();
  private gpsPositions:  Map<number, ProcessedPositionData> = new Map();
  private trackHistory:  { x: number; y: number }[] = [];
  private trackHistoryKeys: Set<string> = new Set();
  private stints:        ProcessedStint[]   = [];
  private pitStops:      ProcessedPitStop[] = [];
  private timingStats:   ProcessedTimingStats[] = [];
  private teamRadio:     { captures: any[] } = { captures: [] };
  private currentLap     = 0;
  private totalLaps      = 0;

  private onUpdateCallback: ((data: TelemetryData) => void) | null = null;
  private onConnectedCallback: (() => void) | null = null;

  constructor() {
    this.wsManager = new WebSocketManager();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  connect(
    url: string,
    onUpdate: (data: TelemetryData) => void,
    onConnected?: () => void,
  ) {
    this.onUpdateCallback   = onUpdate;
    this.onConnectedCallback = onConnected ?? null;

    this.wsManager.connect(url, (raw) => {
      // Signal "connected" on first message
      if (this.onConnectedCallback) {
        this.onConnectedCallback();
        this.onConnectedCallback = null;
      }
      this._processRaw(raw);
    });
  }

  disconnect() {
    this.wsManager.disconnect();
  }

  // ── Raw message dispatcher ────────────────────────────────────────────────

  private _processRaw(raw: any) {
    // Initial snapshot (R)
    if (raw.R) {
      for (const [topic, data] of Object.entries(raw.R)) {
        this._dispatch(topic, data);
      }
    }

    // Incremental feed (M)
    if (Array.isArray(raw.M)) {
      for (const msg of raw.M) {
        if (msg.H !== 'Streaming' || msg.M !== 'feed' || !Array.isArray(msg.A)) continue;

        const first = msg.A[0];

        if (typeof first === 'string') {
          // Compressed: A = ["Topic.z", compressedStr, timestamp?]
          const topic = first as string;
          const payload = msg.A[1];
          if (topic.endsWith('.z') && typeof payload === 'string') {
            const decompressed = WebSocketManager.decompress(payload);
            if (decompressed) this._dispatch(topic.slice(0, -2), decompressed);
          } else {
            this._dispatch(topic, payload);
          }
        } else if (first && typeof first === 'object') {
          // Object: A = [{Topic: data, ...}, timestamp?]
          for (const [topic, data] of Object.entries(first)) {
            this._dispatch(topic, data);
          }
        }
      }
    }

    this._emit();
  }

  private _dispatch(topic: string, data: any) {
    if (!data) return;
    switch (topic) {
      case 'DriverList':        this.driverProcessor.processDriverList(data); break;
      case 'TimingData':
        this.timingProcessor.processTimingData(data);
        this.positionProcessor.processTimingDataPositions(data);
        break;
      case 'TimingAppData':     this.driverProcessor.processGridPositions(data); break;
      case 'TimingStats':       this._processTimingStats(data); break;
      case 'Position':          this._processGpsPositions(data); break;
      case 'CarData':           this._processCarData(data); break;
      case 'WeatherData':       this._processWeather(data); break;
      case 'RaceControlMessages': this._processRaceControl(data); break;
      case 'SessionInfo':       this._processSessionInfo(data); break;
      case 'SessionData':       this._processSessionData(data); break;
      case 'TrackStatus':       this._processTrackStatus(data); break;
      case 'TyreStintSeries':   this._processTyreStints(data); break;
      case 'PitStopSeries':     this._processPitStops(data); break;
      case 'TeamRadio':         this._processTeamRadio(data); break;
      case 'LapCount':          this._processLapCount(data); break;
    }
  }

  // ── Processors ────────────────────────────────────────────────────────────

  private _processWeather(data: any) {
    this.weather = {
      air_temperature:   parseFloat(data.AirTemp)   || 0,
      track_temperature: parseFloat(data.TrackTemp) || 0,
      humidity:          parseFloat(data.Humidity)  || undefined,
      pressure:          parseFloat(data.Pressure)  || undefined,
      rainfall:          data.Rainfall === '1' || data.Rainfall === true ? 1 : 0,
      wind_speed:        parseFloat(data.WindSpeed) || undefined,
      wind_direction:    parseFloat(data.WindDirection) || undefined,
    };
  }

  private _processRaceControl(data: any) {
    const messages: any = data.Messages || data;
    const entries = Array.isArray(messages) ? messages : Object.values(messages);
    for (const msg of entries) {
      if (!msg?.Utc) continue;
      const exists = this.raceControl.find(m => m.timestamp === msg.Utc);
      if (!exists) {
        this.raceControl.unshift({
          timestamp:     msg.Utc,
          category:      msg.Category,
          flag:          msg.Flag,
          scope:         msg.Scope,
          sector:        msg.Sector ? parseInt(msg.Sector) : undefined,
          message:       msg.Message || '',
          lap:           msg.Lap ? parseInt(msg.Lap) : undefined,
          driver_number: msg.RacingNumber ? parseInt(msg.RacingNumber) : undefined,
        });
      }
    }
    // Keep last 30 messages
    if (this.raceControl.length > 30) this.raceControl = this.raceControl.slice(0, 30);
  }

  private _processSessionInfo(data: any) {
    this.session = {
      ...(this.session || {}),
      meeting_name:       data.Meeting?.Name,
      session_name:       data.Name,
      session_type:       data.Type,
      circuit_short_name: data.Meeting?.Circuit?.ShortName,
      country_name:       data.Meeting?.Country?.Name,
      gmt_offset:         data.GmtOffset,
    };
  }

  private _processSessionData(data: any) {
    if (!data.StatusSeries) return;
    const entries = Array.isArray(data.StatusSeries)
      ? data.StatusSeries
      : Object.values(data.StatusSeries);
    const last = entries[entries.length - 1] as any;
    if (last) {
      this.session = {
        ...(this.session || {}),
        session_status: last.SessionStatus,
      };
    }
  }

  private _processTrackStatus(data: any) {
    if (data.Status !== undefined) {
      this.session = {
        ...(this.session || {}),
        track_status: data.Status,
      };
    }
  }

  private _processGpsPositions(data: any) {
    // Position.z: {Entries: [{Utc, Cars: {num: {Status, X, Y, Z}}}]}
    // Entries may be an array OR an object keyed by index
    const entries: any[] = Array.isArray(data.Entries)
      ? data.Entries
      : data.Entries != null ? Object.values(data.Entries) : [];
    // Also support bare entry (no Entries wrapper): {Cars: {...}}
    const last = entries.length > 0 ? entries[entries.length - 1] : (data.Cars ? data : null);
    if (!last?.Cars) return;

    for (const [num, car] of Object.entries(last.Cars as Record<string, any>)) {
      const driverNum = parseInt(num);
      if (isNaN(driverNum) || car.X == null || car.Y == null) continue;
      this.gpsPositions.set(driverNum, {
        driver_number: driverNum,
        x: car.X,
        y: car.Y,
        z: car.Z,
        status: car.Status,
      });
      // Accumulate track outline (sample every ~50m to keep array small)
      const rx = Math.round(car.X / 50) * 50;
      const ry = Math.round(car.Y / 50) * 50;
      const key = `${rx},${ry}`;
      if (!this.trackHistoryKeys.has(key)) {
        this.trackHistoryKeys.add(key);
        this.trackHistory.push({ x: car.X, y: car.Y });
      }
    }
  }

  private _processCarData(data: any) {
    // CarData format: {Entries: [{Utc, Cars: {driverNum: {Channels: {0:rpm, 2:speed, 3:gear, 4:throttle, 5:brake, 45:drs}}}}]}
    // Entries may be an array OR an object keyed by index
    const entries: any[] = Array.isArray(data.Entries)
      ? data.Entries
      : data.Entries != null ? Object.values(data.Entries) : [];
    const last = entries.length > 0 ? entries[entries.length - 1] : (data.Cars ? data : null);
    if (!last?.Cars) return;

    for (const [num, car] of Object.entries(last.Cars as Record<string, any>)) {
      const ch = car?.Channels || {};
      this.carData.set(parseInt(num), {
        driver_number: parseInt(num),
        rpm:      ch[0]  ?? undefined,
        speed:    ch[2]  ?? undefined,
        gear:     ch[3]  ?? undefined,
        throttle: ch[4]  ?? undefined,
        brake:    ch[5]  ?? undefined,
        drs:      ch[45] ?? undefined,
      });
    }
  }

  private _processTimingStats(data: any) {
    if (!data.Lines) return;
    const statsMap = new Map(this.timingStats.map(s => [s.driver_number, s]));
    for (const [num, line] of Object.entries(data.Lines as Record<string, any>)) {
      const driverNum = parseInt(num);
      const existing  = statsMap.get(driverNum) || { driver_number: driverNum };
      if (line.PersonalBestLapTime?.Value) {
        existing.personal_best_lap_time = line.PersonalBestLapTime.Value;
      }
      if (line.BestSectors) {
        existing.best_sectors = {
          sector1: line.BestSectors['0']?.Value,
          sector2: line.BestSectors['1']?.Value,
          sector3: line.BestSectors['2']?.Value,
        };
      }
      statsMap.set(driverNum, existing);
    }
    this.timingStats = Array.from(statsMap.values());
  }

  private _processTyreStints(data: any) {
    const lines: Record<string, any> = data.Lines || data;
    const result: ProcessedStint[] = [];
    for (const [num, line] of Object.entries(lines)) {
      const driverNum = parseInt(num);
      const stints = Array.isArray(line?.Stints) ? line.Stints : Object.values(line?.Stints || {});
      stints.forEach((stint: any, idx: number) => {
        result.push({
          driver_number:      driverNum,
          stint_number:       idx + 1,
          compound:           stint.Compound || stint.compound || 'UNKNOWN',
          lap_start:          stint.LapNumber || stint.StartLaps || 0,
          tyre_age_at_start:  stint.TotalLaps || 0,
          new:                stint.New === 'true' || stint.New === true,
        });
      });
    }
    // Merge — replace driver stints
    const existing = this.stints.filter(
      s => !result.find(r => r.driver_number === s.driver_number)
    );
    this.stints = [...existing, ...result];
  }

  private _processPitStops(data: any) {
    const lines: Record<string, any> = data.Lines || data;
    const result: ProcessedPitStop[] = [];
    for (const [num, line] of Object.entries(lines)) {
      const driverNum = parseInt(num);
      const stops = Array.isArray(line?.Stops) ? line.Stops : Object.values(line?.Stops || {});
      stops.forEach((stop: any) => {
        result.push({
          driver_number:  driverNum,
          lap:            stop.Lap || 0,
          pit_duration:   stop.PitLaneTime,
          total_pit_time: stop.Duration,
        });
      });
    }
    const existing = this.pitStops.filter(
      p => !result.find(r => r.driver_number === p.driver_number)
    );
    this.pitStops = [...existing, ...result];
  }

  private _processTeamRadio(data: any) {
    // data can be: {Captures: [...]} | {Captures: {"0":{...}}} | bare capture {Utc, Path, RacingNumber}
    let captures: any[];
    if (data.Captures != null) {
      captures = Array.isArray(data.Captures)
        ? data.Captures
        : Object.values(data.Captures);
    } else if (data.Path) {
      // Bare single capture (incremental M message format)
      captures = [data];
    } else {
      captures = [];
    }
    for (const cap of captures) {
      const exists = this.teamRadio.captures.find(c => c.utc === cap.Utc);
      if (!exists && cap.Path) {
        this.teamRadio.captures.unshift({
          driver_number: parseInt(cap.RacingNumber),
          recording_url: `https://livetiming.formula1.com/${cap.Path}`,
          utc:           cap.Utc,
        });
      }
    }
    if (this.teamRadio.captures.length > 20) {
      this.teamRadio.captures = this.teamRadio.captures.slice(0, 20);
    }
  }

  private _processLapCount(data: any) {
    if (data.CurrentLap !== undefined)  this.currentLap = parseInt(data.CurrentLap);
    if (data.TotalLaps   !== undefined)  this.totalLaps  = parseInt(data.TotalLaps);
    this.session = {
      ...(this.session || {}),
      current_lap: this.currentLap,
      total_laps:  this.totalLaps,
    };
  }

  // ── Emit ──────────────────────────────────────────────────────────────────

  private _emit() {
    this.onUpdateCallback?.({
      drivers:       this.driverProcessor.getAllDrivers(),
      positions:     this.positionProcessor.getCurrentPositions(),
      timing:        this.timingProcessor.getAllTiming(),
      timingStats:   this.timingStats,
      weather:       this.weather,
      session:       this.session,
      raceControl:   this.raceControl,
      carData:       Array.from(this.carData.values()),
      positionData:  Array.from(this.positionData.values()),
      gpsPositions:  Array.from(this.gpsPositions.values()),
      trackHistory:  this.trackHistory,
      stints:        this.stints,
      pitStops:      this.pitStops,
      teamRadio:     this.teamRadio,
      driversWithDRS: Array.from(this.carData.values())
        .filter(c => c.drs !== undefined && c.drs > 10)
        .map(c => c.driver_number),
      lastUpdateTime: new Date(),
    });
  }
}
