import { describe, expect, it } from 'vitest';
import { constructorStandings, driverCode, driverStandings, headToHead, seasonDrivers } from './season';
import type { JolpicaDriver, ResultEntry, SeasonBundle } from './types';

const VER: JolpicaDriver = { driverId: 'max_verstappen', code: 'VER', givenName: 'Max', familyName: 'Verstappen' };
const NOR: JolpicaDriver = { driverId: 'norris', code: 'NOR', givenName: 'Lando', familyName: 'Norris' };
const HIL: JolpicaDriver = { driverId: 'hill', givenName: 'Damon', familyName: 'Hill' }; // no code, like older seasons

const result = (driver: JolpicaDriver, position: number, status: string, extra: Partial<ResultEntry> = {}): ResultEntry => ({
  position: String(position), Driver: driver, status, points: '0', grid: '5', Constructor: { name: 'Red Bull' }, ...extra,
});

// Built so the old Race H2H rule (retirements credited to whoever had fewer
// DNFs over the season) gives 1–2, while the classification gives 2–1.
const season: SeasonBundle = {
  year: 2025,
  results: [
    { round: '1', raceName: 'Australian Grand Prix', Results: [
      result(VER, 1, 'Finished', { points: '25', grid: '1', FastestLap: { rank: '1' } }),
      result(NOR, 2, 'Finished', { points: '18', Constructor: { name: 'McLaren' } }),
      result(HIL, 3, 'Finished', { points: '15', Constructor: { name: 'Williams' } }),
    ] },
    { round: '2', raceName: 'Chinese Grand Prix', Results: [
      result(NOR, 1, 'Finished', { points: '25', Constructor: { name: 'McLaren' } }),
      result(VER, 15, 'Engine'),
    ] },
    { round: '3', raceName: 'Japanese Grand Prix', Results: [
      // Both retired: VER covered more distance
      result(VER, 16, 'Accident'),
      result(NOR, 17, 'Collision', { Constructor: { name: 'McLaren' } }),
      result(HIL, 4, '+1 Lap', { points: '12', Constructor: { name: 'Haas' } }),
    ] },
    { round: '4', raceName: 'Bahrain Grand Prix', Results: [
      result(VER, 3, '+1 Lap', { points: '15' }),
    ] },
  ],
  qualifying: [
    { round: '1', raceName: 'Australian Grand Prix', QualifyingResults: [result(VER, 1, ''), result(NOR, 2, '')] },
    { round: '2', raceName: 'Chinese Grand Prix', QualifyingResults: [result(NOR, 1, ''), result(VER, 3, '')] },
    { round: '3', raceName: 'Japanese Grand Prix', QualifyingResults: [result(VER, 2, ''), result(NOR, 4, '')] },
  ],
  sprints: [
    { round: '2', raceName: 'Chinese Grand Prix', SprintResults: [
      result(NOR, 1, 'Finished', { grid: '2' }),
      result(VER, 2, 'Finished', { grid: '1' }),
    ] },
  ],
  driverStandings: [
    { position: '1', points: '100', Driver: VER, Constructors: [{ name: 'Red Bull' }] },
    { position: '2', points: '90', Driver: NOR, Constructors: [{ name: 'McLaren' }] },
    { points: '0', Driver: HIL, Constructors: [{ name: 'Haas' }] },
  ],
  constructorStandings: [
    { position: '1', points: '190', Constructor: { name: 'McLaren' } },
    { points: '0', Constructor: { name: 'Forti' } },
  ],
};

describe('headToHead', () => {
  const h2h = headToHead(season, 'VER', 'NOR')!;

  it('gives each race to the driver classified ahead, retirements included', () => {
    expect([h2h.driver1.stats.raceWins, h2h.driver2.stats.raceWins]).toEqual([2, 1]);
  });

  it('counts qualifying and sprint head-to-heads', () => {
    expect([h2h.driver1.stats.qualiWins, h2h.driver2.stats.qualiWins]).toEqual([2, 1]);
    expect(h2h.sprint).toEqual({ sqWins1: 1, sqWins2: 0, sWins1: 0, sWins2: 1, totalSprints: 1 });
  });

  it('computes each driver’s season stats', () => {
    const ver = h2h.driver1.stats;
    expect(ver).toMatchObject({ wins: 1, podiums: 2, poles: 1, poleWins: 1, fastestLaps: 1, dnfs: 2 });
    expect(ver.dnfCauses).toEqual(['Engine', 'Accident']);
    expect(ver.raceFinishes).toEqual([1, 3]);
    expect(ver.avgRacePosition).toBe(2);
    expect(ver.racePoints).toBe(40);
    expect(ver.points).toBe(100); // official standings, sprints included
  });

  it('lists every race of driver 1, with DNFs as null', () => {
    expect(h2h.totalRaces).toBe(4);
    expect(h2h.raceLog.map(r => [r.round, r.pos1, r.pos2])).toEqual([[1, 1, 2], [2, null, 1], [3, null, null], [4, 3, null]]);
  });

  it('returns null when a driver isn’t in the season', () => {
    expect(headToHead(season, 'VER', 'XXX')).toBeNull();
  });
});

describe('season lists', () => {
  it('derives a code for drivers without one', () => {
    expect(driverCode(HIL)).toBe('HIL');
  });

  it('lists everyone who raced, with their latest team', () => {
    expect(seasonDrivers(season)).toEqual([
      { code: 'HIL', team: 'Haas' },
      { code: 'NOR', team: 'McLaren' },
      { code: 'VER', team: 'Red Bull' },
    ]);
  });

  it('keeps unclassified standings without a position', () => {
    expect(driverStandings(season).map(s => s.position)).toEqual([1, 2, null]);
    expect(constructorStandings(season).map(c => c.position)).toEqual([1, null]);
  });
});
