// Shared by TelemetryViewMulti and its chart stack: how a comparison becomes
// the charts' rows, colours and labels, and the charts' layout.
import type { DriverMeta, TelemetryDataMulti } from '../types/telemetry';
import { teammateColors } from '../utils/teamColors';

/** Chart margins: also used by the crosshair / loupe pixel math (desktop only) */
export const MARGIN = { top: 8, right: 20, left: 52, bottom: 12 };
export const Y_AXIS_WIDTH = 48;
/** Narrower on phones, where the desktop margins ate a third of the width */
export const MOBILE_MARGIN = { top: 8, right: 8, left: 4, bottom: 12 };
export const MOBILE_Y_AXIS_WIDTH = 34;

/** A row is drawn this many times wider while the loupe magnifies it */
export const RENDER_SCALE = 6;

/** One point of the lap, every lap's channels flattened: spd0, thr1, dlt0… */
export type ChartRow = Record<string, number>;

export function fmtRpm(v: number): string {
  return `${(v / 1000).toFixed(1)}k`;
}

/** The fastest lap, or the first when no lap has a time */
export function fastestLapIndex(drivers: DriverMeta[]): number {
  let best = 0;
  drivers.forEach((d, i) => {
    const bestTime = drivers[best].lapTime;
    if (d.lapTime != null && (bestTime == null || d.lapTime < bestTime)) best = i;
  });
  return best;
}

/** Recharts rows, with the deltas rebased onto lap `reference` (the API gives them against the first lap) */
export function buildChartData(telemetryData: TelemetryDataMulti, reference: number): ChartRow[] {
  return telemetryData.telemetry.map(pt => {
    const row: ChartRow = { distance: pt.distance };
    pt.speeds.forEach((v, i) => { row[`spd${i}`] = v; });
    pt.throttles.forEach((v, i) => { row[`thr${i}`] = v; });
    pt.brakes.forEach((v, i) => { row[`brk${i}`] = v ? 1 : 0; });
    pt.gears.forEach((v, i) => { row[`gear${i}`] = v; });
    const refDelta = pt.deltas[reference] ?? 0;
    pt.deltas.forEach((v, i) => { row[`dlt${i}`] = v - refDelta; });
    pt.rpms.forEach((v, i) => { row[`rpm${i}`] = v; });
    return row;
  });
}

function blendToWhite(hex: string, blend: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * blend);
  const ng = Math.round(g + (255 - g) * blend);
  const nb = Math.round(b + (255 - b) * blend);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

/** One colour per lap; the same driver on another lap gets a lighter shade */
export function buildColors(
  drivers: DriverMeta[],
  getColor: (c: string) => string,
  areTeammates: (a: string, b: string) => boolean,
): string[] {
  const secondColors = teammateColors(drivers.map(d => d.driver), areTeammates);
  const seen: Record<string, number> = {};
  return drivers.map(d => {
    const dupeCount = seen[d.driver] ?? 0;
    seen[d.driver] = dupeCount + 1;
    const base = secondColors[d.driver] ?? getColor(d.driver);
    return dupeCount === 0 ? base : blendToWhite(base, Math.min(dupeCount * 0.2, 0.5));
  });
}

/** The driver's code, with the lap number when the driver has several laps */
export function buildLabel(d: DriverMeta, drivers: DriverMeta[]): string {
  const dupes = drivers.filter(x => x.driver === d.driver).length;
  if (dupes > 1) return `${d.driver} L${d.lap}`;
  return d.driver;
}
