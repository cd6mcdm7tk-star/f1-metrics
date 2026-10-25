// What the top six's qualifying says, for the screen: the gaps to pole, how
// many fit in a few tenths, the teammates' duels, a driver who had a better
// time in an earlier segment, who owns each sector, the top speeds, and
// where the pole lap was won and partly given back.
import { analyse, type Corner } from '../duel/analysis';
import { interpolate } from '../duel/data';
import type { PoleDriver, PoleSession } from './data';

export interface PoleFacts {
  /** Each followed driver's gap to pole (s) */
  gaps: number[];
  /** How many are within this of pole, pole included */
  within: { gap: number; count: number };
  /** Teammates both followed, the quicker first */
  teammates: { ahead: PoleDriver; behind: PoleDriver; gap: number }[];
  /** Drivers quicker in an earlier segment than on their deciding lap, and where that time would have put them */
  earlier: { driver: PoleDriver; segment: number; time: number; wouldBe: number }[];
  /** The quickest of the followed laps in each sector, and where each sector ends on the lap (m) */
  sectors: { driver: PoleDriver; time: number; to: number }[];
  /** Each followed lap's top speed (km/h) */
  topSpeeds: number[];
  /** The corner where pole gained most on the runner-up, and the one where it lost most */
  gain: Corner;
  loss: Corner;
  /** The stretches between mid-straights where pole gained on the runner-up, in lap order */
  won: { from: number; to: number; gap: number }[];
}

/** The gaps "how close" can be counted within: the smallest holding a group */
const CLOSE = [0.1, 0.2, 0.3, 0.5, 1];
const GROUP = 4;

export function poleFacts(session: PoleSession): PoleFacts {
  const { drivers, telemetry, duel } = session;
  const pole = drivers[0];
  const gaps = drivers.map(d => d.time - pole.time);
  const counts = CLOSE.map(gap => ({ gap, count: gaps.filter(g => g < gap).length }));
  const within = counts.find(c => c.count >= GROUP) ?? counts[counts.length - 1];

  const teammates: PoleFacts['teammates'] = [];
  drivers.forEach((ahead, i) => {
    const behind = drivers.slice(i + 1).find(d => d.team === ahead.team);
    if (behind) teammates.push({ ahead, behind, gap: behind.time - ahead.time });
  });

  const earlier = drivers.flatMap(driver => {
    const best = driver.segments.slice(0, -1).reduce<{ segment: number; time: number } | null>(
      (found, time, segment) => (time != null && time < driver.time && (!found || time < found.time) ? { segment: segment + 1, time } : found), null);
    if (!best) return [];
    const wouldBe = 1 + drivers.filter(d => d !== driver && d.time < best.time).length;
    return wouldBe < driver.position ? [{ driver, ...best, wouldBe }] : [];
  });

  // Where each sector ends on the lap: when the pole lap's clock reaches its sector times
  let clock = 0;
  const sectors = [0, 1, 2].map(k => {
    const withSector = drivers.filter(d => d.sectors[k] != null);
    const driver = withSector.reduce((a, b) => (b.sectors[k]! < a.sectors[k]! ? b : a));
    clock += pole.sectors[k] ?? 0;
    const to = k === 2 ? duel.distance[duel.distance.length - 1] : interpolate(duel.time[0], duel.distance, clock);
    return { driver, time: driver.sectors[k]!, to };
  });

  const topSpeeds = drivers.map((_, i) => Math.max(...telemetry.telemetry.map(p => p.speeds[i] ?? 0)));
  const sections = analyse(duel).sections;
  const corners = sections.flatMap(s => s.corners);
  const won = sections.filter(s => s.gapChange > 0).map(s => ({ from: s.from, to: s.to, gap: s.gapChange }));
  const gain = corners.reduce((a, b) => (b.gapChange > a.gapChange ? b : a));
  const loss = corners.reduce((a, b) => (b.gapChange < a.gapChange ? b : a));

  return { gaps, within, teammates, earlier, sectors, topSpeeds, gain, loss, won };
}
