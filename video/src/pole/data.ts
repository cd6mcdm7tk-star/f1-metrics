// A qualifying session told through its top six: the official order from
// OpenF1 (Jolpica publishes it hours later), each driver's deciding lap from
// our API, their telemetry together, and the pole lap against the runner-up's.
import type { SessionDriver } from '../../../frontend/src/types/session';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import { API_BASE, getJson } from '../api';
import { prepareDuel, type Duel } from '../duel/data';
import { withCornersFrom } from '../kit/corners';
import type { SessionLaps } from '../recap/data';

const OPENF1 = 'https://api.openf1.org/v1';
/** How many of the classified drivers the video follows */
export const FOLLOWED = 6;
/** How close a lap time must be to the official one to be that lap (s) */
const SAME_LAP = 0.002;

export type Segments = [number | null, number | null, number | null];

export interface PoleDriver {
  code: string;
  name: string;
  team: string;
  color: string;
  position: number;
  /** Best time in Q1, Q2 and Q3 (s) */
  segments: Segments;
  /** The lap that set their place: its number, time and sectors */
  lap: number;
  time: number;
  sectors: Segments;
}

export interface PoleSession {
  year: number;
  round: number;
  location: string;
  /** The drivers followed, in classification order */
  drivers: PoleDriver[];
  /** Their deciding laps together, in the same order */
  telemetry: TelemetryDataMulti;
  /** The pole lap against the runner-up's */
  duel: Duel;
}

/** OpenF1 is public: plain requests, without our API's admin header */
async function openF1<T>(path: string): Promise<T> {
  const response = await fetch(`${OPENF1}${path}`);
  if (!response.ok) throw new Error(`${OPENF1}${path}: HTTP ${response.status}`);
  return response.json();
}

interface OfficialResult {
  code: string;
  position: number;
  segments: Segments;
}

/** The qualifying classification, with each driver's best time per segment */
async function officialOrder(year: number, location: string): Promise<OfficialResult[]> {
  const sessions = await openF1<{ session_key: number }[]>(`/sessions?year=${year}&location=${encodeURIComponent(location)}&session_name=Qualifying`);
  if (!sessions.length) throw new Error(`No qualifying session on OpenF1 for ${location} ${year}`);
  const key = sessions[0].session_key;
  const [results, drivers] = await Promise.all([
    openF1<{ driver_number: number; position: number | null; duration: (number | null)[] | number | null }[]>(`/session_result?session_key=${key}`),
    openF1<{ driver_number: number; name_acronym: string }[]>(`/drivers?session_key=${key}`),
  ]);
  const code = new Map(drivers.map(d => [d.driver_number, d.name_acronym]));
  return results
    .filter((r): r is typeof r & { position: number } => r.position != null && code.has(r.driver_number))
    .sort((a, b) => a.position - b.position)
    .map(r => {
      const times = Array.isArray(r.duration) ? r.duration : [r.duration];
      return { code: code.get(r.driver_number)!, position: r.position, segments: [times[0] ?? null, times[1] ?? null, times[2] ?? null] };
    });
}

/** The time that set a driver's place: their last segment's */
export const decidingTime = (segments: Segments): number | null => [...segments].reverse().find(t => t != null) ?? null;

const lastName = (fullName: string): string => {
  const last = fullName.trim().split(/\s+/).pop() ?? fullName;
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
};

export async function fetchPoleSession({ year, gp }: { year: number; gp: number }, api = API_BASE): Promise<PoleSession> {
  const [calendar, sessionDrivers] = await Promise.all([
    getJson<{ calendar: { round: number; location: string }[] }>(`${api}/calendar/${year}`),
    getJson<SessionDriver[]>(`${api}/drivers/${year}/${gp}/Q`),
  ]);
  const location = calendar.calendar.find(g => g.round === gp)?.location;
  if (!location) throw new Error(`No round ${gp} in ${year}`);
  const order = (await officialOrder(year, location)).slice(0, FOLLOWED);

  const drivers: PoleDriver[] = [];
  // One at a time: the laps endpoint allows a few calls a minute
  for (const result of order) {
    const laps = (await getJson<SessionLaps>(`${api}/session-laps/${year}/${gp}/Q/${result.code}`)).laps.filter(l => l.LapTime);
    const time = decidingTime(result.segments);
    const lap = laps.find(l => time != null && Math.abs(l.LapTime! - time) < SAME_LAP)
      ?? laps.reduce((a, b) => (b.LapTime! < a.LapTime! ? b : a));
    const info = sessionDrivers.find(d => d.abbreviation === result.code);
    drivers.push({
      code: result.code, name: lastName(info?.fullName ?? result.code), team: info?.team ?? '', color: teamColor(info?.team ?? ''),
      position: result.position, segments: result.segments,
      lap: lap.LapNumber, time: time ?? lap.LapTime!, sectors: [lap.Sector1Time ?? null, lap.Sector2Time ?? null, lap.Sector3Time ?? null],
    });
  }

  const lapsTelemetry = (laps: { driver: string; lap?: number }[], season = year, round = gp) => getJson<TelemetryDataMulti>(`${api}/telemetry/multi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ laps: laps.map(l => ({ year: season, gp: round, session: 'Q', ...l })) }),
  });
  const raw = await lapsTelemetry(drivers.map(d => ({ driver: d.code, lap: d.lap })));
  const [pole, second] = drivers;
  const rawDuel = await lapsTelemetry([{ driver: pole.code, lap: pole.lap }, { driver: second.code, lap: second.lap }]);
  // Corner numbers from last year's qualifying on the same circuit, when this season has none yet
  const earlier = raw.corners.length ? null : await lastYearsCorners(year, location, api, lapsTelemetry);
  const telemetry = earlier ? withCornersFrom(raw, earlier) : raw;
  const duel = prepareDuel(earlier ? withCornersFrom(rawDuel, earlier) : rawDuel, sessionDrivers, location);
  return { year, round: gp, location, drivers, telemetry, duel };
}

async function lastYearsCorners(
  year: number, location: string, api: string,
  lapsTelemetry: (laps: { driver: string }[], season: number, round: number) => Promise<TelemetryDataMulti>,
): Promise<TelemetryDataMulti | null> {
  const calendar = await getJson<{ calendar: { round: number; location: string }[] }>(`${api}/calendar/${year - 1}`);
  const round = calendar.calendar.find(g => g.location === location)?.round;
  if (round == null) return null;
  const sessionDrivers = await getJson<SessionDriver[]>(`${api}/drivers/${year - 1}/${round}/Q`);
  if (sessionDrivers.length < 2) return null;
  return lapsTelemetry(sessionDrivers.slice(0, 2).map(d => ({ driver: d.abbreviation })), year - 1, round);
}
