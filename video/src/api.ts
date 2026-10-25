import type { TelemetryDataMulti } from '../../frontend/src/types/telemetry';
import type { GrandPrix, SessionDriver } from '../../frontend/src/types/session';
import { prepareDuel, type Duel } from './duel/data';
import { prepareRecap, type Recap, type SessionLaps } from './recap/data';
import type { SeasonRound } from './recap/season';
import { prepareQuali, type Quali } from './quali/data';
import type { RaceResult } from './recap/data';

export const API_BASE = 'https://metrikdelta-backend-eu-production.up.railway.app/api';

// The current season is METRIK PRO: our own tools read it with the API's admin secret.
// Also bundled for Remotion's browser, where there may be no `process`.
const ADMIN_SECRET = globalThis.process?.env?.METRIK_ADMIN_SECRET;

/** Waits out the API's per-minute limits, then tries again */
export async function getJson<T>(url: string, init?: RequestInit, retries = 8): Promise<T> {
  const headers = { ...(init?.headers as Record<string, string>), ...(ADMIN_SECRET ? { 'X-Admin-Secret': ADMIN_SECRET } : {}) };
  const response = await fetch(url, { ...init, headers });
  if (response.status === 429 && retries > 0) {
    await new Promise(resolve => setTimeout(resolve, 15_000));
    return getJson(url, init, retries - 1);
  }
  if (response.status === 401 && !ADMIN_SECRET) throw new Error(`${url}: the current season needs METRIK_ADMIN_SECRET`);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  return response.json();
}

export interface DuelQuery {
  year: number;
  gp: number;
  session: string;
  drivers: [string, string];
  /** Specific laps; fastest laps when omitted */
  laps?: [number | null, number | null];
}

export async function fetchDuel({ year, gp, session, drivers, laps }: DuelQuery, api = API_BASE): Promise<Duel> {
  const [telemetry, sessionDrivers, calendar] = await Promise.all([
    getJson<TelemetryDataMulti>(`${api}/telemetry/multi`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        laps: drivers.map((driver, i) => ({ year, gp, session, driver, lap: laps?.[i] ?? undefined })),
      }),
    }),
    getJson<SessionDriver[]>(`${api}/drivers/${year}/${gp}/${session}`),
    getJson<{ grands_prix: GrandPrix[] }>(`${api}/grands-prix/${year}`),
  ]);
  const location = calendar.grands_prix.find(g => g.round === gp)?.location ?? `Round ${gp}`;
  return prepareDuel(telemetry, sessionDrivers, location);
}

export interface RecapQuery {
  year: number;
  gp: number;
}

/** How many of the classified drivers the recap follows lap by lap */
const FOLLOWED = 10;

export async function fetchRecap({ year, gp }: RecapQuery, api = API_BASE): Promise<Recap> {
  const [season, calendar] = await Promise.all([
    getJson<{ results: SeasonRound[]; sprints: SeasonRound[] }>(`${api}/season/${year}`),
    getJson<{ calendar: { round: number; location: string; date_start: string }[] }>(`${api}/calendar/${year}`),
  ]);
  const results = season.results.find(r => Number(r.round) === gp)?.Results;
  if (!results?.length) throw new Error(`No race result for ${year} round ${gp} yet`);
  const event = calendar.calendar.find(g => g.round === gp);
  const codes = results.slice(0, FOLLOWED).map(r => r.Driver.code).filter((c): c is string => !!c);
  // One at a time: the laps endpoint allows a few calls a minute
  const laps: Record<string, SessionLaps> = {};
  for (const code of codes) laps[code] = await getJson<SessionLaps>(`${api}/session-laps/${year}/${gp}/R/${code}`);
  const duel = await fetchDuel({ year, gp, session: 'R', drivers: [codes[0], codes[1]] }, api);
  return prepareRecap(
    { year, round: gp, location: event?.location ?? duel.location, date: event?.date_start ?? '', seasonRounds: calendar.calendar.length },
    { races: season.results, sprints: season.sprints }, laps, duel,
  );
}

/** A qualifying session: its classification, the top ten's laps and the pole lap against the runner-up's */
export async function fetchQuali({ year, gp }: RecapQuery, api = API_BASE): Promise<Quali> {
  const [season, calendar] = await Promise.all([
    getJson<{ qualifying: { round: string; QualifyingResults: RaceResult[] }[] }>(`${api}/season/${year}`),
    getJson<{ calendar: { round: number; location: string }[] }>(`${api}/calendar/${year}`),
  ]);
  const results = season.qualifying.find(r => Number(r.round) === gp)?.QualifyingResults;
  if (!results?.length) throw new Error(`No qualifying result for ${year} round ${gp} yet`);
  const codes = results.slice(0, FOLLOWED).map(r => r.Driver.code).filter((c): c is string => !!c);
  // One at a time: the laps endpoint allows a few calls a minute
  const laps: Record<string, SessionLaps> = {};
  for (const code of codes) laps[code] = await getJson<SessionLaps>(`${api}/session-laps/${year}/${gp}/Q/${code}`);
  const duel = await fetchDuel({ year, gp, session: 'Q', drivers: [codes[0], codes[1]] }, api);
  const event = calendar.calendar.find(g => g.round === gp);
  return prepareQuali({ year, round: gp, location: event?.location ?? duel.location }, results, laps, duel);
}
