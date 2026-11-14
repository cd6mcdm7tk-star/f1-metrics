// Where things sit on the site's telemetry page, in page pixels, from the
// site's own sizes (TelemetryPage, TelemetryViewMulti) at this width.
import { LAP_CHART_PLOT } from '../../../frontend/src/components/lapChart';
import type { Rect } from '../camera';

export const PAGE = { width: 1000, height: 1132 };
/** The browser toolbar above the page */
export const TOOLBAR = 40;

/** The whole window, toolbar included */
export const WINDOW: Rect = { x: 0, y: -TOOLBAR, w: PAGE.width, h: PAGE.height + TOOLBAR };

/** Lap times, sectors and mini-sectors */
export const DRIVERS: Rect = { x: 12, y: 56, w: 976, h: 71 };

/** The chart stack, speed to RPM, beside the 230 px side column */
export const CHARTS: Rect = { x: 25, y: 152, w: PAGE.width - 25 - 12 - 230 - 25, h: 955 };

export type RowName = 'speed' | 'throttle' | 'brake' | 'gear' | 'delta' | 'rpm';
export const ROWS: Record<RowName, { y: number; h: number }> = {
  speed: { y: 152, h: 300 },
  throttle: { y: 452, h: 150 },
  brake: { y: 602, h: 75 },
  gear: { y: 677, h: 130 },
  delta: { y: 807, h: 150 },
  rpm: { y: 957, h: 150 },
};

export const LIVE: Rect = { x: PAGE.width - 25 - 230, y: 152, w: 230, h: 240 };
export const TRACK: Rect = { x: LIVE.x, y: 403, w: 230, h: 248 };

// Every chart's plot area: the 52 px margin and 48 px Y axis on the left, 20
// px margin on the right; 13.5 + 2 px of row label and 8 px margin above, 12
// px margin below (and the 30 px distance axis under RPM)
const PLOT_LEFT = CHARTS.x + 52 + 48;
const PLOT_WIDTH = CHARTS.w - 52 - 48 - 20;

/** Where a distance falls on the charts, showing `domain` (m) */
export const plotX = (distance: number, domain: [number, number]): number =>
  PLOT_LEFT + ((distance - domain[0]) / (domain[1] - domain[0])) * PLOT_WIDTH;

/** Where the whole lap's distance falls on the charts */
export const distanceX = (distance: number, lapLength: number): number => plotX(distance, [0, lapLength]);

/** A row's plot area, top to bottom (page y) */
export function rowPlot(row: RowName): { top: number; bottom: number } {
  const { y, h } = ROWS[row];
  return { top: y + 23.5, bottom: y + h - 12 - (row === 'rpm' ? 30 : 0) };
}

/** Where a value falls on a row whose axis runs over `domain` */
export function valueY(row: RowName, value: number, domain: [number, number]): number {
  const { top, bottom } = rowPlot(row);
  return bottom - ((value - domain[0]) / (domain[1] - domain[0])) * (bottom - top);
}

/** The rows' fixed axes (TelemetryChartStack) */
export const FIXED_DOMAINS: Partial<Record<RowName, [number, number]>> = {
  throttle: [0, 100],
  brake: [0, 1],
  gear: [1, 8],
};

// The site's lap chart (LapTimesChart) on its own page, under the header:
// its panel, and inside it the plot. Taller than on the site, to fill the upright video
export const LAPS_PAGE = { width: PAGE.width, height: 968 };
export const LAPS_PANEL: Rect = { x: 12, y: 56, w: 976, h: 900 };
const LAPS_PLOT = {
  left: LAPS_PANEL.x + LAP_CHART_PLOT.left,
  right: LAPS_PANEL.x + LAPS_PANEL.w - LAP_CHART_PLOT.right,
  top: LAPS_PANEL.y + LAP_CHART_PLOT.top,
  bottom: LAPS_PANEL.y + LAPS_PANEL.h - LAP_CHART_PLOT.bottom,
};

/** Where a lap falls on the lap chart of laps 1 to `last` */
export const lapX = (lap: number, last: number): number => LAPS_PLOT.left + ((lap - 1) / Math.max(1, last - 1)) * (LAPS_PLOT.right - LAPS_PLOT.left);

/** Where a lap time falls on the lap chart showing `domain` (s) */
export const lapY = (time: number, domain: [number, number]): number =>
  LAPS_PLOT.top + ((domain[1] - time) / (domain[1] - domain[0])) * (LAPS_PLOT.bottom - LAPS_PLOT.top);

/** The lap chart between two laps and two lap times, as a page rectangle */
export const lapsRect = (laps: [number, number], times: [number, number], last: number, domain: [number, number]): Rect => {
  const [x0, x1] = [lapX(laps[0], last) - 16, lapX(laps[1], last) + 16];
  const [y0, y1] = [lapY(times[1], domain) - 12, lapY(times[0], domain) + 12];
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};
