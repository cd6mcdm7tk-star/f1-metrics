// Reads two laps like a race engineer: where the time went, corner by corner,
// and what the charts show about it.
//
// The gap between two laps is only reliable where both cars go at similar
// speeds: under braking, a few metres of misalignment between the laps'
// distances swing it by tenths. So time is measured between speed peaks, and
// the lap is cut into sections in the middle of the straights both drivers
// take flat out. Speed and pedals are sampled every ~20 m at top speed, so
// smaller differences in where things happen are not reported.
import { interpolate, type Duel } from './data';

/** 0: the faster lap, 1: the slower */
export type Side = 0 | 1;

interface Channels {
  speed: number[];
  throttle: number[];
  brake: boolean[];
  gear: number[];
}

/** One driver through one corner (distances in m, speeds in km/h) */
export interface CornerPhases {
  /** Braking, or lifting below half throttle, if the corner needs it */
  slowAt: number | null;
  brakeAt: number | null;
  apexAt: number;
  minSpeed: number;
  gear: number;
  /** Back to full throttle, held */
  fullThrottleAt: number | null;
  /** The throttle closing again on the way out, by `depth` points */
  lift: { from: number; to: number; depth: number } | null;
}

/** What the charts show, with where to point at it. `side` is the driver it
 * favours; `score` how telling it is (1: just above the data's resolution). */
export type Finding = { score: number } & (
  | { kind: 'braking'; side: Side; by: number; at: [number, number]; pedal: 'brake' | 'lift' }
  | { kind: 'liftOnly'; side: Side; at: number }
  | { kind: 'entrySpeed'; side: Side; by: number; from: number; to: number }
  | { kind: 'apexSpeed'; side: Side; by: number; at: [number, number]; speeds: [number, number] }
  | { kind: 'gear'; gears: [number, number]; at: [number, number] }
  | { kind: 'throttle'; side: Side; by: number; at: [number, number] }
  | { kind: 'lift'; side: Side; depth: number; from: number; to: number; speedGain: [number, number] }
  | { kind: 'exitSpeed'; side: Side; by: number; from: number; to: number }
  | { kind: 'cornerSpeed'; side: Side; by: number; from: number; to: number }
  | { kind: 'straightSpeed'; side: Side; by: number; from: number; to: number; topSpeeds: [number, number]; time: number }
);

type Unscored<F> = F extends Finding ? Omit<F, 'score'> : never;

export interface Corner {
  /** The official corner nearest the apex */
  label: string;
  /** The speed peaks either side (m) */
  from: number;
  to: number;
  apexAt: number;
  /** Time the slower lap lost from peak to peak (s, negative: gained) */
  gapChange: number;
  phases: [CornerPhases, CornerPhases];
  /** Most telling first */
  findings: Finding[];
}

export interface Section {
  /** Mid-straight, both cars flat out (m) */
  from: number;
  to: number;
  gapChange: number;
  /** None in a section of flat-out kinks */
  corners: Corner[];
  /** Speed on its flat-out stretches, when one car is clearly quicker there */
  straight: Extract<Finding, { kind: 'straightSpeed' }> | null;
}

export interface Analysis {
  sections: Section[];
  topSpeed: [number, number];
  /** Share of the lap flat out */
  fullThrottle: [number, number];
}

const FLAT_OUT = 97;
const MIN_STRAIGHT = 120;
/** Speed drop that makes a corner (km/h) */
const CORNER_DROP = 12;
/** How far either side of the shared apex each driver's own apex may be (m) */
const APEX_WINDOW = 60;
const EXIT_LENGTH = 100;
// Below these, a difference is within the data's resolution
const MIN_POSITION_DIFF = 20;
const MIN_APEX_DIFF = 4;
const MIN_ENTRY_DIFF = 6;
const MIN_EXIT_DIFF = 4;
const MIN_CORNER_DIFF = 2;
const MIN_LIFT = 15;
const MIN_STRAIGHT_DIFF = 3;
/** Flat-out distance a section needs for its straight-line speed to count (m) */
const MIN_FLAT_LENGTH = 250;

function channels(duel: Duel, side: Side): Channels {
  const lap = duel.order[side];
  const points = duel.telemetry.telemetry;
  return {
    speed: points.map(p => p.speeds[lap]),
    throttle: points.map(p => p.throttles[lap]),
    brake: points.map(p => p.brakes[lap]),
    gear: points.map(p => p.gears[lap]),
  };
}

