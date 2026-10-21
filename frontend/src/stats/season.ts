// Statistics computed from one season's results, without any further request.
import { getApiBase } from '../config';
import { authHeaders } from '../lib/apiAuth';
import type {
  ConstructorStanding, DriverStats, H2HData, JolpicaDriver, RaceClassification,
  RaceLogEntry, ResultEntry, SeasonBundle, SeasonDriver, SeasonRace, SprintH2H, StandingEntry,
} from './types';

// Kept for the whole visit, so going back to a season already seen is instant
const seasonCache = new Map<number, Promise<SeasonBundle>>();

export function fetchSeason(year: number): Promise<SeasonBundle> {
  let pending = seasonCache.get(year);
  if (!pending) {
    pending = authHeaders(year).then(headers => fetch(`${getApiBase()}/season/${year}`, { headers })).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    pending.catch(() => seasonCache.delete(year)); // retried next time
    seasonCache.set(year, pending);
  }
  return pending;
}

// A season that hasn't started has no results to list its drivers from:
// Jolpica's entry list, straight from the browser. Its 429s come without
// CORS headers, so they surface as network errors — both are retried.
export async function fetchEntryList(year: number, retries = 4): Promise<JolpicaDriver[]> {
  try {
    const response = await fetch(`https://api.jolpi.ca/ergast/f1/${year}/drivers.json`);
    if (!response.ok && response.status !== 429) throw new Error(`HTTP ${response.status}`);
    if (response.ok) return (await response.json())?.MRData?.DriverTable?.Drivers ?? [];
  } catch (error) {
    if (retries === 0) {
      console.error(`Entry list unavailable for ${year}:`, error);
      return [];
    }
  }
  if (retries === 0) return [];
  await new Promise(resolve => setTimeout(resolve, Math.min(2000 * 2 ** (4 - retries), 10000)));
  return fetchEntryList(year, retries - 1);
}

export const driverCode = (d: JolpicaDriver): string => d.code || d.familyName.toUpperCase().substring(0, 3);

export const fullName = (d: JolpicaDriver): string => `${d.givenName} ${d.familyName}`;

export const lastName = (name: string): string => name.trim().split(' ').pop() ?? name;

// Ergast statuses for a classified finish: "Finished", "+1 Lap", "Lapped"...
const isFinished = (status = ''): boolean => /Finished|Lap|\+/.test(status);

const entryOf = (race: SeasonRace, key: 'Results' | 'QualifyingResults' | 'SprintResults', driverId: string) =>
  race[key]?.find(r => r.Driver.driverId === driverId);

const positionOf = (position?: string): number | null => (position ? parseInt(position) : null);

const average = (values: number[]): number =>
  values.length > 0 ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 20.0;

/** Everyone who appears in the season's race or qualifying results, by code. */
function findDriver(s: SeasonBundle, code: string): JolpicaDriver | undefined {
  return [...s.results.flatMap(race => race.Results ?? []), ...s.qualifying.flatMap(race => race.QualifyingResults ?? [])]
    .find(r => driverCode(r.Driver) === code)?.Driver;
}

function emptyStats(): DriverStats {
  return {
    wins: 0, podiums: 0, poles: 0, poleWins: 0, points: 0, racePoints: 0, dnfs: 0, dnfCauses: [],
    raceFinishes: [], qualiPositions: [], avgRacePosition: 0, avgQualiPosition: 0,
    qualiWins: 0, raceWins: 0, fastestLaps: 0,
  };
}

function seasonStats(s: SeasonBundle, driverId: string): { stats: DriverStats; team: string } {
  const stats = emptyStats();
  let team = 'Unknown';
  for (const race of s.results) {
    const result = entryOf(race, 'Results', driverId);
    if (!result) continue;
    const position = parseInt(result.position);
    const points = parseFloat(result.points ?? '0');
    stats.racePoints += points;
    if (position === 1) stats.wins += 1;
    if (position <= 3) stats.podiums += 1;
    if (position === 1 && parseInt(result.grid ?? '') === 1) stats.poleWins += 1;
    if (result.FastestLap?.rank === '1') stats.fastestLaps += 1;
    if (isFinished(result.status)) {
      stats.raceFinishes.push(position);
    } else {
      stats.dnfs += 1;
      stats.dnfCauses.push(result.status ?? '');
    }
    team = result.Constructor?.name ?? team;
  }
  for (const race of s.qualifying) {
    const result = entryOf(race, 'QualifyingResults', driverId);
    if (!result) continue;
    const position = parseInt(result.position);
    stats.qualiPositions.push(position);
    if (position === 1) stats.poles += 1;
  }
  // Official championship points include sprints
  const standing = s.driverStandings.find(st => st.Driver.driverId === driverId);
  stats.points = standing ? parseFloat(standing.points) : stats.racePoints;
  stats.avgRacePosition = average(stats.raceFinishes);
  stats.avgQualiPosition = average(stats.qualiPositions);
  return { stats, team };
}

