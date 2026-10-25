// The circuit as a 3D scene sees it, from the reference lap's positions:
// metres, centred on the track, turned like the official map.
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';

export interface TrackPoint {
  x: number;
  y: number;
  distance: number;
}

export interface TrackCorner {
  label: string;
  distance: number;
}

export interface Track {
  points: TrackPoint[];
  corners: TrackCorner[];
  length: number;
  /** Half the track's extent on each axis (m) */
  half: { x: number; y: number };
}

/** Positions come in decimetres */
const UNIT = 0.1;
/** Directions are measured over this stretch either side, so 20 m sampling doesn't wobble them (m) */
const HEADING_SPAN = 30;

export function buildTrack(telemetry: TelemetryDataMulti): Track {
  const rotation = ((telemetry.rotation ?? 0) * Math.PI) / 180;
  const cos = Math.cos(rotation), sin = Math.sin(rotation);
  const turned = telemetry.telemetry.map(p => ({
    x: (p.x * cos - p.y * sin) * UNIT,
    y: (p.x * sin + p.y * cos) * UNIT,
    distance: p.distance,
  }));
  const xs = turned.map(p => p.x), ys = turned.map(p => p.y);
  const centre = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 };
  return {
    points: turned.map(p => ({ x: p.x - centre.x, y: p.y - centre.y, distance: p.distance })),
    corners: telemetry.corners.map(c => ({ label: `${c.number}${c.letter ?? ''}`, distance: c.distance })),
    length: turned[turned.length - 1].distance,
    half: { x: (Math.max(...xs) - Math.min(...xs)) / 2, y: (Math.max(...ys) - Math.min(...ys)) / 2 },
  };
}

/** Index of the last sample at or before `distance` */
function sampleBefore<T extends { distance: number }>(samples: T[], distance: number): number {
  let lo = 0, hi = samples.length - 1;
  if (distance <= samples[0].distance) return 0;
  if (distance >= samples[hi].distance) return hi - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].distance <= distance) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** Linear interpolation of `value` along the lap at `distance` */
export function valueAt<T extends { distance: number }>(samples: T[], distance: number, value: (sample: T) => number): number {
  const i = sampleBefore(samples, distance);
  const a = samples[i], b = samples[Math.min(i + 1, samples.length - 1)];
  const t = b.distance === a.distance ? 0 : Math.min(1, Math.max(0, (distance - a.distance) / (b.distance - a.distance)));
  return value(a) + (value(b) - value(a)) * t;
}

/** Where the car is at `distance`, and which way it points (radians from
 * east), measured over `span` metres either side: wider for a smooth camera */
export function positionAt(track: Track, distance: number, span = HEADING_SPAN): { x: number; y: number; heading: number } {
  const at = (d: number) => ({ x: valueAt(track.points, d, p => p.x), y: valueAt(track.points, d, p => p.y) });
  const here = at(distance);
  const behind = at(Math.max(0, distance - span));
  const ahead = at(Math.min(track.length, distance + span));
  return { ...here, heading: Math.atan2(ahead.y - behind.y, ahead.x - behind.x) };
}

/** The track's points between two distances, with the exact ends */
export function stretch(track: Track, from: number, to: number): TrackPoint[] {
  const ends = (d: number): TrackPoint => ({ ...positionAt(track, d), distance: d });
  return [ends(from), ...track.points.filter(p => p.distance > from && p.distance < to), ends(to)];
}
