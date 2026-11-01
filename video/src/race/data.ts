// A race for its Sunday video, straight after the flag: the classification,
// grid, stints, laps and race control from OpenF1 (Jolpica publishes hours
// later), the standings before the race and the fastest lap's telemetry from
// our API.
import type { SessionDriver } from '../../../frontend/src/types/session';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import { API_BASE, fetchLapsTelemetry, fetchLastYearsCorners, getJson } from '../api';
import { prepareDuel, type Duel } from '../duel/data';
import { withCornersFrom } from '../kit/corners';
import { driverCodes, openF1, sessionKey } from '../openf1';

export type Compound = 'SOFT' | 'MEDIUM' | 'HARD' | 'INTERMEDIATE' | 'WET';

export interface RaceDriver {
  code: string;
  name: string;
  team: string;
  color: string;
  grid: number | null;
  /** Classified place, null when retired */
  position: number | null;
  laps: number;
  /** Behind the winner (s), for those on the lead lap */
  gap: number | null;
  points: number;
}

export interface Neutralisation {
  kind: 'SC' | 'VSC' | 'RED';
  from: number;
  to: number;
}

export interface RaceWeekend {
  year: number;
  round: number;
  location: string;
  totalLaps: number;
  /** In classification order, retirements last */
  drivers: RaceDriver[];
  /** Each driver's place at the end of each lap (index 0: lap 1), null once out */
  positions: Record<string, (number | null)[]>;
  stints: Record<string, { compound: Compound; from: number; to: number }[]>;
  lapTimes: Record<string, (number | null)[]>;
  neutralised: Neutralisation[];
  /** The drivers' standings before the race, what is left to race after it, and where next */
  standings: [string, number][];
  remaining: { races: number; sprints: number };
  next: string | null;
  /** The race's fastest lap against the winner's lap of the same number */
  fastest: { code: string; lap: number; time: number };
  duel: Duel;
}

interface Lap { driver_number: number; lap_number: number; date_start: string | null; lap_duration: number | null; is_pit_out_lap: boolean }

const lastName = (fullName: string): string => {
  const last = fullName.trim().split(/\s+/).pop() ?? fullName;
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
};

/** Places at the end of each lap: the order the cars crossed the line on that lap */
export function placesByLap(laps: { code: string; lap: number; end: number }[], totalLaps: number): Record<string, (number | null)[]> {
  const codes = [...new Set(laps.map(l => l.code))];
  const places: Record<string, (number | null)[]> = Object.fromEntries(codes.map(c => [c, Array(totalLaps).fill(null)]));
  for (let lap = 1; lap <= totalLaps; lap++) {
    laps.filter(l => l.lap === lap).sort((a, b) => a.end - b.end).forEach((l, i) => { places[l.code][lap - 1] = i + 1; });
  }
  return places;
}

/** Each lap's end: the next lap's start, or its own start plus its time */
function lapEnds(laps: Lap[], code: Map<number, string>): { code: string; lap: number; end: number }[] {
  const byDriver = new Map<number, Map<number, Lap>>();
  for (const l of laps) {
    if (!byDriver.has(l.driver_number)) byDriver.set(l.driver_number, new Map());
    byDriver.get(l.driver_number)!.set(l.lap_number, l);
  }
  const ends: { code: string; lap: number; end: number }[] = [];
  for (const [number, own] of byDriver) {
    for (const [lap, l] of own) {
      const next = own.get(lap + 1)?.date_start;
      const end = next ? Date.parse(next) : l.date_start && l.lap_duration ? Date.parse(l.date_start) + l.lap_duration * 1000 : null;
      if (end != null && code.has(number)) ends.push({ code: code.get(number)!, lap, end });
    }
  }
  return ends;
}

export function neutralisations(messages: { lap_number: number | null; category: string; message: string }[]): Neutralisation[] {
  const spans: Neutralisation[] = [];
  let open: { kind: Neutralisation['kind']; from: number } | null = null;
  for (const m of messages) {
    const lap = m.lap_number ?? 0;
    const kind = m.message.includes('VIRTUAL') || m.message.startsWith('VSC') ? 'VSC' : m.message.includes('RED FLAG') ? 'RED' : m.message.includes('SAFETY CAR') ? 'SC' : null;
    if (!kind || (m.category !== 'SafetyCar' && kind !== 'RED')) continue;
    if (/DEPLOYED|RED FLAG/.test(m.message) && !open) open = { kind, from: lap };
    else if (/ENDING|IN THIS LAP|RESUME/.test(m.message) && open) { spans.push({ ...open, to: lap }); open = null; }
  }
  return spans;
}

