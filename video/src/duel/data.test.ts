import { describe, expect, it } from 'vitest';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { distanceAt, interpolate, prepareDuel, withLapLength } from './data';

// A 1 km lap: the slower driver loses 0.5 s between 400 and 600 m, around T2
const distance = Array.from({ length: 101 }, (_, i) => i * 10);
const lostBy = (d: number) => Math.min(0.5, Math.max(0, (d - 400) / 200 * 0.5));
const raw: TelemetryDataMulti = {
  // Slower lap first, as the API would return it if requested first
  drivers: [
    { driver: 'PIA', year: 2025, gp: 1, session: 'Q', lap: 17, lapTime: 18.5, sectors: { s1: 6, s2: 6.5, s3: 6 } },
    { driver: 'NOR', year: 2025, gp: 1, session: 'Q', lap: 19, lapTime: 18, sectors: { s1: 6, s2: 6, s3: 6 } },
  ],
  telemetry: distance.map(d => ({
    distance: d,
    speeds: [d >= 400 && d <= 600 ? 180 : 200, 200],
    throttles: [100, 100], brakes: [false, false], gears: [8, 8], rpms: [11000, 11000],
    deltas: [0, -lostBy(d)],
    x: d, y: 0,
  })),
  corners: [{ number: 1, letter: null, distance: 200 }, { number: 2, letter: null, distance: 500 }, { number: 3, letter: null, distance: 800 }],
  rotation: 0,
};
const drivers = [
  { abbreviation: 'NOR', number: '4', team: 'McLaren', fullName: 'Lando NORRIS' },
  { abbreviation: 'PIA', number: '81', team: 'McLaren', fullName: 'Oscar PIASTRI' },
];

describe('prepareDuel', () => {
  const duel = prepareDuel(raw, drivers, 'Melbourne');

  it('puts the faster lap first, with readable names', () => {
    expect(duel.drivers.map(d => [d.code, d.name])).toEqual([['NOR', 'Norris'], ['PIA', 'Piastri']]);
  });

  it('keeps each driver team for the site colours', () => {
    expect(duel.teams).toEqual({ NOR: 'McLaren', PIA: 'McLaren' });
  });

  it('ends each elapsed-time curve on the official lap time', () => {
    expect(duel.time[0].at(-1)).toBeCloseTo(18, 6);
    expect(duel.time[1].at(-1)).toBeCloseTo(18.5, 6);
  });

  it('spreads the delta drift so the gap ends on the lap times', () => {
    const drifting = prepareDuel({ ...raw, drivers: [{ ...raw.drivers[0], lapTime: 18.6 }, raw.drivers[1]] }, drivers, 'Melbourne');
    // The API's delta ends at 0.5 s, the lap times differ by 0.6 s
    expect(drifting.time[1].at(-1)! - drifting.time[0].at(-1)!).toBeCloseTo(0.6, 6);
    // Halfway: 0.25 s lost by then, plus half the 0.1 s drift
    expect(drifting.time[1][50] - drifting.time[0][50]).toBeCloseTo(0.25 + 0.05, 6);
  });

  it('finds the corner where the slower driver lost time', () => {
    expect(duel.keyCorners).toHaveLength(1);
    expect(duel.keyCorners[0].label).toBe('T2');
    expect(duel.keyCorners[0].change).toBeCloseTo(0.5, 6);
    // Between the midpoints to T1 and T3
    expect([duel.keyCorners[0].from, duel.keyCorners[0].to]).toEqual([350, 650]);
  });

  it('finds how far the faster car has gone at a given time', () => {
    expect(distanceAt(duel, 0)).toBe(0);
    expect(distanceAt(duel, 9)).toBeCloseTo(500, 6);
    expect(distanceAt(duel, 99)).toBe(1000);
  });
});

describe('interpolate', () => {
  it('interpolates linearly and clamps at both ends', () => {
    expect(interpolate([0, 10, 20], [0, 100, 300], 15)).toBe(200);
    expect(interpolate([0, 10, 20], [0, 100, 300], -5)).toBe(0);
    expect(interpolate([0, 10, 20], [0, 100, 300], 99)).toBe(300);
  });
});

describe('withLapLength', () => {
  it('leaves a lap whose speeds cover its distance in its lap time', () => {
    expect(withLapLength(raw)).toBe(raw);
  });

  it('scales distances ten times too long back to the lap\'s length, corners with them', () => {
    const tenfold = {
      ...raw,
      telemetry: raw.telemetry.map(p => ({ ...p, distance: p.distance * 10 })),
      corners: raw.corners.map(c => ({ ...c, distance: c.distance * 10 })),
    };
    const fixed = withLapLength(tenfold);
    const length = fixed.telemetry.at(-1)!.distance;
    // Back to about 1 km, the length its speeds cover in its lap time, and nothing more to fix
    expect(length).toBeGreaterThan(990);
    expect(length).toBeLessThan(1010);
    expect(fixed.corners[1].distance / length).toBeCloseTo(0.5, 5);
    expect(withLapLength(fixed)).toBe(fixed);
    expect(prepareDuel(tenfold, drivers, 'Melbourne').distance.at(-1)).toBeCloseTo(length, 5);
  });
});