const range = (distance: number[], from: number, to: number) =>
  distance.map((d, i) => (d >= from && d <= to ? i : -1)).filter(i => i >= 0);

/** Midpoints of the stretches both cars take flat out, away from the line */
export function straightMidpoints(distance: number[], flat: boolean[]): number[] {
  const mids: number[] = [];
  let start = -1;
  for (let i = 0; i <= distance.length; i++) {
    if (i < distance.length && flat[i]) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0) {
      const end = i - 1;
      const touchesLine = start === 0 || end === distance.length - 1;
      if (!touchesLine && distance[end] - distance[start] >= MIN_STRAIGHT) mids.push((distance[start] + distance[end]) / 2);
      start = -1;
    }
  }
  return mids;
}

/** The longest run of consecutive indices in `idx` where `flat` holds */
function longestRun(idx: number[], flat: boolean[]): number[] {
  let best: number[] = [], run: number[] = [];
  for (const i of idx) {
    run = flat[i] ? [...run, i] : [];
    if (run.length > best.length) best = run;
  }
  return best;
}

/** The corners (speed valleys) in `idx`, and the speed peaks between them */
export function valleys(speed: number[], idx: number[]): { valleys: number[]; peaks: number[] } {
  const found: number[] = [], peaks: number[] = [];
  let peak = idx[0], low = idx[0], seeking: 'valley' | 'peak' = 'valley';
  for (const i of idx) {
    if (seeking === 'valley') {
      if (speed[i] > speed[peak] && speed[low] >= speed[peak] - CORNER_DROP) { peak = i; low = i; }
      if (speed[i] < speed[low]) low = i;
      if (speed[peak] - speed[low] >= CORNER_DROP && speed[i] >= speed[low] + CORNER_DROP) {
        found.push(low);
        seeking = 'peak';
        peak = i;
      }
    } else {
      if (speed[i] > speed[peak]) peak = i;
      if (speed[i] <= speed[peak] - CORNER_DROP) {
        peaks.push(peak);
        seeking = 'valley';
        low = i;
      }
    }
  }
  return { valleys: found, peaks };
}

function phases(distance: number[], c: Channels, from: number, to: number, apexRef: number): CornerPhases {
  const near = range(distance, Math.max(from, apexRef - APEX_WINDOW), Math.min(to, apexRef + APEX_WINDOW));
  const apex = near.reduce((best, i) => (c.speed[i] < c.speed[best] ? i : best), near[0]);
  const before = range(distance, from, distance[apex]);
  const after = range(distance, distance[apex], to).slice(1);

  // The corner runs from a speed peak, so the first braking or big lift is its own
  const slow = before.find(i => c.brake[i] || c.throttle[i] < 50);
  const brake = before.find(i => c.brake[i]);

  // Full throttle that holds, not a blip
  const holds = (i: number) => after.filter(j => distance[j] >= distance[i] && distance[j] <= distance[i] + 30).every(j => c.throttle[j] >= FLAT_OUT);
  const full = after.find(i => c.throttle[i] >= FLAT_OUT && holds(i));

  // The throttle closing again once the driver has started to open it,
  // until it is back where it was
  let lift: CornerPhases['lift'] = null;
  let peak = -1;
  for (const i of after) {
    if (full !== undefined && i >= full) break;
    if (peak < 0 || c.throttle[i] >= c.throttle[peak]) { peak = i; continue; }
    const depth = c.throttle[peak] - c.throttle[i];
    // Not when it never opens again: that is the next corner's braking
    const back = after.find(j => j > i && c.throttle[j] >= c.throttle[peak]);
    if (c.throttle[peak] >= 40 && depth >= MIN_LIFT && back !== undefined && (!lift || depth > lift.depth)) {
      lift = { from: distance[peak], to: distance[back], depth };
    }
  }

  return {
    slowAt: slow !== undefined ? distance[slow] : null,
    brakeAt: brake !== undefined ? distance[brake] : null,
    apexAt: distance[apex],
    minSpeed: c.speed[apex],
    gear: c.gear[apex],
    fullThrottleAt: full !== undefined ? distance[full] : null,
    lift,
  };
}

