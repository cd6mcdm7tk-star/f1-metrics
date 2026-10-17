import { describe, expect, it } from 'vitest';
import type { DriverMeta, TelemetryDataMulti } from '../types/telemetry';
import { buildChartData, buildColors, buildLabel, fastestLapIndex } from './telemetryChart';

const lap = (driver: string, lap: number, lapTime: number | null): DriverMeta => ({
  driver, lap, lapTime, year: 2025, gp: 1, session: 'Q', sectors: { s1: null, s2: null, s3: null },
});

describe('fastestLapIndex', () => {
  it('picks the quickest lap, skipping laps without a time', () => {
    expect(fastestLapIndex([lap('NOR', 19, 75.2), lap('PIA', 17, null), lap('VER', 12, 75.1)])).toBe(2);
    expect(fastestLapIndex([lap('NOR', 19, null), lap('PIA', 17, 75.3)])).toBe(1);
  });
});

describe('buildChartData', () => {
  const data: TelemetryDataMulti = {
    drivers: [lap('PIA', 17, 75.18), lap('NOR', 19, 75.096)],
    telemetry: [{ distance: 10, speeds: [300, 302], throttles: [100, 99], brakes: [false, true], gears: [8, 7], rpms: [11000, 11200], deltas: [0, -0.05], x: 0, y: 0 }],
    corners: [],
    rotation: 0,
  };

  it('flattens every channel and rebases the deltas on the reference lap', () => {
    expect(buildChartData(data, 1)).toEqual([{
      distance: 10, spd0: 300, spd1: 302, thr0: 100, thr1: 99, brk0: 0, brk1: 1, gear0: 8, gear1: 7,
      dlt0: 0.05, dlt1: 0, rpm0: 11000, rpm1: 11200,
    }]);
  });
});

describe('buildColors and buildLabel', () => {
  const teams: Record<string, string> = { NOR: 'McLaren', PIA: 'McLaren' };
  const getColor = (code: string) => (teams[code] === 'McLaren' ? '#EA4E00' : '#555555');
  const areTeammates = (a: string, b: string) => teams[a] === teams[b];
  const laps = [lap('NOR', 19, 75.1), lap('PIA', 17, 75.2), lap('NOR', 12, 75.4)];

  it('gives a teammate the second colour and another lap of the same driver a lighter shade', () => {
    expect(buildColors(laps, getColor, areTeammates)).toEqual(['#EA4E00', '#000000', '#ee7133']);
  });

  it('adds the lap number only for a driver shown twice', () => {
    expect(laps.map(l => buildLabel(l, laps))).toEqual(['NOR L19', 'PIA', 'NOR L12']);
  });
});
