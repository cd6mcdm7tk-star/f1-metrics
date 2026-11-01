import { describe, expect, it } from 'vitest';
import { testDuel } from '../duel/fixture';
import { neutralisations, placesByLap, type RaceDriver, type RaceWeekend } from './data';
import { raceFacts } from './facts';

const driver = (code: string, grid: number, position: number | null, points: number): RaceDriver => ({
  code, name: code, team: '', color: '#fff', grid, position, laps: position ? 4 : 2, gap: null, points,
});

// Four laps: A leads but stops on lap 2, when B leads; C climbs from the back; D retires
const race: RaceWeekend = {
  year: 2026, round: 18, location: 'Test', totalLaps: 4,
  drivers: [driver('A', 1, 1, 25), driver('B', 3, 2, 18), driver('C', 4, 3, 15), driver('D', 2, null, 0)],
  positions: { A: [1, 2, 1, 1], B: [2, 1, 2, 2], C: [4, 3, 3, 3], D: [3, 4, null, null] },
  stints: { A: [{ compound: 'MEDIUM', from: 1, to: 2 }, { compound: 'HARD', from: 2, to: 4 }], B: [{ compound: 'HARD', from: 1, to: 4 }], C: [], D: [] },
  lapTimes: { A: [90, 100, 91, 91.5], B: [91, 92, 92, 90.2], C: [], D: [] },
  neutralised: [],
  standings: [['A', 300], ['B', 290], ['C', 100]],
  remaining: { races: 2, sprints: 1 },
  next: 'Next',
  fastest: { code: 'B', lap: 4, time: 90.2 },
  duel: testDuel(),
};

describe('race facts', () => {
  const facts = raceFacts(race);

  it('finds who led which laps', () => {
    expect(facts.leaders).toEqual([{ code: 'A', from: 1, to: 1 }, { code: 'B', from: 2, to: 2 }, { code: 'A', from: 3, to: 4 }]);
    expect(facts.lapsLed).toEqual({ A: 3, B: 1 });
  });

  it('measures the first lap, the stops and the climbers', () => {
    expect(facts.firstLap).toEqual({ A: 0, B: 1, C: 0, D: -1 });
    expect(facts.stops).toEqual({ A: 1, B: 0, C: 0, D: 0 });
    expect(facts.climbers.map(c => [c.driver.code, c.gained])).toEqual([['B', 1], ['C', 1], ['A', 0]]);
  });

  it("compares the fastest lap with the winner's, and updates the standings", () => {
    expect(facts.fastestGain).toBeCloseTo(1.3);
    expect(facts.standings).toEqual([['A', 325], ['B', 308], ['C', 115]]);
    expect(facts.lead).toBe(17);
    expect(facts.pointsLeft).toBe(58);
  });
});

describe('race data', () => {
  it('ranks the cars by when they crossed the line on each lap', () => {
    const places = placesByLap([
      { code: 'A', lap: 1, end: 100 }, { code: 'B', lap: 1, end: 101 },
      { code: 'B', lap: 2, end: 190 }, { code: 'A', lap: 2, end: 195 },
    ], 2);
    expect(places).toEqual({ A: [1, 2], B: [2, 1] });
  });

  it('reads safety car periods from race control', () => {
    expect(neutralisations([
      { lap_number: 2, category: 'SafetyCar', message: 'VSC DEPLOYED' },
      { lap_number: 2, category: 'SafetyCar', message: 'VSC ENDING' },
      { lap_number: 30, category: 'SafetyCar', message: 'SAFETY CAR DEPLOYED' },
      { lap_number: 33, category: 'SafetyCar', message: 'SAFETY CAR IN THIS LAP' },
      { lap_number: 40, category: 'Flag', message: 'DOUBLE YELLOW IN TRACK SECTOR 3' },
    ])).toEqual([{ kind: 'VSC', from: 2, to: 2 }, { kind: 'SC', from: 30, to: 33 }]);
  });
});
