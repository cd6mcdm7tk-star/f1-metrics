// The lap chart's data: a row per lap with each driver's time and tyre, and
// the time axis around them.
import type { GPTempoLap } from '../types/session';

export type LapChartRow = Record<string, number | string | null>;

/** Laps slower than the session's best by more than this are outliers (pit, safety car, red flag) */
export const OUTLIER_MARGIN = 5;

export function formatLapTime(s: number | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(3).padStart(6, '0')}`;
}

/** A row per lap number any driver set a time on, with each driver's time
 * (outliers left out unless shown) and tyre under `<code>__compound` */
export function lapChartRows(lapsOf: (code: string) => GPTempoLap[] | undefined, drivers: string[], showOutliers: boolean): LapChartRow[] {
  const allNums = new Set<number>();
  drivers.forEach(code => lapsOf(code)?.forEach(l => { if (l.LapTime) allNums.add(l.LapNumber); }));
  const allTimes = drivers.flatMap(code => lapsOf(code)?.map(l => l.LapTime).filter((t): t is number => !!t) ?? []);
  const best = allTimes.length ? Math.min(...allTimes) : Infinity;

  return Array.from(allNums).sort((a, b) => a - b).map(lapNumber => {
    const row: LapChartRow = { lapNumber };
    drivers.forEach(code => {
      const lap = lapsOf(code)?.find(l => l.LapNumber === lapNumber);
      const t = lap?.LapTime ?? null;
      row[code] = t && (showOutliers || t <= best + OUTLIER_MARGIN) ? t : null;
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
