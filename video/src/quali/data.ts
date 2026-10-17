// A qualifying session for its recap: the classification, and for the drivers
// followed their best lap and best sectors.
import { teamColor } from '../../../frontend/src/utils/teamColors';
import type { Duel } from '../duel/data';
import type { RaceResult, SessionLaps } from '../recap/data';

export type Sectors = [number | null, number | null, number | null];

export interface QualiDriver {
  code: string;
  name: string;
  team: string;
  color: string;
  position: number;
  /** Their best lap of the session (s), for the drivers followed */
  best: number | null;
  /** Their best time in each sector, from any lap */
  bestSectors: Sectors;
  /** Their best sectors added up: the lap they had in them */
  ideal: number | null;
  /** Laps they set a time on */
  laps: number;
}

export interface Quali {
  year: number;
  round: number;
  location: string;
  /** In classification order */
  drivers: QualiDriver[];
  /** The pole lap against the runner-up's, on the site's telemetry page */
  duel: Duel;
}

const SECTOR_KEYS = ['Sector1Time', 'Sector2Time', 'Sector3Time'] as const;

export function prepareQuali(
  { year, round, location }: { year: number; round: number; location: string },
  results: RaceResult[], laps: Record<string, SessionLaps>, duel: Duel,
): Quali {
  const drivers = results.map((r): QualiDriver => {
    const code = r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase();
    const team = r.Constructor?.name ?? '';
    const timed = (laps[code]?.laps ?? []).filter(l => l.LapTime);
    const bestSectors = SECTOR_KEYS.map(key => {
      const times = timed.map(l => l[key]).filter((t): t is number => !!t);
      return times.length ? Math.min(...times) : null;
    }) as Sectors;
    return {
      code, name: r.Driver.familyName, team, color: teamColor(team), position: Number(r.position),
      best: timed.length ? Math.min(...timed.map(l => l.LapTime!)) : null,
      bestSectors,
      ideal: bestSectors.every(t => t != null) ? bestSectors.reduce((sum, t) => sum! + t!, 0) : null,
      laps: timed.length,
    };
  });
  return { year, round, location, drivers, duel };
}
