// A driver selection carried from one session to the next: kept for the
// drivers who took part, dropped for those who didn't (Antonelli carried from
// 2026 into 2023).
import type { SessionDriver } from '../types/session';

/** The selected drivers who are in the session, in their order */
export function inSession(selected: string[], drivers: SessionDriver[]): string[] {
  const codes = new Set(drivers.map(d => d.abbreviation));
  return selected.filter(code => codes.has(code));
}

/** The default pair for a session: each driver kept when they took part,
 * otherwise the session's first driver not already in the pair */
export function pairInSession(pair: [string, string], drivers: SessionDriver[]): [string, string] {
  const codes = drivers.map(d => d.abbreviation);
  const result = pair.map(code => (codes.includes(code) ? code : ''));
  for (let i = 0; i < result.length; i++) {
    if (!result[i]) result[i] = codes.find(code => !result.includes(code)) ?? '';
  }
  return [result[0], result[1]];
}
