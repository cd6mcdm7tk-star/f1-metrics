// What a race says, for the screen: the podium, who led and for how long,
// the first lap, the stops, the climbers, the fastest lap against the
// winner's, and what the result does to the championship.
import type { RaceDriver, RaceWeekend } from './data';

/** The most a driver can score in a race, and in a sprint (no point for the fastest lap since 2025) */
const RACE_WIN = 25;
const SPRINT_WIN = 8;

export interface RaceFacts {
  winner: RaceDriver;
  podium: RaceDriver[];
  /** Spans of laps led, in order */
  leaders: { code: string; from: number; to: number }[];
  lapsLed: Record<string, number>;
  /** Places made or lost on the first lap, from the grid */
  firstLap: Record<string, number>;
  /** Pit stops: one fewer than stints */
  stops: Record<string, number>;
  /** Classified drivers by places gained from the grid, most first */
  climbers: { driver: RaceDriver; gained: number }[];
  /** The fastest lap's time against the winner's on the same lap (s) */
  fastestGain: number;
  /** The standings after the race, the leader's margin and what is left to score */
  standings: [string, number][];
  lead: number;
  pointsLeft: number;
}

export function raceFacts(race: RaceWeekend): RaceFacts {
  const classified = race.drivers.filter(d => d.position != null);
  const winner = classified[0];

  const leaders: RaceFacts['leaders'] = [];
  for (let lap = 1; lap <= race.totalLaps; lap++) {
    const code = Object.keys(race.positions).find(c => race.positions[c][lap - 1] === 1);
    if (!code) continue;
    const last = leaders[leaders.length - 1];
    if (last?.code === code && last.to === lap - 1) last.to = lap;
    else leaders.push({ code, from: lap, to: lap });
  }
  const lapsLed: Record<string, number> = {};
  for (const span of leaders) lapsLed[span.code] = (lapsLed[span.code] ?? 0) + span.to - span.from + 1;

  const firstLap = Object.fromEntries(race.drivers
    .filter(d => d.grid != null && race.positions[d.code]?.[0] != null)
    .map(d => [d.code, d.grid! - race.positions[d.code][0]!]));

  const climbers = classified
    .filter(d => d.grid != null)
    .map(d => ({ driver: d, gained: d.grid! - d.position! }))
    .sort((a, b) => b.gained - a.gained);

  const fastestGain = (race.lapTimes[winner.code]?.[race.fastest.lap - 1] ?? race.fastest.time) - race.fastest.time;

  const scored = new Map(race.drivers.map(d => [d.code, d.points]));
  const standings = race.standings
    .map(([code, points]): [string, number] => [code, points + (scored.get(code) ?? 0)])
    .sort((a, b) => b[1] - a[1]);

  return {
    winner, podium: classified.slice(0, 3), leaders, lapsLed, firstLap,
    stops: Object.fromEntries(race.drivers.map(d => [d.code, Math.max(0, (race.stints[d.code]?.length ?? 1) - 1)])),
    climbers, fastestGain, standings,
    lead: standings[0][1] - standings[1][1],
    pointsLeft: race.remaining.races * RACE_WIN + race.remaining.sprints * SPRINT_WIN,
  };
}
