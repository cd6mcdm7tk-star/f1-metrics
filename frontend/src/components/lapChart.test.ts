import { describe, expect, it } from 'vitest';
import type { GPTempoLap } from '../types/session';
import { dotDrawDelay, DRAW_MS, drawTimeAt, formatLapTime, lapChartDomain, lapChartRows } from './lapChart';

const lap = (LapNumber: number, LapTime: number | null, Compound: string | null = 'SOFT'): GPTempoLap => ({
  LapNumber, LapTime, Compound, Sector1Time: null, Sector2Time: null, Sector3Time: null, IsPersonalBest: false, HasTelemetry: true, Team: '', Driver: '',
});
const laps: Record<string, GPTempoLap[]> = {
  VER: [lap(1, 98.4), lap(2, 96.2), lap(3, 120.5, 'MEDIUM')],
  LEC: [lap(1, 98.9), lap(2, 95.2), lap(4, 96.0, 'MEDIUM')],
};

describe('lapChartRows', () => {
  it('has a row per lap anyone set, with each driver\'s time and tyre', () => {
    const rows = lapChartRows(code => laps[code], ['VER', 'LEC'], true);
    expect(rows.map(r => r.lapNumber)).toEqual([1, 2, 3, 4]);
    expect(rows[0]).toMatchObject({ VER: 98.4, LEC: 98.9, VER__compound: 'SOFT' });
    expect(rows[3]).toMatchObject({ VER: null, LEC: 96, LEC__compound: 'MEDIUM' });
  });

  it('leaves out laps more than 5 s off the best unless asked', () => {
    expect(lapChartRows(code => laps[code], ['VER', 'LEC'], false)[2].VER).toBeNull();
    expect(lapChartRows(code => laps[code], ['VER', 'LEC'], true)[2].VER).toBe(120.5);
  });

  it('judges each lap against the best on its own tyres', () => {
    // Intermediates at 87 s, slicks at 73 s: only the 106 and the 80 are off the pace
    const wet = { NOR: [lap(1, 87, 'INTERMEDIATE'), lap(2, 86, 'INTERMEDIATE'), lap(3, 106, 'INTERMEDIATE'), lap(4, 74, 'SOFT'), lap(5, 73, 'SOFT'), lap(6, 75, 'SOFT'), lap(7, 80, 'SOFT')] };
    const rows = lapChartRows(code => wet[code as 'NOR'], ['NOR'], false);
    expect(rows.filter(r => r.NOR != null).map(r => r.lapNumber)).toEqual([1, 2, 4, 5, 6]);
  });

  it('judges tyres run for only a lap or two against the session\'s best', () => {
    // Fitted under a safety car: two slow laps can't set a standard of their own
    const short = { ANT: [lap(1, 81), lap(2, 80), lap(3, 82), lap(4, 112, 'MEDIUM'), lap(5, 123, 'MEDIUM')] };
    const rows = lapChartRows(code => short[code as 'ANT'], ['ANT'], false);
    expect(rows.filter(r => r.ANT != null).map(r => r.lapNumber)).toEqual([1, 2, 3]);
  });
});

describe('lapChartDomain', () => {
  it('spans the plotted times padded to whole seconds', () => {
    expect(lapChartDomain(lapChartRows(code => laps[code], ['VER', 'LEC'], false), ['VER', 'LEC'])).toEqual([94, 100]);
    expect(lapChartDomain([], ['VER'])).toEqual([60, 120]);
  });
});

describe('formatLapTime', () => {
  it('writes minutes and thousandths, a dash without a time', () => {
    expect(formatLapTime(95.202)).toBe('1:35.202');
    expect(formatLapTime(null)).toBe('—');
  });
});

describe('the draw-in timing', () => {
  it('starts and ends with the line', () => {
    expect(drawTimeAt(0)).toBeCloseTo(0, 6);
    expect(drawTimeAt(1)).toBeCloseTo(1, 6);
  });

  it('follows the easing: halfway along the line comes before half the time', () => {
    const half = drawTimeAt(0.5);
    expect(half).toBeLessThan(0.5);
    expect(drawTimeAt(0.25)).toBeLessThan(half);
    // A straight curve keeps time and length together
    expect(drawTimeAt(0.3, [0, 0, 1, 1])).toBeCloseTo(0.3, 3);
  });

  it('shows each dot as the line reaches it', () => {
    const xs = [100, 200, 300];
    expect(dotDrawDelay(xs, 100)).toBe(0);
    expect(dotDrawDelay(xs, 300)).toBeCloseTo(DRAW_MS, 0);
    expect(dotDrawDelay([150], 150)).toBe(0);
  });
});
