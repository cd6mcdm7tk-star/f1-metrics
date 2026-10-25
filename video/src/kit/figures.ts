// The figures a scene quotes about one corner of one lap, read from the
// telemetry as the site shows it.
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';

export interface CornerBraking {
  /** Top speed on the way in, and the last point it was held (km/h, m) */
  top: number;
  topAt: number;
  /** Where the brake first goes on (m) */
  brakeAt: number | null;
  /** The slowest point through the corner (km/h, m) */
  min: number;
  minAt: number;
}

/** How far before the corner's marker the approach is searched, and after it the slowest point (m) */
const APPROACH = 300;
const THROUGH = 120;

export function cornerBraking(telemetry: TelemetryDataMulti, lap: number, corner: number): CornerBraking {
  const points = telemetry.telemetry;
  const through = points.filter(p => p.distance >= corner - APPROACH / 3 && p.distance <= corner + THROUGH);
  const slowest = through.reduce((a, b) => (b.speeds[lap] < a.speeds[lap] ? b : a));
  const approach = points.filter(p => p.distance >= corner - APPROACH && p.distance <= slowest.distance);
  const top = Math.max(...approach.map(p => p.speeds[lap]));
  const topPoint = [...approach].reverse().find(p => p.speeds[lap] === top)!;
  const brake = approach.find(p => p.distance >= topPoint.distance && p.brakes[lap]);
  return { top, topAt: topPoint.distance, brakeAt: brake?.distance ?? null, min: slowest.speeds[lap], minAt: slowest.distance };
}
