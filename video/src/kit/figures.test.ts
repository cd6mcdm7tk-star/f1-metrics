import { describe, expect, it } from 'vitest';
import { RAW } from '../duel/fixture';
import { cornerBraking } from './figures';

// The fixture: flat out at 300 km/h, the slower lap (index 0) brakes at 575 m,
// the faster at 600 m, both slowest at the apex, 750 m
describe('corner braking', () => {
  it('reads top speed, braking point and minimum speed around a corner', () => {
    expect(cornerBraking(RAW, 1, 750)).toEqual({ top: 300, topAt: 600, brakeAt: 600, min: 100, minAt: 750 });
    expect(cornerBraking(RAW, 0, 750)).toMatchObject({ topAt: 575, brakeAt: 575, min: 92 });
  });
});
