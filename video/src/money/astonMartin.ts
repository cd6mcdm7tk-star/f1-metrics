// Aston Martin's F1 team in figures, from the annual accounts AMR GP Limited
// (company 11496673) filed at Companies House: full accounts for 2022 to
// 2025, read on their statement of comprehensive income, balance sheet and
// notes. Each year's figures come from the latest accounts that show it (the
// 2024 accounts restate 2023's headcount, 369 → 651). Amounts in £m.
import type { TeamAccounts } from './accounts';

export const ASTON_MARTIN: TeamAccounts = {
  team: 'Aston Martin',
  company: 'AMR GP Limited',
  number: '11496673',
  color: '#229971',
  years: [
    // 2023 accounts (filed 19 Oct 2024), comparatives for 2022
    { year: 2022, revenue: 187.728, costs: 152.046 + 127.853, loss: 52.915, interest: 0.233 },
    // 2024 accounts (filed 21 Oct 2025), comparatives for 2023
    { year: 2023, revenue: 244.652, costs: 162.358 + 123.435, loss: 29.705, interest: 4.544, staff: 651, payroll: 51.952, points: 280, position: 5 },
    // 2025 accounts (filed 25 Sep 2026), comparatives for 2024
    { year: 2024, revenue: 280.683, costs: 181.090 + 137.247, loss: 45.793, interest: 27.020, staff: 845, payroll: 69.840, points: 94, position: 5 },
    // 2025 accounts: income statement p. 14, notes 6 and 8, balance sheet p. 15, notes 22-23; points and place from the strategic report p. 1
    { year: 2025, revenue: 344.234, costs: 199.122 + 195.048, loss: 41.072, interest: 32.718, staff: 996, payroll: 134.134, points: 89, position: 7 },
  ],
  latest: {
    year: 2025,
    /** Tangible fixed assets: the campus and the wind tunnel commissioned in 2025 */
    facilities: 289.701,
    /** Loans falling due after more than one year */
    loans: 336.608,
    operatingLoss: 20.357,
    research: 136.7,
  },
  // The constructors' standings after 17 rounds of 2026, from metrikdelta.com/stats
  season: {
    year: 2026,
    rounds: 17,
    standings: [
      ['Mercedes', 578], ['Ferrari', 444], ['McLaren', 339], ['Red Bull', 332], ['Racing Bulls', 100], ['Alpine', 68],
      ['Haas', 30], ['Audi', 23], ['Williams', 12], ['Aston Martin', 7], ['Cadillac', 0],
    ],
  },
  // Silverstone, next to the team's campus: 2025's British GP qualifying
  base: { year: 2025, gp: 12, session: 'Q', drivers: ['VER', 'PIA'] },
  // The 2025 income statement (p. 14): turnover, interest payable, loss for the year
  scan: { file: 'money/amr-gp-2025-income.png', width: 1100, height: 924, rows: [362, 736, 887], column: [790, 915] },
};
