import { describe, expect, it } from 'vitest';
import type { GPTempoLap } from '../types/session';
import { formatLapTime, lapChartDomain, lapChartRows } from './lapChart';

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
