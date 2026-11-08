// The lap chart's data: a row per lap with each driver's time and tyre, and
// the time axis around them.
import type { GPTempoLap } from '../types/session';

export type LapChartRow = Record<string, number | string | null>;

/** Laps slower than the best on their tyres by more than this are outliers (pit, safety car, red flag) */
export const OUTLIER_MARGIN = 5;
/** Tyres run for fewer laps than this are judged against the session's best: a safety car may be all they saw */
const MIN_COMPOUND_LAPS = 3;

export function formatLapTime(s: number | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(3).padStart(6, '0')}`;
}

/** The best lap to judge a lap on these tyres against. By tyre, so that a wet
 * race's intermediates aren't all outliers next to its slicks */
function referenceLap(laps: GPTempoLap[]): (compound: string | null) => number {
  const best = laps.length ? Math.min(...laps.map(l => l.LapTime!)) : Infinity;
  return compound => {
    const onTyre = laps.filter(l => l.Compound === compound).map(l => l.LapTime!);
    return compound && onTyre.length >= MIN_COMPOUND_LAPS ? Math.min(...onTyre) : best;
  };
}

/** A row per lap number any driver set a time on, with each driver's time
 * (outliers left out unless shown) and tyre under `<code>__compound` */
export function lapChartRows(lapsOf: (code: string) => GPTempoLap[] | undefined, drivers: string[], showOutliers: boolean): LapChartRow[] {
  const allNums = new Set<number>();
  drivers.forEach(code => lapsOf(code)?.forEach(l => { if (l.LapTime) allNums.add(l.LapNumber); }));
  const bestFor = referenceLap(drivers.flatMap(code => lapsOf(code)?.filter(l => l.LapTime) ?? []));

  return Array.from(allNums).sort((a, b) => a - b).map(lapNumber => {
    const row: LapChartRow = { lapNumber };
    drivers.forEach(code => {
      const lap = lapsOf(code)?.find(l => l.LapNumber === lapNumber);
      const t = lap?.LapTime ?? null;
      row[code] = t && (showOutliers || t <= bestFor(lap?.Compound ?? null) + OUTLIER_MARGIN) ? t : null;
      row[`${code}__compound`] = lap?.Compound ?? null;
    });
    return row;
  });
}

/** The time axis: the plotted laps' range, padded out to whole seconds */
export function lapChartDomain(rows: LapChartRow[], drivers: string[]): [number, number] {
  const times = rows.flatMap(d => drivers.map(c => d[c]).filter((t): t is number => typeof t === 'number' && t > 0));
  if (!times.length) return [60, 120];
  return [Math.floor(Math.min(...times) - 0.5), Math.ceil(Math.max(...times) + 0.5)];
}

/** The chart's own animation: a line drawing in, or the lines moving to a new scale (ms) */
export const DRAW_MS = 900;
/** Recharts' 'ease-in-out' curve, as cubic-bezier control points */
const DRAW_EASING = [0, 0, 0.58, 1] as const;

/** The share of the draw after which a line drawing in has covered `progress` of its length */
export function drawTimeAt(progress: number, [x1, y1, x2, y2]: readonly number[] = DRAW_EASING): number {
  const bezier = (s: number, p1: number, p2: number) => 3 * (1 - s) ** 2 * s * p1 + 3 * (1 - s) * s ** 2 * p2 + s ** 3;
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let lo = 0, hi = 1;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, y1, y2) < progress) lo = mid; else hi = mid;
  }
  return bezier((lo + hi) / 2, x1, x2);
}

/** When a dot at `x` shows as its line draws in, the line running across `xs` (ms) */
export function dotDrawDelay(xs: number[], x: number): number {
  const first = Math.min(...xs), last = Math.max(...xs);
  return DRAW_MS * drawTimeAt(last > first ? (x - first) / (last - first) : 0);
}
