import { describe, expect, it } from 'vitest';
import { costPerPoint } from '../accounts';
import { ASTON_MARTIN } from '../astonMartin';
import { MCLAREN, withoutBonuses } from './data';

describe("McLaren's accounts", () => {
  const { years, bonuses, rescue, season } = MCLAREN;
  const byYear = new Map(years.map(y => [y.year, y]));

  it('adds up to the results the accounts print', () => {
    // Turnover less costs, plus other income and interest, gives the published result
    expect(byYear.get(2025)!.revenue - byYear.get(2025)!.costs + 32.742).toBeCloseTo(bonuses.operatingResult, 3);
    expect(byYear.get(2024)!.revenue - byYear.get(2024)!.costs + 26.295).toBeCloseTo(48.462, 3);
  });

  it('holds the figures the script quotes', () => {
    expect(Math.round(-byYear.get(2025)!.result)).toBe(17);
    expect(rescue.investment).toBe(185);
    expect(byYear.get(2025)!.revenue / byYear.get(2019)!.revenue).toBeGreaterThan(3);
    expect(Math.round(bonuses.shareBased[1].value)).toBe(136);
    expect(Math.round(withoutBonuses(MCLAREN))).toBe(93);
    expect(Math.round(bonuses.directors)).toBe(102);
    expect(Math.round(bonuses.topEarner)).toBe(82);
    expect(bonuses.topEarner).toBeGreaterThan(byYear.get(2024)!.result);
  });

  it('prices a point at 0.8 million, against 4.4 at Aston Martin', () => {
    const ours = costPerPoint(years).find(c => c.year === 2025)!.value;
    const theirs = costPerPoint(ASTON_MARTIN.years).find(c => c.year === 2025)!.value;
    expect(+ours.toFixed(1)).toBe(0.8);
    expect(+theirs.toFixed(1)).toBe(4.4);
  });

  it('stands fourth in 2026, about 250 points behind Mercedes', () => {
    const place = season.standings.findIndex(([team]) => team === MCLAREN.team);
    expect(place + 1).toBe(4);
    expect(season.standings[0][1] - season.standings[place][1]).toBe(252);
  });
});
