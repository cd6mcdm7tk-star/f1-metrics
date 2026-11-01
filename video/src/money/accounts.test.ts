import { describe, expect, it } from 'vitest';
import { costPerPoint, millions, totalLoss } from './accounts';
import { ASTON_MARTIN } from './astonMartin';

describe("a team's accounts", () => {
  const { years } = ASTON_MARTIN;

  it('prices a point from the total costs, for the years with points', () => {
    expect(costPerPoint(years).map(c => [c.year, +c.value.toFixed(2)])).toEqual([[2023, 1.02], [2024, 3.39], [2025, 4.43]]);
  });

  it('adds the losses up, and says them in French', () => {
    expect(millions(totalLoss(years))).toBe('169');
    expect(millions(4.43, 1)).toBe('4,4');
  });

  it("holds the figures the script quotes", () => {
    const last = years[years.length - 1];
    expect(Math.round(last.costs)).toBe(394);
    expect(last.revenue / years[0].revenue).toBeGreaterThan(1.8);
    expect(last.staff! / years[1].staff!).toBeGreaterThan(1.5);
    expect(last.payroll! / years[2].payroll!).toBeGreaterThan(1.9);
    expect(last.interest).toBeGreaterThan(ASTON_MARTIN.latest.operatingLoss);
  });
});
