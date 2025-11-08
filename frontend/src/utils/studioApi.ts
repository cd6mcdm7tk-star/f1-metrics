// Studio Pro API Functions
import type { DataSourceConfig } from '../types/studio';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://f1-metrics-backend-production.up.railway.app';

export interface TelemetryData {
  telemetry: Array<{
    distance: number;
    speed1: number;
    speed2: number;
    throttle1: number;
    throttle2: number;
    brake1: boolean;
    brake2: boolean;
    gear1: number;
    gear2: number;
    drs1: number;
    drs2: number;
    x: number | null;
    y: number | null;
  }>;
  lapTime1: number;
  lapTime2: number;
  driver1: string;
  driver2: string;
}

export interface RacePaceData {
  driver: string;
  paceData: Array<{
    lapNumber: number;
    lapTime: number | null;
    compound: string;
    tyreLife: number;
    stint: number;
    position: number;
    pitOutTime: boolean;
    pitInTime: boolean;
  }>;
}

export interface MultiDriverPaceData {
  drivers: string[];
  data: {
    [driver: string]: Array<{
      lapNumber: number;
      lapTime: number | null;
      compound: string;
      tyreLife: number;
      stint: number;
    }>;
  };
}

export interface SectorAnalysisData {
  drivers: string[];
  data: {
    [driver: string]: {
      sector1: number | null;
      sector2: number | null;
      sector3: number | null;
      lapTime: number | null;
      lapNumber: number | null;
    };
  };
}

export interface ChampionshipData {
  standings: Array<{
    position: number;
    driver: string;
    code: string;
    team: string;
    points: number;
    wins: number;
  }>;
}

export interface TireStrategyData {
  strategies: Array<{
    driver: string;
    team: string;
    stints: Array<{
      stint: number;
      compound: string;
      startLap: number;
      laps: number;
    }>;
    totalStops: number;
  }>;
}

// Fetch Telemetry Battle Data
export async function fetchTelemetryBattle(config: DataSourceConfig): Promise<TelemetryData> {
  const { year, round, session, drivers } = config;
  
  if (!drivers || drivers.length < 2) {
    throw new Error('Two drivers required for telemetry battle');
  }

  const url = `${API_BASE_URL}/api/telemetry/${year}/${round}/${session}/${drivers[0]}/${drivers[1]}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch telemetry data: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Race Pace Data
export async function fetchRacePace(config: DataSourceConfig): Promise<RacePaceData> {
  const { year, round, drivers } = config;
  
  if (!drivers || drivers.length === 0) {
    throw new Error('At least one driver required');
  }

  const url = `${API_BASE_URL}/api/race-pace/${year}/${round}/${drivers[0]}?show_outliers=false`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch race pace data: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Multi-Driver Pace
export async function fetchMultiDriverPace(config: DataSourceConfig): Promise<MultiDriverPaceData> {
  const { year, round, session, drivers } = config;
  
  if (!drivers || drivers.length === 0) {
    throw new Error('At least one driver required');
  }

  const driversParam = drivers.join(',');
  const url = `${API_BASE_URL}/api/multi-driver-pace/${year}/${round}/${session}?drivers=${driversParam}&show_outliers=false`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch multi-driver pace: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Sector Analysis
export async function fetchSectorAnalysis(config: DataSourceConfig): Promise<SectorAnalysisData> {
  const { year, round, session, drivers } = config;
  
  if (!drivers || drivers.length === 0) {
    throw new Error('At least one driver required');
  }

  const driversParam = drivers.join(',');
  const url = `${API_BASE_URL}/api/multi-driver-sectors/${year}/${round}/${session}?drivers=${driversParam}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch sector analysis: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Championship Data
export async function fetchChampionship(config: DataSourceConfig): Promise<ChampionshipData> {
  const { year } = config;
  
  const url = `${API_BASE_URL}/api/championship/${year}/drivers`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch championship data: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Tire Strategy
export async function fetchTireStrategy(config: DataSourceConfig): Promise<TireStrategyData> {
  const { year, round } = config;
  
  const url = `${API_BASE_URL}/api/strategy-comparison/${year}/${round}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch tire strategy: ${response.statusText}`);
  }
  
  return response.json();
}

// Fetch Qualifying Results
export async function fetchQualifyingResults(config: DataSourceConfig): Promise<any> {
  const { year, round } = config;
  
  const url = `${API_BASE_URL}/api/studio/qualifying?year=${year}&round=${round}`;
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch qualifying results: ${response.statusText}`);
  }
  
  return response.json();
}

// Master fetch function that routes to the correct endpoint
export async function fetchStudioData(config: DataSourceConfig) {
  switch (config.type) {
    case 'telemetry-battle':
      return fetchTelemetryBattle(config);
    
    case 'race-pace':
      return fetchRacePace(config);

    case 'qualifying-results':
  return fetchQualifyingResults(config);
    
    case 'championship-evolution':
      return fetchChampionship(config);
    
    case 'tire-strategy':
      return fetchTireStrategy(config);
    
    case 'sector-analysis':
      return fetchSectorAnalysis(config);
    
    case 'lap-distribution':
      // For now, use multi-driver pace (we'll create histogram from this)
      return fetchMultiDriverPace(config);
    
    default:
      throw new Error(`Unknown data source type: ${config.type}`);
  }
}