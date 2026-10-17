// The site's colours and chart rows for the duel, as TelemetryPage builds them
import { buildChartData, buildColors, fastestLapIndex, type ChartRow } from '../../../frontend/src/components/telemetryChart';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import type { Duel } from '../duel/data';

/** TelemetryPage's colour lookups, from each driver's team */
export function teamLookups(teams: Record<string, string>) {
  return {
    getDriverColor: (code: string) => teamColor(teams[code] ?? ''),
    areTeammates: (a: string, b: string) => {
      const t1 = teams[a], t2 = teams[b];
      return !!(t1 && t2 && t1.toLowerCase() === t2.toLowerCase());
    },
  };
}

/** Each lap's colour on the site, in the duel's order (faster first) */
export function lapColors(duel: Duel): [string, string] {
  const { getDriverColor, areTeammates } = teamLookups(duel.teams);
  const colors = buildColors(duel.telemetry.drivers, getDriverColor, areTeammates);
  return [colors[duel.order[0]], colors[duel.order[1]]];
}

/** The site's chart rows for the points within `window` */
export function windowRows(duel: Duel, window: [number, number]): ChartRow[] {
  const rows = buildChartData(duel.telemetry, fastestLapIndex(duel.telemetry.drivers));
  return rows.filter(r => r.distance >= window[0] && r.distance <= window[1]);
}

/** The distances a zoomed stretch's charts span: its first and last points */
export function zoomDomain(duel: Duel, window: [number, number]): [number, number] {
  const inside = duel.distance.filter(d => d >= window[0] && d <= window[1]);
  return [inside[0], inside[inside.length - 1]];
}

/** A zoomed stretch's speed axis: both laps, with room, to the 10 km/h */
export function zoomSpeedDomain(duel: Duel, window: [number, number]): [number, number] {
  const speeds = duel.telemetry.telemetry.filter(p => p.distance >= window[0] && p.distance <= window[1]).flatMap(p => p.speeds);
  return [Math.floor((Math.min(...speeds) - 5) / 10) * 10, Math.ceil((Math.max(...speeds) + 5) / 10) * 10];
}

/** The whole lap's speed axis, as the site draws it: from the 10 km/h below the slowest point to the fastest */
export function lapSpeedDomain(duel: Duel): [number, number] {
  const speeds = duel.telemetry.telemetry.flatMap(p => p.speeds);
  return [Math.floor(Math.min(...speeds) / 10) * 10, Math.max(...speeds)];
}
