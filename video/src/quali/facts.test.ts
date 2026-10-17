import { describe, expect, it } from 'vitest';
import { qualiFacts } from './facts';
import { quali } from './fixture';

const facts = qualiFacts(quali);

describe('prepareQuali', () => {
  it('keeps each driver\'s best lap, best sectors and the lap those make', () => {
    const bbb = quali.drivers.find(d => d.code === 'BBB')!;
    expect(bbb.best).toBe(91.6);
    expect(bbb.bestSectors).toEqual([27.1, 38.2, 25.9]);
    expect(bbb.ideal).toBeCloseTo(91.2, 6);
    expect(quali.drivers.find(d => d.code === 'DDD')!.laps).toBe(1);
    expect(quali.drivers.find(d => d.code === 'EEE')!.best).toBeNull();
  });
});

describe('qualiFacts', () => {
  it('measures everyone from the pole lap', () => {
    expect(facts.pole.code).toBe('AAA');
    expect(facts.gaps.map(g => [g.driver.code, +g.gap.toFixed(3)])).toEqual([['AAA', 0], ['CCC', 0.05], ['BBB', 0.3], ['DDD', 0.6]]);
    expect(facts.within).toEqual({ gap: 0.2, count: 2 });
  });

  it('finds the quickest in each sector, and the lap someone had in them', () => {
    expect(facts.sectors.map(s => [s.driver.code, s.time])).toEqual([['AAA', 27], ['BBB', 38.2], ['AAA', 25.8]]);
    expect(facts.ideal?.driver.code).toBe('BBB');
    expect(facts.ideal?.underPole).toBeCloseTo(0.1, 6);
  });

  it('pairs teammates, the quicker first', () => {
    expect(facts.teammates.map(t => [t.ahead.code, t.behind.code, +t.gap.toFixed(3)])).toEqual([['AAA', 'BBB', 0.3], ['CCC', 'DDD', 0.55]]);
  });
});
