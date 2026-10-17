import { describe, expect, it } from 'vitest';
import { analyse, straightMidpoints, valleys } from './analysis';
import { testDuel } from './fixture';

describe('analyse', () => {
  const duel = testDuel();
  const analysis = analyse(duel);
  const corner = analysis.sections[0].corners[0];
  const find = (kind: string) => corner.findings.find(f => f.kind === kind);

  it('finds the one corner, and the whole gap in it', () => {
    expect(analysis.sections).toHaveLength(1);
    expect(corner.label).toBe('T1');
    expect(corner.gapChange).toBeCloseTo(duel.drivers[1].lapTime - duel.drivers[0].lapTime, 6);
  });

  it('reads each driver through the corner', () => {
    expect(corner.phases.map(p => [p.brakeAt, p.minSpeed, p.gear])).toEqual([[600, 100, 4], [575, 92, 3]]);
    expect(corner.phases[1].lift).toEqual({ from: 810, to: 840, depth: 30 });
    expect(corner.phases[0].lift).toBeNull();
  });

  it('sees what the faster lap does better', () => {
    expect(find('braking')).toMatchObject({ side: 0, by: 25, pedal: 'brake' });
    expect(find('apexSpeed')).toMatchObject({ side: 0, by: 8, speeds: [100, 92] });
    expect(find('gear')).toMatchObject({ gears: [4, 3] });
    // The slower lap's lift, which its speed shows
    expect(find('lift')).toMatchObject({ side: 0, depth: 30 });
    expect(find('exitSpeed')).toMatchObject({ side: 0 });
  });

  it('ranks findings by how telling they are', () => {
    const scores = corner.findings.map(f => f.score);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe('straightMidpoints', () => {
  it('cuts in the middle of flat-out stretches, not at the line', () => {
    const distance = Array.from({ length: 11 }, (_, i) => i * 50);
    const flat = [true, true, false, false, true, true, true, true, false, true, true];
    expect(straightMidpoints(distance, flat)).toEqual([275]);
  });
});

describe('valleys', () => {
  it('finds corners that drop speed enough, and the peaks between them', () => {
    const speed = [300, 250, 120, 200, 290, 280, 285, 150, 260];
    const { valleys: lows, peaks } = valleys(speed, speed.map((_, i) => i));
    expect(lows).toEqual([2, 7]);
    expect(peaks).toEqual([4]);
  });
});
