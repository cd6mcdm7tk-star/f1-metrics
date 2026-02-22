/**
 * METRIK DELTA - Live Timing Data Interfaces
 * TypeScript interfaces for all F1 telemetry data types
 */

// ============================================
// POSITION DATA
// ============================================

export interface ProcessedPosition {
  driver_number: number;
  position: number;
  gap_to_leader?: string;
  interval?: string;
  status?: string;
}

// ============================================
// TIMING DATA
// ============================================

export interface ProcessedTiming {
  driver_number: number;
  last_lap_time?: string;
  best_lap_time?: string;
  sector1?: string;
  sector2?: string;
  sector3?: string;
  number_of_laps?: number;
  speeds?: {
    i1?: number;
    i2?: number;
    fl?: number;
    st?: number;
  };
}

// ============================================
// WEATHER DATA
// ============================================

export interface ProcessedWeather {
  air_temperature: number;
  track_temperature: number;
  humidity?: number;
  pressure?: number;
  rainfall?: number;
  wind_speed?: number;
  wind_direction?: number;
}

// ============================================
// DRIVER DATA
// ============================================

export interface ProcessedDriver {
  driver_number: number;
  broadcast_name: string;
  full_name?: string;
  name_acronym: string;
  team_name: string;
  team_colour: string;
  grid_position?: number;
  line?: number;
}

// ============================================
// RACE CONTROL MESSAGES
// ============================================

export interface ProcessedRaceControl {
  timestamp: string;
  category?: string;
  flag?: string;
  scope?: string;
  sector?: number;
  message: string;
  lap?: number;
  driver_number?: number;
}

// ============================================
// PIT STOPS & STINTS
// ============================================

export interface ProcessedPitStop {
  driver_number: number;
  lap: number;
  pit_duration?: string;
  total_pit_time?: string;
}

export interface ProcessedStint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end?: number;
  compound: string;
  tyre_age_at_start: number;
  new?: boolean;
}

// ============================================
// SESSION DATA
// ============================================

export interface ProcessedSession {
  meeting_name?: string;
  session_name?: string;
  session_type?: string;
  circuit_key?: number;
  circuit_short_name?: string;
  country_name?: string;
  session_status?: string;
  track_status?: string;
  total_laps?: number;
  current_lap?: number;
  session_start_time?: string;
  session_end_time?: string;
  gmt_offset?: string;
}

// ============================================
// CAR DATA (Telemetry)
// ============================================

export interface ProcessedCarData {
  driver_number: number;
  speed?: number;
  rpm?: number;
  gear?: number;
  throttle?: number;
  brake?: number;
  drs?: number;
}

// ============================================
// POSITION DATA (GPS)
// ============================================

export interface ProcessedPositionData {
  driver_number: number;
  x?: number;
  y?: number;
  z?: number;
  status?: string;
}

// ============================================
// TIMING STATS
// ============================================

export interface ProcessedTimingStats {
  driver_number: number;
  personal_best_lap_time?: string;
  best_sectors?: {
    sector1?: string;
    sector2?: string;
    sector3?: string;
  };
}

// ============================================
// TEAM RADIO
// ============================================

export interface ProcessedTeamRadio {
  captures: TeamRadioCapture[];
}

export interface TeamRadioCapture {
  driver_number: number;
  recording_url: string;
  utc: string;
}

// ============================================
// MAIN TELEMETRY DATA STRUCTURE
// ============================================

export interface TelemetryData {
  positions: ProcessedPosition[];
  timing: ProcessedTiming[];
  weather: ProcessedWeather | null;
  drivers: ProcessedDriver[];
  raceControl: ProcessedRaceControl[];
  pitStops: ProcessedPitStop[];
  stints: ProcessedStint[];
  session: ProcessedSession | null;
  carData: ProcessedCarData[];
  positionData: ProcessedPositionData[];
  driversWithDRS: number[];
  timingStats: ProcessedTimingStats[];
  teamRadio: ProcessedTeamRadio;
  lastUpdateTime: Date;
}