// Timing helpers shared by the episode's scenes.
import { Easing, interpolate } from 'remotion';
import { interpolate as along, type Duel } from '../duel/data';

export const EASE_IN_OUT = Easing.inOut(Easing.cubic);
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 from frame `from` to `to`, eased, held either side */
export const ramp = (frame: number, from: number, to: number, easing = EASE_IN_OUT): number =>
  interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/** The faster lap's clock: how long it takes to reach a distance, and where it is at a time */
export function lapClock(duel: Duel) {
  const time = duel.time[0];
  return {
    timeAt: (distance: number) => along(duel.distance, time, distance),
    distanceAt: (seconds: number) => along(time, duel.distance, seconds),
  };
}
