export interface DriverPosition {
  driver: string;
  team: string;
  position: number;
  lapTime: number | null;
  compound: string;
  tyreLife: number;
  stint: number;
  pitOutTime: boolean;
  pitInTime: boolean;
}

export interface LapData {
  lapNumber: number;
  positions: DriverPosition[];
}

export interface RaceData {
  raceData: LapData[];
  totalLaps: number;
  circuitName: string;
  country: string;
}

export interface PitStop {
  driver: string;
  team: string;
  lap: number;
  duration: number | null;
  compound: string;
  tyreLife: number;
  stint: number;
}

export interface PitStopsData {
  pitStops: PitStop[];
}

export interface RaceEvent {
  lap: number;
  type: string;
  description: string;
  driver?: string;
  severity: 'info' | 'medium' | 'high' | 'critical';
}

export interface RaceEventsData {
  events: RaceEvent[];
}

export interface PositionEvolution {
  evolution: Array<{ lap: number; [driver: string]: number }>;
  drivers: string[];
}

export interface Stint {
  stint: number;
  compound: string;
  startLap: number;
  laps: number;
}

export interface DriverStrategy {
  driver: string;
  team: string;
  stints: Stint[];
  totalStops: number;
}

export interface StrategyComparison {
  strategies: DriverStrategy[];
}