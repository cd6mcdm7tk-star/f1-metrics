// Corner numbers for a lap that came without them (FastF1 has no circuit
// data for the current season yet), from an earlier lap of the same circuit:
// each corner is found where that lap was at it, by position on track.
import type { CircuitCorner, TelemetryDataMulti } from '../../../frontend/src/types/telemetry';

/** Further than this from the earlier lap's line, the layout has changed: no corner (m, positions in dm) */
const MAX_OFFSET = 300;

export function withCornersFrom(target: TelemetryDataMulti, source: TelemetryDataMulti): TelemetryDataMulti {
  if (target.corners.length) return target;
  const corners = source.corners.flatMap((corner): CircuitCorner[] => {
    const at = source.telemetry.reduce((a, b) => (Math.abs(b.distance - corner.distance) < Math.abs(a.distance - corner.distance) ? b : a));
    const nearest = target.telemetry.reduce((a, b) => (Math.hypot(b.x - at.x, b.y - at.y) < Math.hypot(a.x - at.x, a.y - at.y) ? b : a));
    return Math.hypot(nearest.x - at.x, nearest.y - at.y) <= MAX_OFFSET ? [{ ...corner, distance: nearest.distance }] : [];
  });
  return { ...target, corners, rotation: target.rotation || source.rotation };
}
