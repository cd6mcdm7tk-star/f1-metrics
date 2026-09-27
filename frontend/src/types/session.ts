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

export interface LapData {
  driver: string;
  team: string;
  laps: GPTempoLap[];
}
