import { describe, expect, it } from 'vitest';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { withCornersFrom } from './corners';

const lap = (offset: number, corners: TelemetryDataMulti['corners']): TelemetryDataMulti => ({
  drivers: [],
  // A straight lap along x, positions in decimetres, its distances counted from `offset`
  telemetry: Array.from({ length: 51 }, (_, i) => ({ distance: i * 10 + offset, x: i * 100, y: 0, speeds: [], throttles: [], brakes: [], gears: [], rpms: [], deltas: [] })),
  corners,
  rotation: 0,
});

describe('corners from an earlier lap', () => {
  it('puts each corner where the lap passes the same place', () => {
    const earlier = lap(0, [{ number: 1, letter: null, distance: 120 }, { number: 2, letter: 'A', distance: 400 }]);
    const moved = withCornersFrom(lap(-15, []), earlier);
    expect(moved.corners).toEqual([{ number: 1, letter: null, distance: 105 }, { number: 2, letter: 'A', distance: 385 }]);
  });

  it('keeps corners a lap already has, and drops those off its line', () => {
    const own = lap(0, [{ number: 9, letter: null, distance: 50 }]);
    expect(withCornersFrom(own, lap(0, [{ number: 1, letter: null, distance: 10 }])).corners).toEqual(own.corners);
    const elsewhere = { ...lap(0, [{ number: 1, letter: null, distance: 100 }]), telemetry: lap(0, []).telemetry.map(p => ({ ...p, y: 5000 })) };
    expect(withCornersFrom(lap(0, []), elsewhere).corners).toEqual([]);
  });
});
