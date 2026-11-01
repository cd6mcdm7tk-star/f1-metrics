// McLaren's F1 team in figures, from the annual accounts of McLaren Racing
// Limited (company 01517478) filed at Companies House: the full accounts for
// 2020 (filed 11 Aug 2021, with 2019 as comparatives) and for 2025 (filed
// 30 Sep 2026, with 2024). The years between are group accounts, which add
// the team's other series: left out so every year counts the same company.
// Amounts in £m; points and places from metrikdelta.com/stats.
import type { DuelQuery } from '../../api';
import type { AccountsScan, SeasonSoFar } from '../accounts';

export interface McLarenYear {
  year: number;
  /** Turnover, total costs (cost of sales and administrative expenses), result for the year (negative: a loss) */
  revenue: number;
  costs: number;
  result: number;
  points: number;
  position: number;
  /** Turnover swollen by a one-off sale: left out when years are compared */
  oneOff?: boolean;
}

export interface McLarenAccounts {
  team: string;
  company: string;
  number: string;
  color: string;
  /** In year order */
  years: McLarenYear[];
  /** 2020: the heritage cars sold within the group (profit on the sale), and the outside investors' money */
  rescue: { heritageProfit: number; investment: number };
  /** 2025: the bonuses tied to the team's value */
  bonuses: {
    /** Cash-settled share-based payments expensed, per year */
    shareBased: { year: number; value: number }[];
    operatingResult: number;
    /** Directors' long-term incentive schemes, paid and accrued */
    directors: number;
    /** The highest-paid director: remuneration plus long-term incentives */
    topEarner: number;
  };
  season: SeasonSoFar;
  /** The circuit behind the opening: the 2025 season's last round */
  base: DuelQuery;
  scan: AccountsScan;
}

export const MCLAREN: McLarenAccounts = {
  team: 'McLaren',
  company: 'McLaren Racing Limited',
  number: '01517478',
  color: '#FF8000',
  years: [
    // 2020 accounts p. 21, comparatives; fourth with 145 points (strategic report p. 3)
    { year: 2019, revenue: 185.740, costs: 216.699 + 56.055, result: -71.443, points: 145, position: 4 },
    // 2020 accounts p. 21: includes the heritage cars sold to McLaren Services Limited
    { year: 2020, revenue: 332.922, costs: 196.098 + 48.465, result: 85.838, points: 202, position: 3, oneOff: true },
    // 2025 accounts p. 12, comparatives
    { year: 2024, revenue: 488.393, costs: 375.023 + 91.203, result: 53.836, points: 666, position: 1 },
    // 2025 accounts p. 12
    { year: 2025, revenue: 588.483, costs: 534.332 + 129.651, result: -17.360, points: 833, position: 1 },
  ],
  // 2020 strategic report p. 3-5: £174.9m profit on the heritage cars, £185m invested by MSP Sports Capital and partners
  rescue: { heritageProfit: 174.9, investment: 185 },
  bonuses: {
    // 2025 accounts note 7 (p. 28), 2024 restated
    shareBased: [{ year: 2024, value: 38.163 }, { year: 2025, value: 136.246 }],
    // p. 12
    operatingResult: -42.758,
    // note 7 (p. 28)
    directors: 101.932,
    topEarner: 8.215 + 73.682,
  },
  // The constructors' standings after 18 rounds of 2026 (Austin), from metrikdelta.com/stats
  season: {
    year: 2026,
    rounds: 18,
    standings: [
      ['Mercedes', 607], ['Ferrari', 474], ['Red Bull', 355], ['McLaren', 355], ['Racing Bulls', 102], ['Alpine', 69],
      ['Haas', 30], ['Audi', 23], ['Williams', 12], ['Aston Martin', 7], ['Cadillac', 0],
    ],
  },
  // Yas Marina, the 2025 finale: its qualifying
  base: { year: 2025, gp: 24, session: 'Q', drivers: ['NOR', 'PIA'] },
  // The 2025 income statement (p. 12): turnover, operating loss, loss for the year
  scan: { file: 'money/mclaren-2025-income.png', width: 1101, height: 681, rows: [197, 416, 642], column: [839, 947] },
};

/** The last year's result without the bonuses tied to the team's value: its operating result before them */
export const withoutBonuses = (accounts: McLarenAccounts): number =>
  accounts.bonuses.operatingResult + accounts.bonuses.shareBased[accounts.bonuses.shareBased.length - 1].value;
