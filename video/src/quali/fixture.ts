// A small qualifying session for the tests: AAA on pole; BBB, its teammate,
// has the quickest second sector and best sectors that beat the pole lap
import { testDuel } from '../duel/fixture';
import type { RaceResult, SessionLaps } from '../recap/data';
import { prepareQuali } from './data';

const entry = (position: number, code: string, team: string): RaceResult => ({
  position: String(position), Driver: { code, familyName: code.charAt(0) + code.slice(1).toLowerCase() }, Constructor: { name: team },
});
const results: RaceResult[] = [entry(1, 'AAA', 'Red Bull'), entry(2, 'CCC', 'Ferrari'), entry(3, 'BBB', 'Red Bull'), entry(4, 'DDD', 'Ferrari'), entry(5, 'EEE', 'Haas F1 Team')];

const lap = (LapNumber: number, s1: number, s2: number, s3: number): SessionLaps['laps'][number] => ({
  LapNumber, LapTime: +(s1 + s2 + s3).toFixed(3), Compound: 'SOFT', Sector1Time: s1, Sector2Time: s2, Sector3Time: s3,
});
const laps: Record<string, SessionLaps> = {
  AAA: { laps: [lap(1, 27.0, 38.5, 25.8), lap(2, 27.1, 38.6, 25.9)] },
  CCC: { laps: [lap(1, 27.05, 38.45, 25.85)] },
  // Its best sectors come from different laps: 27.1 + 38.2 + 25.9 = 91.2, under the pole's 91.3
  BBB: { laps: [lap(1, 27.1, 38.6, 26.0), lap(2, 27.3, 38.2, 26.1), lap(3, 27.2, 38.7, 25.9)] },
  DDD: { laps: [lap(1, 27.2, 38.7, 26.0), { LapNumber: 2, LapTime: null, Compound: 'SOFT' }] },
};

export const quali = prepareQuali({ year: 2026, round: 1, location: 'Test' }, results, laps, testDuel());
