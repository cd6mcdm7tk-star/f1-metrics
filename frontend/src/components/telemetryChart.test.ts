import { describe, expect, it } from 'vitest';
import type { DriverMeta, TelemetryDataMulti, TelemetryPointMulti } from '../types/telemetry';
import { buildChartData, buildColors, buildLabel, cornerLabels, fastestLapIndex, miniSectorLeaders } from './telemetryChart';

const lap = (driver: string, lap: number, lapTime: number | null): DriverMeta => ({
  driver, lap, lapTime, year: 2025, gp: 1, session: 'Q', sectors: { s1: null, s2: null, s3: null },
});

describe('cornerLabels', () => {
  const corners = [
    { label: 'T1', distance: 100 }, { label: 'T2', distance: 130 }, { label: 'T3', distance: 160 },
    { label: 'T4', distance: 600 }, { label: 'T5', distance: 2000 },
  ];

  it('merges corners too close to label apart, and keeps the others over their corner', () => {
    expect(cornerLabels(corners, [0, 1000], 300, 6)).toEqual([{ text: 'T1–3', x: 39 }, { text: 'T4', x: 180 }]);
  });

  it('labels every corner on its own once there is room, as when zoomed in', () => {
    expect(cornerLabels(corners, [0, 1000], 3000, 6).map(l => l.text)).toEqual(['T1', 'T2', 'T3', 'T4']);
  });

  it('draws nothing before the plot has a width', () => {
    expect(cornerLabels(corners, [0, 1000], 0, 6)).toEqual([]);
  });
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

describe('miniSectorLeaders', () => {
  // Two laps over 200 m: the second gains 0.1 s in the first half, then loses 0.05 s
  const point = (distance: number, gap: number, speeds: number[]): TelemetryPointMulti => ({
    distance, speeds, deltas: [0, gap], throttles: [], brakes: [], gears: [], rpms: [], x: 0, y: 0,
  });
  const points = [point(0, 0, [100, 100]), point(50, -0.05, [80, 140]), point(100, -0.1, [100, 100]),
    point(150, -0.08, [200, 150]), point(200, -0.05, [200, 150])];

  it('gives each length to the lap that spent the least time in it', () => {
    expect(miniSectorLeaders(points, 2, 2)).toEqual([1, 0]);
  });

  it('leaves out the lengths a replay has not reached', () => {
    expect(miniSectorLeaders(points, 2, 2, 120)).toEqual([1, -1]);
  });
});
