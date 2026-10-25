import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import { EASE_OUT, ramp } from '../bible/motion';
import { interpolate } from '../duel/data';
import { SAFE, VIDEO } from '../format';
import DuelHud, { type DuelReading } from '../kit/DuelHud';
import { blendCamera, fitCamera, orbit, type Camera3D } from '../kit/projection';
import Stage from '../kit/Stage';
import { positionAt, stretch, valueAt } from '../kit/track';
import Track3D, { type Paint } from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import type { SceneProps } from './GridScenes';

// The pole lap against the runner-up's, both cars on the same clock so the
// gap on screen is the real one: a fast run round the circuit lighting up
// where pole was won, a dive behind the pole car through the corner it gained
// most in, its exit lit, then up over the last sector the runner-up won back.

const OVERVIEW = { x: 24, y: 560, w: VIDEO.width - 48, h: 900 };
const DIVE = 50;
const CHASE = { distance: 230, pitch: 0.5, ahead: 40, fov: 50, shift: -300 };
/** The corner shown up close: from before its braking to its exit (m) */
const BEFORE = 160, AFTER = 130;
const CAMERA_SPAN = 70;
const linear = (t: number) => t;

/** "VIRAGE 15", from a corner label such as "T15" */
const cornerName = (label: string) => (label.startsWith('T') ? `VIRAGE ${label.slice(1)}` : label);

export default function LapScene({ session, facts, story, track, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const { lead, gain, loss } = story.beats;
  const { duel } = session;
  const [pole, rival] = session.drivers;
  const ground = useMemo(() => track.points.map(p => ({ ...p, z: 0 })), [track]);
  const lastSector = useMemo(() => stretch(track, facts.loss.from - 250, track.length).map(p => ({ ...p, z: 0 })), [track, facts.loss.from]);
  const timeAt = (lap: 0 | 1, d: number) => interpolate(duel.distance, duel.time[lap], d);
  const distanceAt = (lap: 0 | 1, t: number) => interpolate(duel.time[lap], duel.distance, t);

  // One clock for both cars: round to the corner, through it, then on to the line
  const into = facts.gain.apexAt - BEFORE, out = facts.gain.apexAt + AFTER;
  const lapTime = duel.time[0][duel.time[0].length - 1];
  const clock = frame < gain.from
    ? timeAt(0, into) * ramp(frame, lead.from, gain.from, linear)
    : frame < loss.from
      ? timeAt(0, into) + (timeAt(0, out) - timeAt(0, into)) * ramp(frame, gain.from, loss.from, linear)
      : timeAt(0, out) + (lapTime - timeAt(0, out)) * ramp(frame, loss.from, loss.to + 20, linear);
  const at: [number, number] = [distanceAt(0, clock), distanceAt(1, clock)];

  const overview = (f: number) => fitCamera(ground, 0.95 + 0.12 * ramp(f, lead.from, gain.from), 0.55, 40, OVERVIEW, VIDEO);
  const chase = (): Camera3D => {
    const p = positionAt(track, at[0], CAMERA_SPAN);
    const target = { x: p.x + Math.cos(p.heading) * CHASE.ahead, y: p.y + Math.sin(p.heading) * CHASE.ahead, z: 0 };
    return { ...orbit(target, CHASE.distance, p.heading, CHASE.pitch, CHASE.fov), shift: { x: 0, y: CHASE.shift } };
  };
  const above = fitCamera(lastSector, 0.95, 0.9, 40, { x: 40, y: 560, w: VIDEO.width - 80, h: 860 }, VIDEO);
  const camera = frame < gain.from
    ? overview(frame)
    : frame < loss.from
      ? blendCamera(overview(gain.from), chase(), ramp(frame, gain.from, gain.from + DIVE))
      : blendCamera(chase(), above, ramp(frame, loss.from, loss.from + 60));

  const won = [story.cues.firstCorner, story.cues.esses, story.cues.stadium];
  const exit = facts.gain.findings.find(f => f.kind === 'exitSpeed');
  const paints: Paint[] = frame < gain.from
    ? facts.won.slice(0, won.length).flatMap((s, i) => (frame >= won[i] ? [{ from: s.from, to: s.to, color: pole.color, glow: true }] : []))
    : frame < loss.from
      ? exit?.kind === 'exitSpeed' && frame >= story.cues.exit ? [{ from: exit.from, to: exit.to, color: pole.color, glow: true }] : []
      : frame >= story.cues.lastCorner ? [{ from: facts.loss.from, to: facts.loss.to, color: rival.color, glow: true }] : [];
  const close = frame >= gain.from && frame < loss.from;
  const label = frame < gain.from ? null : frame < loss.from ? facts.gain : facts.loss;

  // The duel's own laps: its distances are the ones the cars are placed on
  const points = duel.telemetry.telemetry;
  const reading = (lap: 0 | 1): DuelReading => {
    const i = duel.order[lap], d = at[lap], driver = session.drivers[lap];
    return {
      code: driver.code, color: driver.color,
      speed: valueAt(points, d, p => p.speeds[i]),
      gear: Math.round(valueAt(points, d, p => p.gears[i])),
      throttle: valueAt(points, d, p => p.throttles[i]),
      brake: valueAt(points, d, p => (p.brakes[i] ? 1 : 0)) > 0.5,
    };
  };
  const gap = timeAt(1, at[0]) - clock;
  const hud = ramp(frame, gain.from + DIVE - 10, gain.from + DIVE + 12, EASE_OUT) * (1 - ramp(frame, loss.from, loss.from + 16));

  return (
    <Stage series={series} episode={episode} fog={close} scene={
      <Track3D
        track={track} camera={camera} width={close ? 14 : 30} ticks={close ? 20 : undefined} paints={paints}
        labels={label ? [{ distance: label.apexAt, text: cornerName(label.label), side: 'right' }] : []}
        cars={[
          { distance: at[1], color: rival.color, trail: close ? 60 : 300, tag: close ? rival.code : undefined },
          { distance: at[0], color: pole.color, trail: close ? 80 : 400, tag: close ? pole.code : undefined },
        ]}
      />
    }>
      {[lead, gain, loss].map(line => <VoiceCaption key={line.from} line={line} top={300} />)}
      {hud > 0 && (
        <div style={{ opacity: hud, transform: `translateY(${(1 - hud) * 60}px)` }}>
          <DuelHud readings={[reading(0), reading(1)]} gap={`${pole.code} ${gap >= 0 ? '+' : '−'}${Math.abs(gap).toFixed(2).replace('.', ',')} s`} top={1150} left={SAFE.left} width={SAFE.right - SAFE.left} />
        </div>
      )}
    </Stage>
  );
}
