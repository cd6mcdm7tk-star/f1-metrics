import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { teamColor } from '../../../../frontend/src/utils/teamColors';
import type { Duel } from '../../duel/data';
import { SAFE, VIDEO } from '../../format';
import Headline, { headline } from '../../kit/Headline';
import Hud from '../../kit/Hud';
import { INK } from '../../kit/ink';
import { landing, lit } from '../../kit/motion';
import { blendCamera, fitCamera, orbit, type Camera3D } from '../../kit/projection';
import Stage from '../../kit/Stage';
import { positionAt, valueAt, type Track } from '../../kit/track';
import Track3D from '../../kit/Track3D';
import VoiceCaption from '../../kit/VoiceCaption';
import { DISPLAY, MONO } from '../../theme';
import { EASE_IN_OUT, EASE_OUT, lapClock, ramp } from '../motion';
import AirField from './AirField';
import { airDensity, MEXICO_ALTITUDE, type AltitudeFacts } from './data';
import type { AltitudeStory } from './story';

// The question over the whole circuit, a dive behind the pole car down the
// main straight at its real pace, then the climb: the camera rises until the
// circuit is a speck, the altimeter counts up to Mexico's altitude and the
// air thins around it.

/** The question, a line each; the first half comes in with "Monza", the rest with "Monaco" */
const HOOK = 'Aussi vite\nqu\'à *Monza*\navec des ailerons\nde *Monaco*';
const FIRST_HALF = 4;
/** The top speed is reached this long after the voice starts saying it (frames) */
const TOP_HELD = 24;
const OVERVIEW = { x: SAFE.left, y: 860, w: SAFE.right - SAFE.left, h: 580 };
/** How long the camera takes to dive behind the car (frames) */
const DIVE = 54;
const CHASE = { distance: 300, pitch: 0.5, ahead: 90, fov: 50, shift: -330 };
/** Where the climb ends: high above the circuit, looking down */
const SKY = { distance: 15000, pitch: 1.45, fov: 40 };
const SCREEN = { x: 0, y: 0, w: VIDEO.width, h: VIDEO.height };

