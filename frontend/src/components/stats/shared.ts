import { teamColor } from '../../utils/teamColors';

export const MONO = "'JetBrains Mono', monospace";
export const DISPLAY = "'Rajdhani', sans-serif";

/** Each value's share of the total, in %; 50/50 when both are zero. */
export function share(value1: number, value2: number): [number, number] {
  const total = value1 + value2;
  return total === 0 ? [50, 50] : [(value1 / total) * 100, (value2 / total) * 100];
}

/** Teammates share a team colour, so the second one is drawn in black. */
export function pairColors(team1: string, team2: string): [string, string] {
  return [teamColor(team1), team1.toLowerCase() === team2.toLowerCase() ? '#000000' : teamColor(team2)];
}