export async function fetchRaceWeekend({ year, gp }: { year: number; gp: number }, api = API_BASE): Promise<RaceWeekend> {
  const [calendar, grandsPrix, sessionDrivers, season] = await Promise.all([
    getJson<{ calendar: { round: number; location: string }[] }>(`${api}/calendar/${year}`),
    getJson<{ grands_prix: { round: number; is_sprint: boolean }[] }>(`${api}/grands-prix/${year}`),
    getJson<SessionDriver[]>(`${api}/drivers/${year}/${gp}/R`),
    getJson<{ results: unknown[]; driverStandings: { points: string; Driver: { code: string } }[] }>(`${api}/season/${year}`),
  ]);
  const location = calendar.calendar.find(g => g.round === gp)?.location;
  if (!location) throw new Error(`No round ${gp} in ${year}`);
  if (season.results.length !== gp - 1) throw new Error(`The standings cover ${season.results.length} rounds, not the ${gp - 1} before this race`);

  const [race, quali] = [await sessionKey(year, location, 'Race'), await sessionKey(year, location, 'Qualifying')];
  const code = await driverCodes(race);
  // One after the other: OpenF1 allows a few requests a second
  const results = await openF1<{ driver_number: number; position: number | null; number_of_laps: number; gap_to_leader: number | string | null; points: number | null }[]>(`/session_result?session_key=${race}`);
  const grid = await openF1<{ driver_number: number; position: number }[]>(`/starting_grid?session_key=${quali}`);
  const stints = await openF1<{ driver_number: number; compound: Compound; lap_start: number; lap_end: number }[]>(`/stints?session_key=${race}`);
  const laps = await openF1<Lap[]>(`/laps?session_key=${race}`);
  const control = await openF1<{ lap_number: number | null; category: string; message: string }[]>(`/race_control?session_key=${race}`);

  const totalLaps = Math.max(...results.map(r => r.number_of_laps));
  const gridOf = new Map(grid.map(g => [g.driver_number, g.position]));
  const drivers = results
    .filter(r => code.has(r.driver_number))
    .sort((a, b) => (a.position ?? 99) - (b.position ?? 99) || b.number_of_laps - a.number_of_laps)
    .map((r): RaceDriver => {
      const info = sessionDrivers.find(d => d.abbreviation === code.get(r.driver_number));
      return {
        code: code.get(r.driver_number)!, name: lastName(info?.fullName ?? ''), team: info?.team ?? '', color: teamColor(info?.team ?? ''),
        grid: gridOf.get(r.driver_number) ?? null, position: r.position, laps: r.number_of_laps,
        gap: typeof r.gap_to_leader === 'number' ? r.gap_to_leader : null, points: r.points ?? 0,
      };
    });

  const lapTimes: RaceWeekend['lapTimes'] = Object.fromEntries(drivers.map(d => [d.code, Array(totalLaps).fill(null)]));
  for (const l of laps) {
    const c = code.get(l.driver_number);
    if (c && lapTimes[c] && l.lap_duration) lapTimes[c][l.lap_number - 1] = l.lap_duration;
  }
  const fastestLap = laps.filter(l => l.lap_duration && !l.is_pit_out_lap).reduce((a, b) => (b.lap_duration! < a.lap_duration! ? b : a));
  const fastest = { code: code.get(fastestLap.driver_number)!, lap: fastestLap.lap_number, time: fastestLap.lap_duration! };

  const winner = drivers[0];
  const raw = await fetchLapsTelemetry([
    { year, gp, session: 'R', driver: winner.code, lap: fastest.lap },
    { year, gp, session: 'R', driver: fastest.code, lap: fastest.lap },
  ], api);
  const earlier = raw.corners.length ? null : await fetchLastYearsCorners(year, location, api);
  const duel = prepareDuel(earlier ? withCornersFrom(raw, earlier) : raw, sessionDrivers, location);

  const later = grandsPrix.grands_prix.filter(g => g.round > gp);
  return {
    year, round: gp, location, totalLaps, drivers,
    positions: placesByLap(lapEnds(laps, code), totalLaps),
    stints: Object.fromEntries(drivers.map(d => [d.code, stints
      .filter(s => code.get(s.driver_number) === d.code)
      .sort((a, b) => a.lap_start - b.lap_start)
      .map(s => ({ compound: s.compound, from: s.lap_start, to: s.lap_end }))])),
    lapTimes,
    neutralised: neutralisations(control),
    standings: season.driverStandings.map(s => [s.Driver.code, Number(s.points)]),
    remaining: { races: later.length, sprints: later.filter(g => g.is_sprint).length },
    next: calendar.calendar.find(g => g.round === gp + 1)?.location ?? null,
    fastest,
    duel,
  };
}