export default function FlyScene({ duel, track, facts, story, series, episode }: {
  duel: Duel; track: Track; facts: AltitudeFacts; story: AltitudeStory; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { hook, context, altitude } = story.beats;
  const { cues } = story;
  const clock = useMemo(() => lapClock(duel), [duel]);
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const lap = duel.order[0];
  const driver = duel.drivers[0];
  const color = teamColor(duel.teams[driver.code] ?? '');

  // The car: a whole lap under the question, then from the line down the
  // straight, at top speed while the voice says it, braking as the climb begins
  const lapTime = duel.time[0][duel.time[0].length - 1];
  const linear = (t: number) => t;
  const car = frame < context.from
    ? clock.distanceAt(lapTime * ramp(frame, hook.from, context.from - 6, linear))
    : frame < cues.top + TOP_HELD
      ? clock.distanceAt(clock.timeAt(facts.topAt) * ramp(frame, context.from, cues.top + TOP_HELD, linear))
      : clock.distanceAt(clock.timeAt(facts.topAt) + (clock.timeAt(facts.corner) - clock.timeAt(facts.topAt)) * ramp(frame, cues.top + TOP_HELD, altitude.from + 90, linear));

  const overview = (f: number): Camera3D => fitCamera(ground, 0.9 + 0.2 * ramp(f, 0, context.from), 0.5, 40, OVERVIEW, VIDEO);
  const chase = (distance: number): Camera3D => {
    const p = positionAt(track, distance, 80);
    const ahead = { x: p.x + Math.cos(p.heading) * CHASE.ahead, y: p.y + Math.sin(p.heading) * CHASE.ahead, z: 0 };
    return { ...orbit(ahead, CHASE.distance, p.heading, CHASE.pitch, CHASE.fov), shift: { x: 0, y: CHASE.shift } };
  };
  const climbFrom = altitude.from - 10;
  const climb = ramp(frame, climbFrom, cues.metres + 20, EASE_IN_OUT);
  // The track is centred on the origin: the climb ends above its middle
  const sky = (): Camera3D => {
    const heading = positionAt(track, facts.brakeAt, 80).heading;
    return { ...orbit({ x: 0, y: 0, z: 0 }, SKY.distance, heading, SKY.pitch, SKY.fov), shift: { x: 0, y: -120 } };
  };
  const camera = frame < context.from
    ? overview(frame)
    : frame < climbFrom
      ? blendCamera(overview(context.from), chase(car), ramp(frame, context.from, context.from + DIVE, EASE_OUT))
      : blendCamera(chase(car), sky(), climb);

  const points = duel.telemetry.telemetry;
  const reading = {
    driver: driver.code, color, distance: car,
    speed: valueAt(points, car, p => p.speeds[lap]),
    gear: Math.round(valueAt(points, car, p => p.gears[lap])),
    throttle: valueAt(points, car, p => p.throttles[lap]),
    brake: valueAt(points, car, p => (p.brakes[lap] ? 1 : 0)) > 0.5,
  };
  const hud = ramp(frame, context.from + DIVE - 10, context.from + DIVE + 14, EASE_OUT) * (1 - ramp(frame, climbFrom, climbFrom + 20));
  const title = 1 - ramp(frame, context.from - 14, context.from + 2);
  const reveal = (i: number) => lit(i < FIRST_HALF
    ? ramp(frame, hook.from + ((cues.monza - hook.from) * i) / FIRST_HALF - 4, hook.from + ((cues.monza - hook.from) * i) / FIRST_HALF + 10, EASE_OUT)
    : ramp(frame, cues.monaco - 30 + (i - FIRST_HALF) * 6, cues.monaco - 16 + (i - FIRST_HALF) * 6, EASE_OUT));

  // The climb's readouts: the altimeter, then the air thinning as the voice says it
  const metres = Math.round(MEXICO_ALTITUDE * ramp(frame, cues.climb, cues.metres + 10, EASE_IN_OUT));
  const thin = ramp(frame, cues.thin - 10, cues.thin + 30, EASE_IN_OUT);
  const air = 1 - (1 - airDensity(MEXICO_ALTITUDE)) * thin;
  const readouts = ramp(frame, climbFrom + 10, climbFrom + 30, EASE_OUT);

  return (
    <Stage series={series} episode={episode} fog={frame >= context.from} scene={
      <>
        <Track3D
          track={track} camera={camera} width={frame < context.from ? 34 : frame < climbFrom ? 14 : 14 + 60 * climb} ticks={frame >= context.from && frame < climbFrom ? 20 : undefined}
          car={{ distance: car, color, trail: frame < context.from ? 520 : 110 }}
          labels={frame >= context.from && frame < climbFrom ? [{ distance: facts.corner, text: 'VIRAGE 1', side: 'right' }] : []}
        />
        {readouts > 0 && <AirField box={SCREEN} density={air} flow={(frame - climbFrom) * 9} opacity={readouts} />}
      </>
    }>
      {title > 0 && (
        <Headline
          lines={headline(HOOK)} size={104} reveal={reveal}
          style={{ position: 'absolute', top: 290, left: SAFE.left, width: SAFE.right - SAFE.left, opacity: title, transform: `scale(${landing(frame)})`, transformOrigin: 'left top' }}
        />
      )}
      <VoiceCaption line={context} top={300} />
      <VoiceCaption line={altitude} top={300} />
      {hud > 0 && (
        <div style={{ opacity: hud, transform: `translateY(${(1 - hud) * 60}px)` }}>
          <Hud reading={reading} top={1170} left={SAFE.left} width={SAFE.right - SAFE.left} />
        </div>
      )}
      {readouts > 0 && (
        <div style={{ position: 'absolute', top: 1010, left: SAFE.left, width: SAFE.right - SAFE.left, opacity: readouts, transform: `translateY(${(1 - readouts) * 40}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 24, letterSpacing: '0.2em', color: INK.textSub }}>ALTITUDE · MEXICO</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 150, lineHeight: 1, color: INK.text, fontVariantNumeric: 'tabular-nums' }}>
            {metres.toLocaleString('fr-FR')} M
          </div>
          <div style={{ marginTop: 34, display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 24, letterSpacing: '0.2em', color: INK.textSub }}>
            <span>DENSITÉ DE L'AIR</span>
            <span style={{ color: thin > 0 ? INK.brake : INK.text }}>{Math.round(air * 100)} %</span>
          </div>
          <div style={{ marginTop: 12, height: 14, background: 'rgba(242,230,216,0.10)' }}>
            <div style={{ width: `${air * 100}%`, height: '100%', background: thin > 0 ? INK.brake : INK.text }} />
          </div>
        </div>
      )}
    </Stage>
  );
}
