// The top two's laps as the site's lap chart plots them, for the pace scene
// and its camera.
import { lapChartDomain, lapChartRows, type LapChartRow } from '../../../frontend/src/components/lapChart';
import type { GPTempoLap } from '../../../frontend/src/types/session';
import type { Recap, RecapDriver } from './data';

export interface PaceChart {
  drivers: RecapDriver[];
  rows: LapChartRow[];
  domain: [number, number];
}

const asLaps = (d: RecapDriver): GPTempoLap[] => (d.laps ?? []).map((LapTime, k) => ({
  LapNumber: k + 1, LapTime, Compound: d.compounds?.[k] ?? null,
  Sector1Time: null, Sector2Time: null, Sector3Time: null, IsPersonalBest: false, HasTelemetry: false, Team: d.team, Driver: d.code,
}));

export function paceChart(recap: Recap): PaceChart {
  const drivers = recap.drivers.slice(0, 2).filter(d => d.laps);
  const codes = drivers.map(d => d.code);
  const laps = Object.fromEntries(drivers.map(d => [d.code, asLaps(d)]));
  const rows = lapChartRows(code => laps[code], codes, false);
  return { drivers, rows, domain: lapChartDomain(rows, codes) };
}
