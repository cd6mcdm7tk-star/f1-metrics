// What a qualifying session says: the gaps to pole, who owns each sector, the
// lap someone had in them without putting it together, the teammates' duels.
import type { Quali, QualiDriver } from './data';

export interface QualiFacts {
  pole: QualiDriver;
  /** The drivers followed with a time, and their gap to pole (s) */
  gaps: { driver: QualiDriver; gap: number }[];
  /** How many are within this of pole, pole included */
  within: { gap: Close; count: number };
  /** The quickest in each sector */
  sectors: { driver: QualiDriver; time: number }[];
  /** A driver whose best sectors add up to less than the pole lap */
  ideal: { driver: QualiDriver; time: number; underPole: number } | null;
  /** Teammates both followed, the quicker first */
  teammates: { ahead: QualiDriver; behind: QualiDriver; gap: number }[];
}

/** The gaps the session's "how close" figure can be counted within: the
 * smallest that holds a few drivers, or the largest */
export const CLOSE = [0.2, 0.5, 1] as const;
export type Close = (typeof CLOSE)[number];
const GROUP = 3;

export function qualiFacts(quali: Quali): QualiFacts {
  const timed = quali.drivers.filter((d): d is QualiDriver & { best: number } => d.best != null);
  const pole = quali.drivers[0];
  const poleTime = pole.best ?? Math.min(...timed.map(d => d.best));
  const gaps = timed.map(driver => ({ driver, gap: driver.best - poleTime }));

  const sectors: QualiFacts['sectors'] = [];
  for (const k of [0, 1, 2]) {
    const withSector = timed.filter(d => d.bestSectors[k] != null);
    if (!withSector.length) continue;
    const driver = withSector.reduce((a, b) => (b.bestSectors[k]! < a.bestSectors[k]! ? b : a));
    sectors.push({ driver, time: driver.bestSectors[k]! });
  }

  const beaters = timed.filter(d => d !== pole && d.ideal != null && d.ideal < poleTime).sort((a, b) => a.ideal! - b.ideal!);
  const ideal = beaters.length ? { driver: beaters[0], time: beaters[0].ideal!, underPole: poleTime - beaters[0].ideal! } : null;

  const teammates: QualiFacts['teammates'] = [];
  for (const ahead of timed) {
    const behind = timed.find(d => d !== ahead && d.team === ahead.team && d.position > ahead.position);
    if (behind) teammates.push({ ahead, behind, gap: behind.best - ahead.best });
  }

  const counts = CLOSE.map(gap => ({ gap, count: gaps.filter(g => g.gap < gap).length }));
  const within = counts.find(c => c.count >= GROUP) ?? counts[counts.length - 1];

  return { pole, gaps, within, sectors, ideal, teammates };
}
