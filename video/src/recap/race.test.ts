import { describe, expect, it } from 'vitest';
import { fillLaps } from './data';
import { recap } from './fixture';
import { cleanPace, cumulative, gapsToLeader, neutralisations, placesByLap, raceFacts, stints } from './race';

describe('stints', () => {
  it('cuts the race where the tyre changes', () => {
    expect(stints(['SOFT', 'SOFT', 'MEDIUM', 'MEDIUM', 'SOFT'])).toEqual([
      { compound: 'SOFT', from: 1, to: 2 }, { compound: 'MEDIUM', from: 3, to: 4 }, { compound: 'SOFT', from: 5, to: 5 },
    ]);
  });
});

describe('gapsToLeader', () => {
  it('measures each driver from whoever has run the laps quickest', () => {
    expect(cumulative([10, 11, 9])).toEqual([10, 21, 30]);
    expect(gapsToLeader([[10, 10, 10], [11, 9, 9]])).toEqual([[0, 0, 1], [1, 0, 0]]);
  });

  it('places them lap by lap, a tie to the one listed first', () => {
    expect(placesByLap([[0, 0, 1], [1, 0, 0]])).toEqual([[1, 1, 2], [2, 2, 1]]);
  });
});

describe('neutralisations', () => {
  it('finds the laps everyone ran slowly, not one driver\'s stop', () => {
    expect(neutralisations([[90, 90, 130, 90], [91, 120, 128, 91], [92, 92, 131, 92]])).toEqual([{ from: 3, to: 3 }]);
  });

  it('joins slow laps in a row into one period, and ignores the start', () => {
    const race = (offset: number) => [120, 90, 90, 125, 118, 90, 90, 90].map(t => t + offset);
    expect(neutralisations([race(0), race(1), race(2)])).toEqual([{ from: 4, to: 5 }]);
  });
});

describe('cleanPace', () => {
  it('averages the laps that are neither the first, neutralised nor a stop', () => {
    const laps = [99, 90, 91, 120, 110, 92, 93];
    expect(cleanPace(laps, [{ from: 5, to: 5 }])).toBe((90 + 91 + 92 + 93) / 4);
    expect(cleanPace(laps, [{ from: 5, to: 5 }], 6)).toBe(92.5);
  });
});

describe('fillLaps', () => {
  it('fills a missing lap with the field\'s median on it', () => {
    expect(fillLaps([[90, null], [91, 92], [93, 94]])).toEqual([[90, 93], [91, 92], [93, 94]]);
  });
});

describe('prepareRecap', () => {
  it('keeps the classification, and laps only for the drivers followed', () => {
    expect(recap.drivers.map(d => d.code)).toEqual(['AAA', 'BBB', 'CCC', 'DDD', 'EEE']);
    expect(recap.drivers[0].laps).toHaveLength(12);
    expect(recap.drivers[3].laps).toBeNull();
  });

  it('reads a grid of 0 as a pit lane start, and colours each team', () => {
    expect(recap.drivers[3].grid).toBeNull();
    expect(recap.drivers[1].color).toBe('#E8002D');
  });
});

describe('raceFacts', () => {
  const facts = raceFacts(recap);

  it('has the winner leading every lap', () => {
    expect(facts.winner.code).toBe('AAA');
    expect(facts.lapsLed).toBe(12);
    expect(facts.totalLaps).toBe(12);
  });

  it('finds the fastest lap and who climbed most from the grid', () => {
    expect(facts.fastest).toMatchObject({ lap: 1, time: 90 });
    expect(facts.fastest.driver.code).toBe('AAA');
    expect(facts.climbers.map(c => [c.driver.code, c.gained])).toEqual([['BBB', 3]]);
  });

  it('finds who held a place for a while and lost it by the flag', () => {
    expect(facts.faller).toMatchObject({ best: 2, final: 3, lap: 1 });
    expect(facts.faller!.driver.code).toBe('CCC');
  });

  it('lists the retirements, and each driver\'s stints', () => {
    expect(facts.retired.map(d => d.code)).toEqual(['EEE']);
    expect(facts.followed[1].stints).toEqual([{ compound: 'SOFT', from: 1, to: 3 }, { compound: 'HARD', from: 4, to: 12 }]);
  });
});
