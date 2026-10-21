import type { TelemetryDataMulti, LapRef } from '../types/telemetry';
import type { GrandPrix, SessionDriver } from '../types/session';
import { getApiBase } from '../config';
import { authHeaders } from '../lib/apiAuth';

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
  getJson<{ grands_prix: GrandPrix[] }>(`${API_BASE_URL}/grands-prix/${year}`, 'grands prix');

export const getDrivers = (year: number, gpRound: number, sessionType: string) =>
  getJson<SessionDriver[]>(`${API_BASE_URL}/drivers/${year}/${gpRound}/${sessionType}`, 'drivers');

export async function getTelemetryMulti(laps: LapRef[]): Promise<TelemetryDataMulti> {
  const data = await getJson<TelemetryDataMulti>(`${API_BASE_URL}/telemetry/multi`, 'multi-lap telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders(Math.max(...laps.map(l => l.year)))) },
    body: JSON.stringify({ laps }),
  });
  multiCache.set(JSON.stringify(laps), data);
  if (multiCache.size > MULTI_CACHE_SIZE) multiCache.delete(multiCache.keys().next().value!);
  return data;
}

export const getCachedTelemetryMulti = (laps: LapRef[]): TelemetryDataMulti | undefined =>
  multiCache.get(JSON.stringify(laps));
