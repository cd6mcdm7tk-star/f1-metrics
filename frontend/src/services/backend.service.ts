import type { TelemetryData, TelemetryDataMulti, LapRef } from '../types/telemetry';
import { getApiBase } from '../config';

const API_BASE_URL = getApiBase();

// Multi-lap comparisons already loaded during this visit, by their exact
// lap list — shown again instantly (switching views, or coming back from
// Statistics) instead of refetched.
const MULTI_CACHE_SIZE = 20;
const multiCache = new Map<string, TelemetryDataMulti>();

async function getJson<T>(url: string, what: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Failed to fetch ${what}`);
  return response.json();
}

export const getGrandsPrix = (year: number) =>
  getJson<any>(`${API_BASE_URL}/grands-prix/${year}`, 'grands prix');

export const getDrivers = (year: number, gpRound: number, sessionType: string) =>
  getJson<any>(`${API_BASE_URL}/drivers/${year}/${gpRound}/${sessionType}`, 'drivers');

// Fastest laps unless a lap number is given for that driver
export function getTelemetryComparison(
  year: number,
  gpRound: number,
  sessionType: string,
  driver1: string,
  driver2: string,
  lapNumber1?: number,
  lapNumber2?: number,
): Promise<TelemetryData> {
  const params = new URLSearchParams();
  if (lapNumber1 !== undefined) params.append('lap_number1', lapNumber1.toString());
  if (lapNumber2 !== undefined) params.append('lap_number2', lapNumber2.toString());
  const query = params.toString() ? `?${params}` : '';
  return getJson(`${API_BASE_URL}/telemetry/${year}/${gpRound}/${sessionType}/${driver1}/${driver2}${query}`, 'telemetry');
}

export async function getTelemetryMulti(laps: LapRef[]): Promise<TelemetryDataMulti> {
  const data = await getJson<TelemetryDataMulti>(`${API_BASE_URL}/telemetry/multi`, 'multi-lap telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ laps }),
  });
  multiCache.set(JSON.stringify(laps), data);
  if (multiCache.size > MULTI_CACHE_SIZE) multiCache.delete(multiCache.keys().next().value!);
  return data;
}

export const getCachedTelemetryMulti = (laps: LapRef[]): TelemetryDataMulti | undefined =>
  multiCache.get(JSON.stringify(laps));
