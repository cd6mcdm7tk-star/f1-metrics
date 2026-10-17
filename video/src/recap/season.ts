// The championship around a race: everyone's points before and after it, and
// the winner's run of wins, from the season's results (sprints included).
import { teamColor } from '../../../frontend/src/utils/teamColors';
import type { RaceResult } from './data';

/** A round of the season, as the season endpoint gives it */
export interface SeasonRound {
  round: string;
  Results?: RaceResult[];
  SprintResults?: RaceResult[];
}

export interface Standing {
  code: string;
  name: string;
  color: string;
  before: number;
  after: number;
  /** 1 for the leader */
  place: number;
  placeBefore: number;
}

const codeOf = (r: RaceResult) => r.Driver.code ?? r.Driver.familyName.slice(0, 3).toUpperCase();

function pointsUpTo(rounds: SeasonRound[], last: number): Map<string, number> {
  const total = new Map<string, number>();
  for (const round of rounds) {
    if (Number(round.round) > last) continue;
    for (const r of round.Results ?? round.SprintResults ?? []) total.set(codeOf(r), (total.get(codeOf(r)) ?? 0) + Number(r.points ?? 0));
  }
  return total;
}

/** Places by points, a tie to the driver first in alphabetical order */
const ranked = (points: Map<string, number>) => [...points.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([code]) => code);

/** The top of the drivers' championship after round `round`, with where they were before it */
export function standings(races: SeasonRound[], sprints: SeasonRound[], round: number, top = 6): Standing[] {
  const all = [...races, ...sprints];
  const before = pointsUpTo(all, round - 1), after = pointsUpTo(all, round);
  const order = ranked(after), orderBefore = ranked(before);
  // Each driver as last seen: their name and their team's colour
  const seen = new Map<string, RaceResult>();
  for (const race of [...races].sort((a, b) => Number(a.round) - Number(b.round))) {
    if (Number(race.round) <= round) for (const r of race.Results ?? []) seen.set(codeOf(r), r);
  }
  return order.slice(0, top).map((code, i) => ({
    code, name: seen.get(code)?.Driver.familyName ?? code, color: teamColor(seen.get(code)?.Constructor?.name ?? ''),
    before: before.get(code) ?? 0, after: after.get(code) ?? 0,
    place: i + 1, placeBefore: orderBefore.includes(code) ? orderBefore.indexOf(code) + 1 : order.length,
  }));
}

/** How many races in a row `code` has won, up to round `round` */
export function winStreak(races: SeasonRound[], code: string, round: number): number {
  const sorted = races.filter(r => Number(r.round) <= round).sort((a, b) => Number(b.round) - Number(a.round));
  let streak = 0;
  for (const race of sorted) {
    const winner = race.Results?.find(r => r.position === '1');
    if (!winner || codeOf(winner) !== code) break;
    streak++;
  }
  return streak;
}
