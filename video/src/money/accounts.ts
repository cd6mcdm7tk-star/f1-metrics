// A team's money, from its published accounts, and what a video says about it.
import type { DuelQuery } from '../api';

export interface AccountsYear {
  year: number;
  /** Turnover, total costs (cost of sales and administrative expenses), loss for the year, interest paid (£m) */
  revenue: number;
  costs: number;
  loss: number;
  interest: number;
  /** Average headcount and staff costs (£m), when the accounts give them on the same basis */
  staff?: number;
  payroll?: number;
  /** The constructors' championship that year */
  points?: number;
  position?: number;
}

/** The current season so far: [team, points], in standings order */
export interface SeasonSoFar {
  year: number;
  rounds: number;
  standings: [string, number][];
}

/** A scan of the income statement (under public/), its size, and where the quoted lines and the year's column sit (px) */
export interface AccountsScan {
  file: string;
  width: number;
  height: number;
  rows: number[];
  column: [number, number];
}

export interface TeamAccounts {
  team: string;
  company: string;
  number: string;
  color: string;
  /** In year order */
  years: AccountsYear[];
  latest: { year: number; facilities: number; loans: number; operatingLoss: number; research: number };
  season: SeasonSoFar;
  /** A qualifying session at the circuit by the team's base, for its shape */
  base: DuelQuery;
  scan: AccountsScan;
}

/** Spending per championship point (£m), for the years with points */
export const costPerPoint = (years: Pick<AccountsYear, 'year' | 'costs' | 'points'>[]): { year: number; value: number }[] =>
  years.filter(y => y.points).map(y => ({ year: y.year, value: y.costs / y.points! }));

/** The losses added up (£m) */
export const totalLoss = (years: AccountsYear[]): number => years.reduce((sum, y) => sum + y.loss, 0);

/** "344", "4,4": £m as said on screen, in French */
export const millions = (value: number, digits = 0): string => value.toFixed(digits).replace('.', ',');
