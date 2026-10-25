import { describe, expect, it } from 'vitest';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { buildTrack, positionAt, stretch, valueAt } from './track';

// A 400 m square lap, positions in decimetres, starting at the bottom left
const SIDE = 1000;
const corners = [[0, 0], [SIDE, 0], [SIDE, SIDE], [0, SIDE], [0, 0]];
const points = Array.from({ length: 41 }, (_, i) => {
  const side = Math.min(3, Math.floor(i / 10)), t = (i - side * 10) / 10;
  const [ax, ay] = corners[side], [bx, by] = corners[side + 1];
  return { distance: i * 10, x: ax + (bx - ax) * t, y: ay + (by - ay) * t, speeds: [100], throttles: [100], brakes: [false], gears: [5], rpms: [10000], deltas: [0] };
});
const telemetry: TelemetryDataMulti = { drivers: [], telemetry: points, corners: [{ number: 1, letter: null, distance: 100 }], rotation: 0 };

describe('track', () => {
  const track = buildTrack(telemetry);

  it('is in metres, centred on the circuit', () => {
    expect(track.half).toEqual({ x: 50, y: 50 });
    expect(track.points[0]).toMatchObject({ x: -50, y: -50 });
    expect(track.length).toBe(400);
    expect(track.corners).toEqual([{ label: '1', distance: 100 }]);
  });

  it('turns the map by the circuit rotation', () => {
    const turned = buildTrack({ ...telemetry, rotation: 90 });
    // The first side ran east; turned a quarter, it runs north
    expect(turned.points[5].x).toBeCloseTo(turned.points[0].x);
    expect(turned.points[5].y).toBeGreaterThan(turned.points[0].y);
  });

  it('places the car between samples and points it along the track', () => {
    const p = positionAt(track, 55);
    expect(p.x).toBeCloseTo(5);
    expect(p.y).toBeCloseTo(-50);
    expect(p.heading).toBeCloseTo(0);
    expect(positionAt(track, 150).heading).toBeCloseTo(Math.PI / 2);
  });

  it('interpolates values and cuts stretches with exact ends', () => {
    expect(valueAt(track.points, 5, q => q.x)).toBeCloseTo(-45);
    const part = stretch(track, 12, 38);
    expect(part[0].distance).toBe(12);
    expect(part[part.length - 1].distance).toBe(38);
    expect(part.map(q => q.distance)).toEqual([12, 20, 30, 38]);
  });
});
