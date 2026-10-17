// A Grand Prix for the recap video: the classification, and lap by lap for
// the drivers the video follows, their times and tyres.
import { teamColor } from '../../../frontend/src/utils/teamColors';
import type { Duel } from '../duel/data';
import { standings, winStreak, type SeasonRound, type Standing } from './season';

export interface RecapDriver {
  code: string;
  name: string;
  team: string;
  color: string;
  /** null for a pit lane start */
  grid: number | null;
  position: number;
  /** "Finished", "Lapped", "Retired"… */
  status: string;
  /** Each lap's time (s) and tyre, for the drivers followed */
  laps: number[] | null;
  compounds: (string | null)[] | null;
}

export interface Recap {
  year: number;
  round: number;
  location: string;
  /** When the race started, ISO */
  date: string;
  /** In classification order */
  drivers: RecapDriver[];
  /** The winner's and the runner-up's best laps, for the site's telemetry page */
  duel: Duel;
  /** The drivers' championship after the race */
  championship: Standing[];
  /** Races in a row the winner has won, this one included */
  streak: number;
  /** Races in the season's calendar */
  seasonRounds: number;
}

/** A classification entry, as the season endpoint gives it (Jolpica's names) */
export interface RaceResult {
  position: string;
  grid?: string;
  points?: string;
  status?: string;
  Driver: { code?: string; familyName: string };
  Constructor?: { name: string };
}

/** A driver's laps, as the session-laps endpoint gives them */
export interface SessionLaps {
  laps: {
    LapNumber: number;
    LapTime: number | null;
    Compound: string | null;
    Sector1Time?: number | null;
    Sector2Time?: number | null;
    Sector3Time?: number | null;
  }[];
}

export const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

/** Lap times with the missing ones filled by the field's median on that lap,
 * so the running totals stay comparable */
export function fillLaps(laps: (number | null)[][]): number[][] {
  const count = Math.max(...laps.map(l => l.length));
  const medians = Array.from({ length: count }, (_, k) => {
    const known = laps.map(l => l[k]).filter((t): t is number => t != null);
    return known.length ? median(known) : 0;
  });
  return laps.map(l => l.map((t, k) => t ?? medians[k]));
}

export function prepareRecap(
  { year, round, location, date, seasonRounds }: { year: number; round: number; location: string; date: string; seasonRounds: number },
  season: { races: SeasonRound[]; sprints: SeasonRound[] }, laps: Record<string, SessionLaps>, duel: Duel,
): Recap {
  const results = season.races.find(r => Number(r.round) === round)?.Results ?? [];
  const followed = results.map(r => r.Driver.code ?? '').filter(code => laps[code]);
  const sorted = (code: string) => [...laps[code].laps].sort((a, b) => a.LapNumber - b.LapNumber);
  const filled = fillLaps(followed.map(code => sorted(code).map(l => l.LapTime)));
  const drivers = results.map((r): RecapDriver => {
    const code = r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase();
    const team = r.Constructor?.name ?? '';
    const grid = Number(r.grid);
    const k = followed.indexOf(code);
    return {
      code, name: r.Driver.familyName, team, color: teamColor(team),
      grid: grid > 0 ? grid : null, position: Number(r.position), status: r.status ?? '',
      laps: k >= 0 ? filled[k] : null,
      compounds: k >= 0 ? sorted(code).map(l => l.Compound) : null,
    };
  });
  return {
    year, round, location, date, drivers, duel, seasonRounds,
    championship: standings(season.races, season.sprints, round),
    streak: drivers.length ? winStreak(season.races, drivers[0].code, round) : 0,
  };
}