/** Who was classified ahead, in each event both drivers took part in. Ergast
 * positions rank retired drivers by distance covered, so a DNF still counts. */
function classifiedAhead(races: SeasonRace[], key: 'Results' | 'QualifyingResults' | 'SprintResults',
                         id1: string, id2: string): [number, number, number] {
  let wins1 = 0, wins2 = 0, events = 0;
  for (const race of races) {
    const r1 = entryOf(race, key, id1);
    const r2 = entryOf(race, key, id2);
    if (!r1 || !r2) continue;
    events += 1;
    const pos1 = parseInt(r1.position), pos2 = parseInt(r2.position);
    if (pos1 < pos2) wins1 += 1;
    else if (pos2 < pos1) wins2 += 1;
  }
  return [wins1, wins2, events];
}

function sprintH2H(s: SeasonBundle, id1: string, id2: string): SprintH2H | null {
  const [sWins1, sWins2, totalSprints] = classifiedAhead(s.sprints, 'SprintResults', id1, id2);
  if (totalSprints === 0) return null;
  // No sprint-qualifying endpoint: the sprint grid is its classification
  let sqWins1 = 0, sqWins2 = 0;
  for (const race of s.sprints) {
    const grid1 = parseInt(entryOf(race, 'SprintResults', id1)?.grid ?? '');
    const grid2 = parseInt(entryOf(race, 'SprintResults', id2)?.grid ?? '');
    if (grid1 > 0 && grid2 > 0) {
      if (grid1 < grid2) sqWins1 += 1;
      else if (grid2 < grid1) sqWins2 += 1;
    }
  }
  return { sqWins1, sqWins2, sWins1, sWins2, totalSprints };
}

export function headToHead(s: SeasonBundle, code1: string, code2: string): H2HData | null {
  const driver1 = findDriver(s, code1);
  const driver2 = findDriver(s, code2);
  // Briefly expected right after a season change, while the old pair is still selected
  if (!driver1 || !driver2) return null;
  const id1 = driver1.driverId, id2 = driver2.driverId;

  const season1 = seasonStats(s, id1);
  const season2 = seasonStats(s, id2);
  [season1.stats.raceWins, season2.stats.raceWins] = classifiedAhead(s.results, 'Results', id1, id2);
  [season1.stats.qualiWins, season2.stats.qualiWins] = classifiedAhead(s.qualifying, 'QualifyingResults', id1, id2);

  const raceLog: RaceLogEntry[] = [];
  for (const race of s.results) {
    const r1 = entryOf(race, 'Results', id1);
    if (!r1) continue;
    const r2 = entryOf(race, 'Results', id2);
    raceLog.push({
      round: parseInt(race.round),
      raceName: race.raceName,
      pos1: isFinished(r1.status) ? parseInt(r1.position) : null,
      pos2: r2 && isFinished(r2.status) ? parseInt(r2.position) : null,
    });
  }
  raceLog.sort((a, b) => a.round - b.round);

  return {
    year: s.year,
    totalRaces: raceLog.length,
    driver1: { code: code1, name: fullName(driver1), team: season1.team, stats: season1.stats },
    driver2: { code: code2, name: fullName(driver2), team: season2.team, stats: season2.stats },
    raceLog,
    sprint: sprintH2H(s, id1, id2),
  };
}

/** Everyone who raced, with their latest team. */
export function seasonDrivers(s: SeasonBundle): SeasonDriver[] {
  const teams = new Map<string, string>();
  for (const race of s.results) {
    for (const r of race.Results ?? []) teams.set(driverCode(r.Driver), r.Constructor?.name ?? 'Unknown');
  }
  return [...teams].map(([code, team]) => ({ code, team })).sort((a, b) => a.code.localeCompare(b.code));
}

/** Each round's full classification, for the race-log hover card. */
export function raceClassifications(s: SeasonBundle): Record<number, RaceClassification> {
  return Object.fromEntries(s.results.filter(race => race.Results).map(race => [
    parseInt(race.round),
    {
      raceName: race.raceName,
      results: (race.Results as ResultEntry[])
        .map(r => ({ position: parseInt(r.position), code: driverCode(r.Driver), name: fullName(r.Driver), team: r.Constructor?.name || 'Unknown' }))
        .sort((a, b) => a.position - b.position),
    },
  ]));
}

export function driverStandings(s: SeasonBundle): StandingEntry[] {
  return s.driverStandings.map(st => ({
    position: positionOf(st.position),
    code: driverCode(st.Driver),
    name: fullName(st.Driver),
    team: st.Constructors?.[0]?.name || 'Unknown',
    points: parseFloat(st.points),
  }));
}

export function constructorStandings(s: SeasonBundle): ConstructorStanding[] {
  return s.constructorStandings.map(st => ({
    position: positionOf(st.position),
    name: st.Constructor.name,
    points: parseFloat(st.points),
  }));
}