/** Mean of the faster lap's speed minus the slower's over a stretch */
function meanSpeedDiff(distance: number[], laps: [Channels, Channels], from: number, to: number): number {
  const idx = range(distance, from, to);
  if (!idx.length) return 0;
  return idx.reduce((sum, i) => sum + laps[0].speed[i] - laps[1].speed[i], 0) / idx.length;
}

function findings(distance: number[], laps: [Channels, Channels], p: [CornerPhases, CornerPhases], apexRef: number, to: number): Finding[] {
  const scored: Finding[] = [];
  const add = (finding: Unscored<Finding>, score: number) => scored.push({ ...finding, score } as Finding);
  const round5 = (m: number) => Math.round(m / 5) * 5;

  // Braking later, or lifting later where neither brakes
  const [b0, b1] = [p[0].brakeAt, p[1].brakeAt];
  const [s0, s1] = [p[0].slowAt, p[1].slowAt];
  const point = b0 != null && b1 != null ? { pedal: 'brake' as const, at: [b0, b1] } : b0 == null && b1 == null && s0 != null && s1 != null ? { pedal: 'lift' as const, at: [s0, s1] } : null;
  if (point && Math.abs(point.at[0] - point.at[1]) >= MIN_POSITION_DIFF) {
    const diff = point.at[0] - point.at[1];
    add({ kind: 'braking', side: diff > 0 ? 0 : 1, by: round5(Math.abs(diff)), at: point.at as [number, number], pedal: point.pedal }, Math.abs(diff) / MIN_POSITION_DIFF);
  }
  // One brakes, the other only lifts off
  if ((b0 == null) !== (b1 == null)) {
    const side: Side = b0 == null ? 0 : 1;
    add({ kind: 'liftOnly', side, at: (side === 0 ? b1 : b0)! }, 2);
  }

  const starts = [s0, s1].filter((d): d is number => d != null);
  const entryFrom = starts.length ? Math.min(...starts) : apexRef;
  const entry = meanSpeedDiff(distance, laps, entryFrom, apexRef);
  if (Math.abs(entry) >= MIN_ENTRY_DIFF) {
    add({ kind: 'entrySpeed', side: entry > 0 ? 0 : 1, by: Math.round(Math.abs(entry)), from: entryFrom, to: apexRef }, Math.abs(entry) / MIN_ENTRY_DIFF);
  }

  const apexDiff = p[0].minSpeed - p[1].minSpeed;
  if (Math.abs(apexDiff) >= MIN_APEX_DIFF) {
    add({
      kind: 'apexSpeed', side: apexDiff > 0 ? 0 : 1, by: Math.round(Math.abs(apexDiff)),
      at: [p[0].apexAt, p[1].apexAt], speeds: [Math.round(p[0].minSpeed), Math.round(p[1].minSpeed)],
    }, Math.abs(apexDiff) / MIN_APEX_DIFF);
  }

  if (p[0].gear !== p[1].gear) add({ kind: 'gear', gears: [p[0].gear, p[1].gear], at: [p[0].apexAt, p[1].apexAt] }, 1.5);

  const [f0, f1] = [p[0].fullThrottleAt, p[1].fullThrottleAt];
  if (f0 != null && f1 != null && Math.abs(f0 - f1) >= MIN_POSITION_DIFF) {
    add({ kind: 'throttle', side: f0 < f1 ? 0 : 1, by: round5(Math.abs(f0 - f1)), at: [f0, f1] }, Math.abs(f0 - f1) / MIN_POSITION_DIFF);
  }

  // A lift only one of them makes, and that their speed shows
  for (const lifter of [0, 1] as Side[]) {
    const lift = p[lifter].lift, other = p[1 - lifter].lift;
    if (!lift || (other && other.depth >= lift.depth / 2)) continue;
    const gains = laps.map(c => interpolate(distance, c.speed, lift.to) - interpolate(distance, c.speed, lift.from)) as [number, number];
    if (gains[1 - lifter] - gains[lifter] >= 3) {
      add({
        kind: 'lift', side: (1 - lifter) as Side, depth: Math.round(lift.depth), from: lift.from, to: lift.to,
        speedGain: [Math.round(gains[0]), Math.round(gains[1])],
      }, 2.5);
    }
  }

  const exitTo = Math.min(apexRef + EXIT_LENGTH, to);
  const exit = meanSpeedDiff(distance, laps, apexRef, exitTo);
  if (Math.abs(exit) >= MIN_EXIT_DIFF) {
    add({ kind: 'exitSpeed', side: exit > 0 ? 0 : 1, by: Math.round(Math.abs(exit)), from: apexRef, to: exitTo }, Math.abs(exit) / MIN_EXIT_DIFF);
  }

  // Through the whole corner: what remains when nothing else stands out
  const whole = meanSpeedDiff(distance, laps, entryFrom, exitTo);
  if (Math.abs(whole) >= MIN_CORNER_DIFF) {
    add({ kind: 'cornerSpeed', side: whole > 0 ? 0 : 1, by: Math.round(Math.abs(whole)), from: entryFrom, to: exitTo }, Math.abs(whole) / (2 * MIN_CORNER_DIFF));
  }

  return scored.sort((a, b) => b.score - a.score);
}

