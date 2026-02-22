import type { TelemetryData } from '../types/telemetry';
import type { EnhancedAnimationData, RaceAnimationData } from '../types/animation';
import type { RaceData, PitStopsData, RaceEventsData } from '../types/pitwall';
import type { PositionEvolution, StrategyComparison } from '../types/pitwall';
import type { RacePaceData, StintAnalysisData, SectorEvolutionData } from '../types/raceevolution';
import type { DriverStanding, ConstructorStanding, Circuit } from '../types/championship';

// Utilise l'URL Railway EU en production, localhost en dev
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://metrikdelta-backend-eu-production.up.railway.app/api'
  : 'http://localhost:8000/api'; 

class BackendService {
  async getSchedule(year: number) {
    const response = await fetch(`${API_BASE_URL}/grands-prix/${year}`);
    if (!response.ok) throw new Error('Failed to fetch schedule');
    return response.json();
  }

  async getGrandsPrix(year: number) {
    const response = await fetch(`${API_BASE_URL}/grands-prix/${year}`);
    if (!response.ok) throw new Error('Failed to fetch grands prix');
    return response.json();
  }

  async getDrivers(year: number, gpRound: number, sessionType: string) {
    const response = await fetch(`${API_BASE_URL}/drivers/${year}/${gpRound}/${sessionType}`);
    if (!response.ok) throw new Error('Failed to fetch drivers');
    return response.json();
  }

  // 🔥 MODIFIÉ - Ajout des paramètres lapNumber1 et lapNumber2 optionnels
  async getTelemetryComparison(
    year: number,
    gpRound: number,
    sessionType: string,
    driver1: string,
    driver2: string,
    lapNumber1?: number,  // ✅ Lap pour driver1
    lapNumber2?: number   // ✅ Lap pour driver2
  ): Promise<TelemetryData> {
    // Construire l'URL avec query params si fournis
    let url = `${API_BASE_URL}/telemetry/${year}/${gpRound}/${sessionType}/${driver1}/${driver2}`;
    
    const params = new URLSearchParams();
    if (lapNumber1 !== undefined) {
      params.append('lap_number1', lapNumber1.toString());
    }
    if (lapNumber2 !== undefined) {
      params.append('lap_number2', lapNumber2.toString());
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch telemetry');
    return response.json();
  }

  async getAnimationEnhanced(
    year: number,
    gpRound: number,
    sessionType: string,
    driver1: string,
    driver2: string
  ): Promise<EnhancedAnimationData> {
    const response = await fetch(
      `${API_BASE_URL}/animation-enhanced/${year}/${gpRound}/${sessionType}/${driver1}/${driver2}`
    );
    if (!response.ok) throw new Error('Failed to fetch animation data');
    return response.json();
  }

  async getAnimationRaceFull(
    year: number,
    gpRound: number,
    driver1: string,
    driver2: string
  ): Promise<RaceAnimationData> {
    const response = await fetch(
      `${API_BASE_URL}/animation-race-full/${year}/${gpRound}/${driver1}/${driver2}`
    );
    if (!response.ok) throw new Error('Failed to fetch race animation data');
    return response.json();
  }

  async getRaceData(year: number, gpRound: number): Promise<RaceData> {
    const response = await fetch(`${API_BASE_URL}/race-data/${year}/${gpRound}`);
    if (!response.ok) throw new Error('Failed to fetch race data');
    return response.json();
  }

  async getPitStops(year: number, gpRound: number): Promise<PitStopsData> {
    const response = await fetch(`${API_BASE_URL}/pit-stops/${year}/${gpRound}`);
    if (!response.ok) throw new Error('Failed to fetch pit stops');
    return response.json();
  }

  async getRaceEvents(year: number, gpRound: number): Promise<RaceEventsData> {
    const response = await fetch(`${API_BASE_URL}/race-events/${year}/${gpRound}`);
    if (!response.ok) throw new Error('Failed to fetch race events');
    return response.json();
  }

  async getPositionEvolution(year: number, gpRound: number): Promise<PositionEvolution> {
    const response = await fetch(`${API_BASE_URL}/position-evolution/${year}/${gpRound}`);
    if (!response.ok) throw new Error('Failed to fetch position evolution');
    return response.json();
  }

  async getStrategyComparison(year: number, gpRound: number): Promise<StrategyComparison> {
    const response = await fetch(`${API_BASE_URL}/strategy-comparison/${year}/${gpRound}`);
    if (!response.ok) throw new Error('Failed to fetch strategy comparison');
    return response.json();
  }

  async getRacePace(year: number, gpRound: number, driver: string, sessionType: string = 'R'): Promise<RacePaceData> {
    const response = await fetch(`${API_BASE_URL}/race-pace/${year}/${gpRound}/${sessionType}/${driver}`);
    if (!response.ok) throw new Error('Failed to fetch race pace');
    return response.json();
  }

  async getMultiDriverPace(year: number, gpRound: number, drivers: string[], sessionType: string) {
    const driversParam = drivers.join(',');
    const response = await fetch(`${API_BASE_URL}/multi-driver-pace/${year}/${gpRound}/${sessionType}?drivers=${driversParam}`);
    if (!response.ok) throw new Error('Failed to fetch multi-driver pace');
    return response.json();
  }

  async getStintAnalysis(year: number, gpRound: number, driver: string): Promise<StintAnalysisData> {
    const response = await fetch(`${API_BASE_URL}/stint-analysis/${year}/${gpRound}/${driver}`);
    if (!response.ok) throw new Error('Failed to fetch stint analysis');
    return response.json();
  }

  async getSectorEvolution(year: number, gpRound: number, driver: string): Promise<SectorEvolutionData> {
    const response = await fetch(`${API_BASE_URL}/sector-evolution/${year}/${gpRound}/${driver}`);
    if (!response.ok) throw new Error('Failed to fetch sector evolution');
    return response.json();
  }

  async getMultiDriverSectors(year: number, gpRound: number, sessionType: string, drivers: string[]) {
    const driversParam = drivers.join(',');
    const response = await fetch(`${API_BASE_URL}/multi-driver-sectors/${year}/${gpRound}/${sessionType}?drivers=${driversParam}`);
    if (!response.ok) throw new Error('Failed to fetch multi-driver sectors');
    return response.json();
  }

  async getDriverStandings(year: number): Promise<{ standings: DriverStanding[] }> {
    const response = await fetch(`${API_BASE_URL}/championship/${year}/drivers`);
    if (!response.ok) throw new Error('Failed to fetch driver standings');
    return response.json();
  }

  async getConstructorStandings(year: number): Promise<{ standings: ConstructorStanding[] }> {
    const response = await fetch(`${API_BASE_URL}/championship/${year}/constructors`);
    if (!response.ok) throw new Error('Failed to fetch constructor standings');
    return response.json();
  }

  async getRaceResults(year: number, gpRound: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/championship/${year}/${gpRound}/results`);
    if (!response.ok) throw new Error('Failed to fetch race results');
    return response.json();
  }

  async getStandingsAfterRace(year: number, gpRound: number): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/championship/${year}/${gpRound}/standings`);
    if (!response.ok) throw new Error('Failed to fetch standings after race');
    return response.json();
  }

