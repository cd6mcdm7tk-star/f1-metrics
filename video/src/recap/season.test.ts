import { describe, expect, it } from 'vitest';
import type { RaceResult } from './data';
import { standings, winStreak, type SeasonRound } from './season';

const entry = (position: number, code: string, points: number, team = 'Ferrari'): RaceResult => ({
  position: String(position), points: String(points), Driver: { code, familyName: code.toLowerCase() }, Constructor: { name: team },
});
const races: SeasonRound[] = [
  { round: '1', Results: [entry(1, 'AAA', 25), entry(2, 'BBB', 18), entry(3, 'CCC', 15)] },
  { round: '2', Results: [entry(1, 'CCC', 25), entry(2, 'BBB', 18), entry(3, 'AAA', 15)] },
  { round: '3', Results: [entry(1, 'CCC', 25, 'Red Bull'), entry(2, 'AAA', 18), entry(3, 'BBB', 15)] },
];
const sprints: SeasonRound[] = [{ round: '3', SprintResults: [entry(1, 'BBB', 8), entry(2, 'CCC', 7)] }];

describe('standings', () => {
  it('adds up the races and sprints before and after the round', () => {
    const table = standings(races, sprints, 3);
    // Level on 40 before it, AAA ahead alphabetically; CCC wins round 3 and BBB the sprint
    expect(table.map(s => [s.code, s.before, s.after, s.place, s.placeBefore])).toEqual([
      ['CCC', 40, 72, 1, 2], ['BBB', 36, 59, 2, 3], ['AAA', 40, 58, 3, 1],
    ]);
  });

  it('colours each driver by the team they last raced for', () => {
    expect(standings(races, sprints, 3).find(s => s.code === 'CCC')!.color).toBe('#3671C6');
  });
});

describe('winStreak', () => {
  it('counts the wins in a row up to the round', () => {
    expect(winStreak(races, 'CCC', 3)).toBe(2);
    expect(winStreak(races, 'CCC', 2)).toBe(1);
    expect(winStreak(races, 'AAA', 3)).toBe(0);
  });
});
