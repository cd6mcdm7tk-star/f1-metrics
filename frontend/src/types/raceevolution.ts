export interface LapPaceData {
  lapNumber: number;
  lapTime: number | null;
  compound: string;
  tyreLife: number;
  stint: number;
  position?: number;
  pitOutTime?: boolean;
  pitInTime?: boolean;
}

export interface RacePaceData {
  driver: string;
  paceData: LapPaceData[];
  drivers?: string[];              
  allDriversData?: RacePaceData[]; 
}

export interface MultiDriverPaceData {
  drivers: string[];
  data: { [driver: string]: LapPaceData[] };
}

export interface StintLap {
  lapNumber: number;
  lapTime: number | null;
  tyreLife: number;
}

export interface StintAnalysis {
  stint: number;
  compound: string;
  laps: StintLap[];
  totalLaps: number;
  avgLapTime: number;
  bestLapTime: number;
  worstLapTime: number;
  degradation: number;
}

export interface StintAnalysisData {
  driver: string;
  stints: StintAnalysis[];
}

export interface SectorData {
  lapNumber: number;
  sector1: number | null;
  sector2: number | null;
  sector3: number | null;
  compound: string;
  tyreLife: number;
}

export interface SectorEvolutionData {
  driver: string;
  sectorData: SectorData[];
}