export function analyse(duel: Duel): Analysis {
  const distance = duel.distance;
  const end = distance[distance.length - 1];
  const laps: [Channels, Channels] = [channels(duel, 0), channels(duel, 1)];
  const gapAt = (d: number) => interpolate(distance, duel.time[1], d) - interpolate(distance, duel.time[0], d);
  const flat = distance.map((_, i) => laps.every(c => c.throttle[i] >= FLAT_OUT && !c.brake[i]));
  const bounds = [0, ...straightMidpoints(distance, flat), end];
  const mean = distance.map((_, i) => (laps[0].speed[i] + laps[1].speed[i]) / 2);
  const label = (at: number) => {
    const corners = duel.telemetry.corners;
    // A circuit whose corners aren't numbered: the corner by its place on the lap (m)
    if (!corners.length) return `@${Math.round(at / 10) * 10}`;
    const c = corners.reduce((a, b) => (Math.abs(b.distance - at) < Math.abs(a.distance - at) ? b : a));
    return `T${c.number}${c.letter ?? ''}`;
  };

  const sections: Section[] = [];
  for (let s = 0; s < bounds.length - 1; s++) {
    const [from, to] = [bounds[s], bounds[s + 1]];
    const idx = range(distance, from, to);
    const { valleys: lows, peaks } = valleys(mean, idx);

    const flatIdx = idx.filter(i => flat[i]);
    const run = longestRun(idx, flat);
    const flatDiff = flatIdx.reduce((sum, i) => sum + laps[0].speed[i] - laps[1].speed[i], 0) / (flatIdx.length || 1);
    const step = end / (distance.length - 1);
    const flatLength = flatIdx.length * step;
    // The time the slower car's speed costs it there (s): distance over speed
    const flatTime = flatIdx.reduce((sum, i) => sum + step / (laps[1].speed[i] / 3.6) - step / (laps[0].speed[i] / 3.6), 0);
    const straight: Section['straight'] = Math.abs(flatDiff) >= MIN_STRAIGHT_DIFF && flatLength >= MIN_FLAT_LENGTH && run.length > 1
      ? {
        kind: 'straightSpeed', score: Math.abs(flatDiff) / MIN_STRAIGHT_DIFF, side: flatDiff > 0 ? 0 : 1, by: Math.round(Math.abs(flatDiff)),
        from: distance[run[0]], to: distance[run[run.length - 1]],
        topSpeeds: [Math.round(Math.max(...idx.map(i => laps[0].speed[i]))), Math.round(Math.max(...idx.map(i => laps[1].speed[i])))],
        time: Math.abs(flatTime),
      }
      : null;

    // Each corner runs from the speed peak before it to the one after
    const edges = [from, ...peaks.slice(0, lows.length - 1).map(i => distance[i]), to];
    const corners = lows.map((low, k): Corner => {
      const [a, b] = [edges[k], edges[k + 1]];
      const apexAt = distance[low];
      const p: [CornerPhases, CornerPhases] = [phases(distance, laps[0], a, b, apexAt), phases(distance, laps[1], a, b, apexAt)];
      return { label: label(apexAt), from: a, to: b, apexAt, gapChange: gapAt(b) - gapAt(a), phases: p, findings: findings(distance, laps, p, apexAt, b) };
    });
    sections.push({ from, to, gapChange: gapAt(to) - gapAt(from), corners, straight });
  }

  const share = (c: Channels) => c.throttle.filter(t => t >= FLAT_OUT).length / c.throttle.length;
  return {
    sections,
    topSpeed: [Math.max(...laps[0].speed), Math.max(...laps[1].speed)],
    fullThrottle: [share(laps[0]), share(laps[1])],
  };
}
