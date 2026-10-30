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

/** A corner label above the speed chart: its text, and its centre across the plot (px) */
export interface CornerLabel {
  text: string;
  x: number;
}

/** Room left between two labels (px) */
const LABEL_GAP = 6;

/** The corners' labels across a plot `width` px wide showing `domain`: each
 * over its corner, and corners too close to label apart merged into one
 * ("T12–16") centred over them, so none overlap. `charWidth`: one character (px). */
export function cornerLabels(
  corners: { label: string; distance: number }[], domain: [number, number], width: number, charWidth: number,
): CornerLabel[] {
  const [from, to] = domain;
  const span = to - from;
  if (!(span > 0) || !(width > 0)) return [];
  const at = (distance: number) => ((distance - from) / span) * width;
  const shown = corners.filter(c => c.distance >= from && c.distance <= to).sort((a, b) => a.distance - b.distance);
  type Group = { first: (typeof shown)[number]; last: (typeof shown)[number] };
  const text = (g: Group) => (g.first === g.last ? g.first.label : `${g.first.label}–${g.last.label.replace(/^T/, '')}`);
  const box = (g: Group) => {
    const centre = (at(g.first.distance) + at(g.last.distance)) / 2;
    const half = (text(g).length * charWidth) / 2;
    return { centre, left: centre - half, right: centre + half };
  };
  const groups: Group[] = [];
  for (const corner of shown) {
    groups.push({ first: corner, last: corner });
    // Merging can widen a label into the one before it: merge back until clear
    while (groups.length > 1 && box(groups[groups.length - 2]).right + LABEL_GAP > box(groups[groups.length - 1]).left) {
      const last = groups.pop()!;
      groups[groups.length - 1].last = last.last;
    }
  }
  return groups.map(g => ({ text: text(g), x: box(g).centre }));
}

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
