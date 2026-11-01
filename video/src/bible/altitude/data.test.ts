import { describe, expect, it } from 'vitest';
import type { Duel } from '../../duel/data';
import { airDensity, altitudeFacts, MEXICO_ALTITUDE, TOP_SPEEDS } from './data';

describe('the air at altitude', () => {
  it('is a fifth thinner at Mexico than at sea level, as the script says', () => {
    expect(airDensity(0)).toBe(1);
    expect(Math.round((1 - airDensity(MEXICO_ALTITUDE)) * 100)).toBe(20);
  });
});

describe('the top speeds', () => {
  it('rise from Monaco to Mexico, two km/h over Monza', () => {
    const speeds = TOP_SPEEDS.map(s => s.speed);
    expect(speeds).toEqual([...speeds].sort((a, b) => a - b));
    expect(TOP_SPEEDS[TOP_SPEEDS.length - 1].circuit).toBe('Mexico');
    expect(TOP_SPEEDS[TOP_SPEEDS.length - 1].speed - TOP_SPEEDS.find(s => s.circuit === 'Monza')!.speed).toBe(2);
  });
});

describe("the pole lap's straight", () => {
  // Flat out from the line to 1,070 m, braking into turn 1 at 1,185 m
  const telemetry = Array.from({ length: 141 }, (_, i) => {
    const distance = i * 10;
    const braking = distance >= 1070;
    const speed = braking ? Math.max(105, 351 - (distance - 1070) * 2) : 266 + (85 * Math.min(distance, 1030)) / 1030;
    return { distance, speeds: [speed, speed - 0.5], throttles: [braking ? 0 : 100, braking ? 0 : 100], brakes: [braking && distance < 1200, braking && distance < 1200] };
  });
  const duel = { order: [0, 1], telemetry: { corners: [{ number: 1, distance: 1185 }], telemetry } } as unknown as Duel;

  it('is flat out for over a kilometre to the top speed, then brakes for turn 1', () => {
    const facts = altitudeFacts(duel);
    expect(facts.corner).toBe(1185);
    expect(Math.round(facts.top[0])).toBe(351);
    expect(facts.brakeAt).toBe(1070);
    expect(facts.flatOut).toBeGreaterThan(1000);
  });
});
