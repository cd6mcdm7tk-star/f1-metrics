// A small race for the tests: A runs away; B loses 20 s in the pits on lap 3;
// C holds second until its tyres go and B passes it on lap 9
import type { Duel } from '../duel/data';
import { prepareRecap, type RaceResult, type SessionLaps } from './data';

const sessionLaps = (times: (number | null)[], compounds: string[]): SessionLaps => ({
  laps: times.map((LapTime, k) => ({ LapNumber: k + 1, LapTime, Compound: compounds[k] ?? compounds.at(-1)! })),
});
const repeat = (n: number, time: number) => Array<number>(n).fill(time);

const results: RaceResult[] = [
  { position: '1', points: '25', grid: '1', status: 'Finished', Driver: { code: 'AAA', familyName: 'Alpha' }, Constructor: { name: 'Red Bull' } },
  { position: '2', points: '18', grid: '5', status: 'Finished', Driver: { code: 'BBB', familyName: 'Bravo' }, Constructor: { name: 'Ferrari' } },
  { position: '3', points: '15', grid: '2', status: 'Finished', Driver: { code: 'CCC', familyName: 'Charlie' }, Constructor: { name: 'McLaren' } },
  { position: '4', points: '12', grid: '0', status: 'Lapped', Driver: { code: 'DDD', familyName: 'Delta' }, Constructor: { name: 'Haas F1 Team' } },
  { position: '5', points: '0', grid: '3', status: 'Retired', Driver: { code: 'EEE', familyName: 'Echo' }, Constructor: { name: 'Williams' } },
];
const laps: Record<string, SessionLaps> = {
  AAA: sessionLaps(repeat(12, 90), ['SOFT', 'SOFT', 'SOFT', 'MEDIUM']),
  BBB: sessionLaps([91, 91, 110, ...repeat(9, 91)], ['SOFT', 'SOFT', 'SOFT', 'HARD']),
  CCC: sessionLaps([90.5, 90.5, 90.5, ...repeat(9, 95)], ['MEDIUM']),
};
export const recap = prepareRecap({ year: 2026, round: 1, location: 'Test', date: '2026-03-08', seasonRounds: 3 }, { races: [{ round: '1', Results: results }], sprints: [] }, laps, {} as Duel);
