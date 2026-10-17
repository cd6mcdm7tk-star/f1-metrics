// /api/grands-prix and /api/drivers
export interface GrandPrix {
  round: number;
  country: string;
  location: string;
  name: string;
  official_name: string;
  date: string;
  is_sprint: boolean;
}

export interface SessionDriver {
  abbreviation: string;
  number: string;
  team: string;
  fullName: string;
}

export interface GPTempoLap {
  LapNumber: number;
  LapTime: number | null;
  Sector1Time: number | null;
  Sector2Time: number | null;
  Sector3Time: number | null;
  IsPersonalBest: boolean;
  HasTelemetry: boolean;
  Team: string;
  Driver: string;
  Compound: string | null;
}

/** A lap picked on the lap chart, to compare its telemetry */
export interface LapSelection { driver: string; lapNumber: number; }

export interface LapData {
  driver: string;
  team: string;
  laps: GPTempoLap[];
}
