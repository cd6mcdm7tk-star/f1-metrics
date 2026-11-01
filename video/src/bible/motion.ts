// The episode's lap clock; easing and timing live in the kit.
import { interpolate as along, type Duel } from '../duel/data';

export { EASE_IN_OUT, EASE_OUT, ramp } from '../kit/motion';

/** The faster lap's clock: how long it takes to reach a distance, and where it is at a time */
export function lapClock(duel: Duel) {
  const time = duel.time[0];
  return {
    timeAt: (distance: number) => along(duel.distance, time, distance),
    distanceAt: (seconds: number) => along(time, duel.distance, seconds),
  };
}
