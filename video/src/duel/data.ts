// Turns a /api/telemetry/multi comparison of two laps into what the video
// needs: the comparison itself for the site's view, the drivers in order,
// the time each lap took to reach every point, and where the gap was made.
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import type { SessionDriver } from '../../../frontend/src/types/session';

export interface DuelDriver {
  code: string;
  name: string;
  lapTime: number;
  sectors: (number | null)[];
}

export interface KeyCorner {
  label: string;
  /** The stretch of track the corner owns (m) */
  from: number;
  to: number;
  /** Time the slower driver lost there (s) */
  change: number;
}

export interface Duel {
  year: number;
  location: string;
  session: string;
  /** The comparison as the site draws it */
  telemetry: TelemetryDataMulti;
  /** Index in `telemetry` of the faster lap, then the slower */
  order: [number, number];
  /** Team of each driver code, for the site's colours */
  teams: Record<string, string>;
  /** Faster lap first */
  drivers: [DuelDriver, DuelDriver];
  distance: number[];
  /** Lap time elapsed at each distance */
  time: [number[], number[]];
  /** The corners where the slower driver lost the most time, biggest first */
  keyCorners: KeyCorner[];
}

const lastName = (fullName: string): string => {
  const last = fullName.trim().split(/\s+/).pop() ?? fullName;
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
};

/** Elapsed time along the lap from speed over distance, scaled to the official lap time. */
function elapsedTime(distance: number[], speedKmh: number[], lapTime: number): number[] {
  const time = [0];
  for (let i = 1; i < distance.length; i++) {
    const avg = (speedKmh[i] + speedKmh[i - 1]) / 2 / 3.6;
    time.push(time[i - 1] + (avg > 0 ? (distance[i] - distance[i - 1]) / avg : 0));
  }
  const scale = lapTime / time[time.length - 1];
  return time.map(t => t * scale);
}

/** Distances put right when they disagree with the lap time: the time the
 * speeds take to cover them must be the lap's own. Some of the API's 2026
 * laps come with distances about ten times too long. */
export function withLapLength(raw: TelemetryDataMulti, tolerance = 0.15): TelemetryDataMulti {
  const points = raw.telemetry;
  const lapTime = raw.drivers[0]?.lapTime;
  if (!lapTime || points.length < 2) return raw;
  let implied = 0;
  for (let i = 1; i < points.length; i++) {
    const v = (points[i].speeds[0] + points[i - 1].speeds[0]) / 2 / 3.6;
    if (v > 0) implied += (points[i].distance - points[i - 1].distance) / v;
  }
  if (Math.abs(implied / lapTime - 1) <= tolerance) return raw;
  const k = lapTime / implied;
  return {
    ...raw,
    telemetry: points.map(p => ({ ...p, distance: p.distance * k })),
    corners: raw.corners.map(c => ({ ...c, distance: c.distance * k })),
  };
}

/** Linear interpolation of `values` at position `at` along the increasing `keys`. */
export function interpolate(keys: number[], values: number[], at: number): number {
  if (at <= keys[0]) return values[0];
  const last = keys.length - 1;
  if (at >= keys[last]) return values[last];
  let lo = 0, hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (keys[mid] <= at) lo = mid; else hi = mid;
  }
  const f = (at - keys[lo]) / (keys[hi] - keys[lo]);
  return values[lo] + f * (values[hi] - values[lo]);
}

export function prepareDuel(api: TelemetryDataMulti, sessionDrivers: SessionDriver[], location: string): Duel {
  const raw = withLapLength(api);
  const points = raw.telemetry;
  const distance = points.map(p => p.distance);
  // The API gives each lap's delta to the first one. It drifts a little from
  // the official gap over a lap: the drift is spread along the lap, so the
  // gap ends on the lap times' difference.
  const time0 = elapsedTime(distance, points.map(p => p.speeds[0]), raw.drivers[0].lapTime ?? 0);
  const lapLength = distance[distance.length - 1];
  const drift = (raw.drivers[1].lapTime ?? 0) - (raw.drivers[0].lapTime ?? 0) - points[points.length - 1].deltas[1];
  const times = [time0, time0.map((t, i) => t + points[i].deltas[1] + (drift * distance[i]) / lapLength)];

  const order = (raw.drivers[1].lapTime ?? Infinity) < (raw.drivers[0].lapTime ?? Infinity) ? [1, 0] : [0, 1];
  const drivers = order.map(i => {
    const meta = raw.drivers[i];
    const fullName = sessionDrivers.find(d => d.abbreviation === meta.driver)?.fullName ?? meta.driver;
    return {
      code: meta.driver,
      name: lastName(fullName),
      lapTime: meta.lapTime ?? 0,
      sectors: [meta.sectors.s1, meta.sectors.s2, meta.sectors.s3],
    };
  }) as [DuelDriver, DuelDriver];
  const time = [times[order[0]], times[order[1]]] as [number[], number[]];

  // Each corner owns the stretch between the midpoints to its neighbours, so
  // the changes add up to the final gap
  const corners = raw.corners;
  const gapAt = (d: number) => interpolate(distance, time[1], d) - interpolate(distance, time[0], d);
  const end = distance[distance.length - 1];
  const keyCorners = corners
    .map((c, i) => {
      const from = i === 0 ? 0 : (corners[i - 1].distance + c.distance) / 2;
      const to = i === corners.length - 1 ? end : (c.distance + corners[i + 1].distance) / 2;
      return { label: `T${c.number}${c.letter ?? ''}`, from, to, change: gapAt(to) - gapAt(from) };
    })
    .filter(c => c.change > 0)
    .sort((a, b) => b.change - a.change)
    .slice(0, 3);

  const codes = new Set(raw.drivers.map(d => d.driver));
  const teams = Object.fromEntries(sessionDrivers.filter(d => codes.has(d.abbreviation)).map(d => [d.abbreviation, d.team]));

  return {
    year: raw.drivers[0].year,
    location,
    session: raw.drivers[0].session,
    telemetry: raw,
    order: order as [number, number],
    teams,
    drivers,
    distance,
    time,
    keyCorners,
  };
}

/** Distance (m) the faster driver has covered `t` seconds into the lap */
export const distanceAt = (duel: Duel, t: number): number => interpolate(duel.time[0], duel.distance, t);
