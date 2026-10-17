// The race worked out from the lap times of the drivers followed: who led,
// the gaps lap by lap, the stints, the neutralised laps, and what stands out.
import { median, type Recap, type RecapDriver } from './data';

export interface Stint {
  compound: string | null;
  /** First and last lap, 1-based */
  from: number;
  to: number;
}

/** Runs of laps on the same tyre */
export function stints(compounds: (string | null)[]): Stint[] {
  const runs: Stint[] = [];
  compounds.forEach((compound, k) => {
    const last = runs.at(-1);
    if (last && last.compound === compound) last.to = k + 1;
    else runs.push({ compound, from: k + 1, to: k + 1 });
  });
  return runs;
}

export const cumulative = (laps: number[]): number[] => {
  let total = 0;
  return laps.map(t => (total += t));
};

/** Each driver's gap to the leader at the end of each lap (s), the leader
 * being whoever of them has run the laps in the least time */
export function gapsToLeader(laps: number[][]): number[][] {
  const totals = laps.map(cumulative);
  const count = Math.min(...laps.map(l => l.length));
  const leader = Array.from({ length: count }, (_, k) => Math.min(...totals.map(t => t[k])));
  return totals.map(t => t.slice(0, count).map((time, k) => time - leader[k]));
}

/** Each driver's place among them at the end of each lap, 1 for the leader */
export function placesByLap(gaps: number[][]): number[][] {
  return gaps.map((own, d) => own.map((gap, k) => 1 + gaps.filter((other, e) => e !== d && (other[k] < gap || (other[k] === gap && e < d))).length));
}

/** Stretches of laps the whole field ran slowly: a safety car or a virtual
 * one. The first lap, slow from the standing start, is left out. */
export function neutralisations(laps: number[][], threshold = 1.1): { from: number; to: number }[] {
  const typical = median(laps.flat());
  const count = Math.min(...laps.map(l => l.length));
  const periods: { from: number; to: number }[] = [];
  for (let k = 1; k < count; k++) {
    if (median(laps.map(l => l[k])) <= typical * threshold) continue;
    const last = periods.at(-1);
    if (last && last.to === k) last.to = k + 1;
    else periods.push({ from: k + 1, to: k + 1 });
  }
  return periods;
}

/** A driver's average on clean laps from lap `from`: not the first lap, not a
 * neutralised one, not a pit lap (4 % over their median) */
export function cleanPace(laps: number[], neutralised: { from: number; to: number }[], from = 2): number | null {
  const typical = median(laps);
  const clean = laps.filter((t, k) => k + 1 >= Math.max(2, from) && t < typical * 1.04 && !neutralised.some(n => k + 1 >= n.from && k + 1 <= n.to));
  return clean.length ? clean.reduce((sum, t) => sum + t, 0) / clean.length : null;
}

export interface RaceFacts {
  winner: RecapDriver;
  /** Laps the winner led */
  lapsLed: number;
  totalLaps: number;
  /** The drivers followed, in classification order, with their gaps lap by lap */
  followed: { driver: RecapDriver; gaps: number[]; stints: Stint[] }[];
  neutralised: { from: number; to: number }[];
  /** Fastest lap of those followed */
  fastest: { driver: RecapDriver; lap: number; time: number };
  /** Most places made from the grid */
  climbers: { driver: RecapDriver; gained: number }[];
  /** Ran higher for a while, lost the most places by the flag */
  faller: { driver: RecapDriver; best: number; lap: number; final: number } | null;
  retired: RecapDriver[];
  /** The first lap after the last neutralisation */
  restart: number | null;
  /** Clean-lap pace (s), over the race and from the restart */
  pace: { driver: RecapDriver; overall: number | null; late: number | null }[];
}

/** A place held at least this long counts, not one passed through in the stops */
const HELD = 5;

export function raceFacts(recap: Recap): RaceFacts {
  const withLaps = recap.drivers.filter((d): d is RecapDriver & { laps: number[]; compounds: (string | null)[] } => d.laps != null && d.compounds != null);
  const gaps = gapsToLeader(withLaps.map(d => d.laps));
  const places = placesByLap(gaps);
  const followed = withLaps.map((driver, i) => ({ driver, gaps: gaps[i], stints: stints(driver.compounds) }));
  const winner = recap.drivers[0];
  const w = withLaps.indexOf(winner as (typeof withLaps)[number]);

  let fastest = { driver: withLaps[0], lap: 1, time: Infinity };
  for (const driver of withLaps) driver.laps.forEach((time, k) => { if (time < fastest.time) fastest = { driver, lap: k + 1, time }; });

  let faller: RaceFacts['faller'] = null;
  places.forEach((own, i) => {
    const final = own.at(-1)!;
    for (let k = 0; k + HELD <= own.length; k++) {
      const best = Math.max(...own.slice(k, k + HELD));
      if (best < final && (!faller || final - best > faller.final - faller.best)) faller = { driver: withLaps[i], best, lap: k + 1, final };
    }
  });

  const climbers = recap.drivers
    .filter(d => d.grid != null && d.grid > d.position && !/retired|disqualified/i.test(d.status))
    .map(driver => ({ driver, gained: driver.grid! - driver.position }))
    .sort((a, b) => b.gained - a.gained);

  const neutralised = neutralisations(withLaps.map(d => d.laps));
  const restart = neutralised.length ? neutralised[neutralised.length - 1].to + 1 : null;

  return {
    winner,
    lapsLed: w < 0 ? 0 : places[w].filter(p => p === 1).length,
    totalLaps: Math.min(...withLaps.map(d => d.laps.length)),
    followed,
    neutralised,
    fastest,
    climbers,
    faller,
    retired: recap.drivers.filter(d => /retired|accident|collision|disqualified/i.test(d.status)),
    restart,
    pace: withLaps.map(driver => ({
      driver, overall: cleanPace(driver.laps, neutralised), late: restart ? cleanPace(driver.laps, neutralised, restart) : null,
    })),
  };
}
