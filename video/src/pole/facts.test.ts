import { describe, expect, it } from 'vitest';
import { RAW, testDuel } from '../duel/fixture';
import type { PoleDriver, PoleSession } from './data';
import { poleFacts } from './facts';

const driver = (code: string, team: string, position: number, segments: PoleDriver['segments'], sectors: PoleDriver['sectors']): PoleDriver => ({
  code, name: code, team, color: '#fff', position, segments, lap: 1, time: segments[2]!, sectors,
});

// Two teams; B1 was quicker in Q2 than in Q3, quick enough for second
const drivers = [
  driver('A1', 'A', 1, [80.5, 80.2, 80.0], [20.0, 30.1, 29.9]),
  driver('B1', 'B', 2, [80.4, 80.05, 80.15], [19.9, 30.2, 30.05]),
  driver('A2', 'A', 3, [80.6, 80.3, 80.25], [20.1, 30.0, 30.15]),
  driver('B2', 'B', 4, [80.7, 80.4, 80.6], [20.2, 30.3, 30.1]),
];
const session: PoleSession = { year: 2026, round: 1, location: 'Test', drivers, telemetry: { ...RAW, drivers: [] }, duel: testDuel() };

describe('qualifying facts', () => {
  const facts = poleFacts(session);

  it('measures every gap to pole and how many fit in a few tenths', () => {
    expect(facts.gaps.map(g => +g.toFixed(3))).toEqual([0, 0.15, 0.25, 0.6]);
    expect(facts.within).toEqual({ gap: 1, count: 4 });
  });

  it('pairs teammates, the quicker first', () => {
    expect(facts.teammates.map(t => [t.ahead.code, t.behind.code, +t.gap.toFixed(3)])).toEqual([['A1', 'A2', 0.25], ['B1', 'B2', 0.45]]);
  });

  it('finds a better time in an earlier segment, and the place it was worth', () => {
    expect(facts.earlier).toEqual([]);
    const quickerInQ2 = poleFacts({ ...session, drivers: drivers.map(d => (d.code === 'A2' ? { ...d, segments: [80.6, 80.1, 80.25] } : d)) });
    expect(quickerInQ2.earlier.map(e => [e.driver.code, e.segment, e.wouldBe])).toEqual([['A2', 2, 2]]);
  });

  it('gives each sector to the quickest lap there, and finds where the pole lap won and lost time', () => {
    expect(facts.sectors.map(s => s.driver.code)).toEqual(['B1', 'A2', 'A1']);
    expect(facts.sectors[2].to).toBe(2000);
    expect(facts.gain.label).toBe('T1');
  });

  it('lights where the pole lap was faster in that corner, only when it was', () => {
    const stretch = facts.gainStretch;
    if (stretch) {
      expect(['entrySpeed', 'exitSpeed', 'cornerSpeed']).toContain(stretch.kind);
      expect(stretch.side).toBe(0);
      expect(stretch.to).toBeGreaterThan(stretch.from);
    }
    expect(facts.gain.findings.some(f => ['entrySpeed', 'exitSpeed', 'cornerSpeed'].includes(f.kind) && 'side' in f && f.side === 0)).toBe(stretch != null);
  });
});
