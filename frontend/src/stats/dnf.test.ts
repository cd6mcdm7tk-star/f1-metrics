import { describe, expect, it } from 'vitest';
import { categorizeDnf, summarizeDnfCauses } from './dnf';

describe('categorizeDnf', () => {
  it.each([
    ['Accident', 'Accident'],
    ['Collision damage', 'Accident'],
    ['Spun off', 'Accident'],
    ['Engine', 'Mechanical'],
    ['Power Unit', 'Mechanical'],
    ['Disqualified', 'Disqualified'],
    ['Did not start', 'Withdrew'],
    ['Retired', 'Retired (unspecified)'],
    ['Illness', 'Other'],
  ])('%s → %s', (status, cause) => {
    expect(categorizeDnf(status)).toBe(cause);
  });

  it('counts every cause', () => {
    expect(summarizeDnfCauses(['Engine', 'Gearbox', 'Retired'])).toMatchObject({ Mechanical: 2, 'Retired (unspecified)': 1, Accident: 0 });
  });
});
