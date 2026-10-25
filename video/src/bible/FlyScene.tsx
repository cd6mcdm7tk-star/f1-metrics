import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { teamColor } from '../../../frontend/src/utils/teamColors';
import type { Duel } from '../duel/data';
import { SAFE, VIDEO } from '../format';
import Headline, { headline } from '../kit/Headline';
import Hud from '../kit/Hud';
import { INK } from '../kit/ink';
import { blendCamera, fitCamera, mixAngle, orbit, type Camera3D } from '../kit/projection';
import Stage from '../kit/Stage';
import { positionAt, valueAt, type Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import type { CordeFacts, CordeStory } from './corde';
import { EASE_OUT, lapClock, ramp } from './motion';

// The hook, the approach and the braking, as one flight over the circuit:
// a whole lap as a streak of light under the question, a dive behind the
// pole car down the main straight at its real pace, then the braking for
// turn 1 while the camera rises until it looks straight down on the corner,
// approach at the bottom, like the schematic that follows.

/** The hook's title, a line each; its words are the voice's, revealed as said */
const HOOK = 'Pourquoi les pilotes\nne roulent *jamais*\nau milieu\nde la piste ?';
/** Where the whole circuit sits under the title */
const OVERVIEW = { x: 24, y: 780, w: VIDEO.width - 48, h: 700 };
/** How far the camera dives from the overview to behind the car (frames) */
const DIVE = 54;
const CHASE = { distance: 300, pitch: 0.55, ahead: 90, fov: 50, shift: -350 };
/** Where the dive lands: low, beside the car, before swinging round behind it */
const SIDE = { angle: 1.15, distance: 150, pitch: 0.24, ahead: 10, shift: -150 };
const ABOVE = { distance: 640, pitch: 1.5, shift: -60 };
/** Metres either side the chase camera measures the car's heading over, to ride the corner smoothly */
const CAMERA_SPAN = 80;

export default function FlyScene({ duel, track, facts, story, series, episode }: {
  duel: Duel; track: Track; facts: CordeFacts; story: CordeStory; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { hook, context, braking } = story.beats;
  const clock = useMemo(() => lapClock(duel), [duel]);
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const lap = duel.order[0];
  const driver = duel.drivers[0];
  const color = teamColor(duel.teams[driver.code] ?? '');

  // The car: a whole lap during the hook, then the main straight, then turn 1
  const approach = (facts.pole.brakeAt ?? facts.corner - 100) - 40;
  const through = facts.pole.minAt + 90;
  const lapTime = duel.time[0][duel.time[0].length - 1];
  const car = frame < context.from
    ? clock.distanceAt(lapTime * ramp(frame, hook.from, context.from - 6, (t: number) => t))
    : frame < braking.from
      ? clock.distanceAt(clock.timeAt(approach) * ramp(frame, context.from, braking.from, (t: number) => t))
      : clock.distanceAt(clock.timeAt(approach) + (clock.timeAt(through) - clock.timeAt(approach)) * ramp(frame, braking.from, braking.to + 20, (t: number) => t));

  const overview = (f: number): Camera3D =>
    fitCamera(ground, 0.95 + 0.18 * ramp(f, 0, context.from), 0.5, 40, OVERVIEW, VIDEO);
  const brakeHeading = positionAt(track, approach, CAMERA_SPAN).heading;
  const chase = (distance: number, swing: number, rise: number): Camera3D => {
    const p = positionAt(track, distance, CAMERA_SPAN);
    const mix = (side: number, behind: number) => side + (behind - side) * swing;
    const heading = mixAngle(p.heading + SIDE.angle * (1 - swing), brakeHeading, rise);
    const forward = mix(SIDE.ahead, CHASE.ahead);
    const corner = positionAt(track, facts.corner);
    const ahead = { x: p.x + Math.cos(p.heading) * forward, y: p.y + Math.sin(p.heading) * forward };
    const target = { x: ahead.x + (corner.x - ahead.x) * rise, y: ahead.y + (corner.y - ahead.y) * rise, z: 0 };
    const camera = orbit(target, mix(SIDE.distance, CHASE.distance) + (ABOVE.distance - CHASE.distance) * rise, heading, mix(SIDE.pitch, CHASE.pitch) + (ABOVE.pitch - CHASE.pitch) * rise, CHASE.fov);
    return { ...camera, shift: { x: 0, y: mix(SIDE.shift, CHASE.shift) + (ABOVE.shift - CHASE.shift) * rise } };
  };
  // Beside the car after the dive, swinging round behind it down the straight
  const swing = ramp(frame, context.from + DIVE * 0.6, braking.from + 30);
  const rise = ramp(frame, braking.from + (braking.to - braking.from) * 0.4, braking.to + 30);
  const camera = frame < context.from
    ? overview(frame)
    : blendCamera(overview(context.from), chase(car, swing, rise), ramp(frame, context.from, context.from + DIVE));

  const points = duel.telemetry.telemetry;
  const reading = {
    driver: driver.code, color, distance: car,
    speed: valueAt(points, car, p => p.speeds[lap]),
    gear: Math.round(valueAt(points, car, p => p.gears[lap])),
    throttle: valueAt(points, car, p => p.throttles[lap]),
    brake: valueAt(points, car, p => (p.brakes[lap] ? 1 : 0)) > 0.5,
  };
  const brakeAt = facts.pole.brakeAt ?? facts.pole.topAt;
  const braked = frame >= braking.from && car > brakeAt;
  const pastApex = ramp(frame, braking.from, braking.to) > 0 && car > facts.pole.minAt - 10;
  const hud = ramp(frame, context.from + DIVE - 10, context.from + DIVE + 14, EASE_OUT) * (1 - ramp(frame, braking.to - 16, braking.to + 6));
  const title = 1 - ramp(frame, context.from - 14, context.from + 2);

  return (
    <Stage series={series} episode={episode} fog={frame >= context.from} scene={
      <Track3D
        track={track} camera={camera} width={frame < context.from ? 34 : 14} ticks={frame < context.from ? undefined : 20}
        paints={braked ? [{ from: brakeAt, to: Math.min(car, facts.pole.minAt), color: INK.brake, glow: true }] : []}
        car={{ distance: car, color, trail: frame < context.from ? 520 : 110 }}
        labels={frame < context.from || frame >= braking.from ? [{ distance: facts.corner, text: 'VIRAGE 1', detail: pastApex ? `${Math.round(facts.pole.min)} KM/H MINI` : undefined, side: 'right' }] : []}
      />
    }>
      {title > 0 && (
        <Headline
          lines={headline(HOOK)} size={100}
          style={{ position: 'absolute', top: 290, left: SAFE.left, width: SAFE.right - SAFE.left, opacity: title }}
          reveal={i => ramp(frame, (hook.said[i]?.start ?? 0) - 4, (hook.said[i]?.start ?? 0) + 8, EASE_OUT)}
        />
      )}
      <VoiceCaption line={context} top={300} />
      <VoiceCaption line={braking} top={300} />
      {hud > 0 && (
        <div style={{ opacity: hud, transform: `translateY(${(1 - hud) * 60}px)` }}>
          <Hud reading={reading} top={1170} left={SAFE.left} width={SAFE.right - SAFE.left} />
        </div>
      )}
    </Stage>
  );
}
