import type { TelemetryData } from '../types/telemetry';
import type { EnhancedAnimationData, RaceAnimationData } from '../types/animation';
import type { RaceData, PitStopsData, RaceEventsData } from '../types/pitwall';
import type { PositionEvolution, StrategyComparison } from '../types/pitwall';
import type { RacePaceData, MultiDriverPaceData, StintAnalysisData, SectorEvolutionData } from '../types/raceevolution';
import type { DriverStanding, ConstructorStanding, Circuit } from '../types/championship';

const API_BASE_URL = 'https://metrikdelta-backend-eu-production.up.railway.app';

export const getGrandsPrix = async (year: number) => {
  const response = await fetch(`${API_BASE_URL}/grands-prix/${year}`);
  if (!response.ok) throw new Error('Failed to fetch grands prix');
  return response.json();
};

export const getDrivers = async (year: number, gpRound: number, sessionType: string) => {
  const response = await fetch(`${API_BASE_URL}/drivers/${year}/${gpRound}/${sessionType}`);
  if (!response.ok) throw new Error('Failed to fetch drivers');
  return response.json();
};

export const getTelemetryComparison = async (
  year: number,
  gpRound: number,
  sessionType: string,
  driver1: string,
  driver2: string
): Promise<TelemetryData> => {
  const response = await fetch(
    `${API_BASE_URL}/telemetry/${year}/${gpRound}/${sessionType}/${driver1}/${driver2}`
  );
  if (!response.ok) throw new Error('Failed to fetch telemetry');
  return response.json();
};

export const getAnimationEnhanced = async (
  year: number,
  gpRound: number,
  sessionType: string,
  driver1: string,
  driver2: string
): Promise<EnhancedAnimationData> => {
  const response = await fetch(
    `${API_BASE_URL}/animation-enhanced/${year}/${gpRound}/${sessionType}/${driver1}/${driver2}`
  );
  if (!response.ok) throw new Error('Failed to fetch animation data');
  return response.json();
};

export const getAnimationRaceFull = async (
  year: number,
  gpRound: number,
  driver1: string,
  driver2: string
): Promise<RaceAnimationData> => {
  const response = await fetch(
    `${API_BASE_URL}/animation-race-full/${year}/${gpRound}/${driver1}/${driver2}`
  );
  if (!response.ok) throw new Error('Failed to fetch race animation data');
  return response.json();
};

// PIT WALL ENDPOINTS
export const getRaceData = async (year: number, gpRound: number): Promise<RaceData> => {
  const response = await fetch(`${API_BASE_URL}/race-data/${year}/${gpRound}`);
  if (!response.ok) throw new Error('Failed to fetch race data');
  return response.json();
};

export const getPitStops = async (year: number, gpRound: number): Promise<PitStopsData> => {
  const response = await fetch(`${API_BASE_URL}/pit-stops/${year}/${gpRound}`);
  if (!response.ok) throw new Error('Failed to fetch pit stops');
  return response.json();
};

export const getRaceEvents = async (year: number, gpRound: number): Promise<RaceEventsData> => {
  const response = await fetch(`${API_BASE_URL}/race-events/${year}/${gpRound}`);
  if (!response.ok) throw new Error('Failed to fetch race events');
  return response.json();
};

export const getPositionEvolution = async (year: number, gpRound: number): Promise<PositionEvolution> => {
  const response = await fetch(`${API_BASE_URL}/position-evolution/${year}/${gpRound}`);
  if (!response.ok) throw new Error('Failed to fetch position evolution');
  return response.json();
};

export const getStrategyComparison = async (year: number, gpRound: number): Promise<StrategyComparison> => {
  const response = await fetch(`${API_BASE_URL}/strategy-comparison/${year}/${gpRound}`);
  if (!response.ok) throw new Error('Failed to fetch strategy comparison');
  return response.json();
};

// RACE EVOLUTION ENDPOINTS
export const getRacePace = async (year: number, gpRound: number, driver: string): Promise<RacePaceData> => {
  const response = await fetch(`${API_BASE_URL}/race-pace/${year}/${gpRound}/${driver}`);
  if (!response.ok) throw new Error('Failed to fetch race pace');
  return response.json();
};

export const getMultiDriverPace = async (year: number, gpRound: number, drivers: string[]): Promise<MultiDriverPaceData> => {
  const driversParam = drivers.join(',');
  const response = await fetch(`${API_BASE_URL}/multi-driver-pace/${year}/${gpRound}?drivers=${driversParam}`);
  if (!response.ok) throw new Error('Failed to fetch multi driver pace');
  return response.json();
};

export const getStintAnalysis = async (year: number, gpRound: number, driver: string): Promise<StintAnalysisData> => {
  const response = await fetch(`${API_BASE_URL}/stint-analysis/${year}/${gpRound}/${driver}`);
  if (!response.ok) throw new Error('Failed to fetch stint analysis');
  return response.json();
};

export const getSectorEvolution = async (year: number, gpRound: number, driver: string): Promise<SectorEvolutionData> => {
  const response = await fetch(`${API_BASE_URL}/sector-evolution/${year}/${gpRound}/${driver}`);
  if (!response.ok) throw new Error('Failed to fetch sector evolution');
  return response.json();
};

export const getDriverStandings = async (year: number): Promise<{ standings: DriverStanding[] }> => {
  const response = await fetch(`${API_BASE_URL}/championship/${year}/drivers`);
  if (!response.ok) throw new Error('Failed to fetch driver standings');
  return response.json();
};

export const getConstructorStandings = async (year: number): Promise<{ standings: ConstructorStanding[] }> => {
  const response = await fetch(`${API_BASE_URL}/championship/${year}/constructors`);
  if (!response.ok) throw new Error('Failed to fetch constructor standings');
  return response.json();
};

export const getRaceResults = async (year: number, gpRound: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/championship/${year}/${gpRound}/results`);
  if (!response.ok) throw new Error('Failed to fetch race results');
  return response.json();
};

export const getStandingsAfterRace = async (year: number, gpRound: number): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/championship/${year}/${gpRound}/standings`);
  if (!response.ok) throw new Error('Failed to fetch standings after race');
  return response.json();
};

export const getCircuits = async (year: number): Promise<{ circuits: Circuit[] }> => {
  const response = await fetch(`${API_BASE_URL}/circuits/${year}`);
  if (!response.ok) throw new Error('Failed to fetch circuits');
  return response.json();
};