  async getCircuits(year: number): Promise<{ circuits: Circuit[] }> {
    const response = await fetch(`${API_BASE_URL}/circuits/${year}`);
    if (!response.ok) throw new Error('Failed to fetch circuits');
    return response.json();
  }
}

// Instance principale
export const backendService = new BackendService();

// Exports individuels pour compatibilité
export const getGrandsPrix = (year: number) => backendService.getGrandsPrix(year);
export const getDrivers = (year: number, gpRound: number, sessionType: string) => 
  backendService.getDrivers(year, gpRound, sessionType);

// 🔥 MODIFIÉ - Ajout des paramètres lapNumber1 et lapNumber2 optionnels
export const getTelemetryComparison = (
  year: number, 
  gpRound: number, 
  sessionType: string, 
  driver1: string, 
  driver2: string,
  lapNumber1?: number,  // ✅ Lap pour driver1
  lapNumber2?: number   // ✅ Lap pour driver2
) => backendService.getTelemetryComparison(year, gpRound, sessionType, driver1, driver2, lapNumber1, lapNumber2);

export const getAnimationEnhanced = (year: number, gpRound: number, sessionType: string, driver1: string, driver2: string) =>
  backendService.getAnimationEnhanced(year, gpRound, sessionType, driver1, driver2);
export const getAnimationRaceFull = (year: number, gpRound: number, driver1: string, driver2: string) =>
  backendService.getAnimationRaceFull(year, gpRound, driver1, driver2);
export const getRaceData = (year: number, gpRound: number) => backendService.getRaceData(year, gpRound);
export const getPitStops = (year: number, gpRound: number) => backendService.getPitStops(year, gpRound);
export const getRaceEvents = (year: number, gpRound: number) => backendService.getRaceEvents(year, gpRound);
export const getPositionEvolution = (year: number, gpRound: number) => backendService.getPositionEvolution(year, gpRound);
export const getStrategyComparison = (year: number, gpRound: number) => backendService.getStrategyComparison(year, gpRound);
export const getRacePace = (year: number, gpRound: number, driver: string, sessionType: string = 'R') => 
  backendService.getRacePace(year, gpRound, driver, sessionType);
export const getMultiDriverPace = (year: number, gpRound: number, drivers: string[], sessionType: string) =>
  backendService.getMultiDriverPace(year, gpRound, drivers, sessionType);
export const getStintAnalysis = (year: number, gpRound: number, driver: string) => backendService.getStintAnalysis(year, gpRound, driver);
export const getSectorEvolution = (year: number, gpRound: number, driver: string) => 
  backendService.getSectorEvolution(year, gpRound, driver);
export const getMultiDriverSectors = (year: number, gpRound: number, sessionType: string, drivers: string[]) =>
  backendService.getMultiDriverSectors(year, gpRound, sessionType, drivers);
export const getDriverStandings = (year: number) => backendService.getDriverStandings(year);
export const getConstructorStandings = (year: number) => backendService.getConstructorStandings(year);
export const getRaceResults = (year: number, gpRound: number) => backendService.getRaceResults(year, gpRound);
export const getStandingsAfterRace = (year: number, gpRound: number) => backendService.getStandingsAfterRace(year, gpRound);
export const getCircuits = (year: number) => backendService.getCircuits(year);