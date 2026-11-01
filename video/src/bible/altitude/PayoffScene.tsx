import { useCurrentFrame } from 'remotion';
import { INK } from '../../kit/ink';
import { orbit } from '../../kit/projection';
import Slam from '../../kit/Slam';
import Stage from '../../kit/Stage';
import type { Track } from '../../kit/track';
import Track3D from '../../kit/Track3D';
import VoiceCaption from '../../kit/VoiceCaption';
import { MONO } from '../../theme';
import { EASE_OUT, ramp } from '../motion';
import type { AltitudeFacts } from './data';
import type { AltitudeStory } from './story';

// The verdict over the circuit turning in the dark: Monaco's wings, Monza's
// speed, then turn 1's braking zone lit red for the weekend ahead.

const kicker = { position: 'absolute' as const, left: 0, right: 0, textAlign: 'center' as const, fontFamily: MONO, fontSize: 26, letterSpacing: '0.24em', color: INK.textSub };

export default function PayoffScene({ track, facts, story, from, series, episode }: {
  track: Track; facts: AltitudeFacts; story: AltitudeStory; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const camera = orbit({ x: 0, y: 0, z: 0 }, Math.max(track.half.x, track.half.y) * 3, 0.5 + (frame - from) * 0.002, 0.95, 40);
  const brakes = ramp(frame, cues.suffer - 6, cues.suffer + 14, EASE_OUT);
  return (
    <Stage series={series} episode={episode} scene={
      <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}>
        <Track3D track={track} camera={camera} width={22} paints={brakes > 0 ? [{ from: facts.brakeAt, to: facts.corner, color: INK.brake, glow: true }] : []} />
      </div>
    }>
      <div style={{ ...kicker, top: 470, opacity: ramp(frame, cues.wingsOf - 12, cues.wingsOf + 4, EASE_OUT) }}>LES AILERONS DE</div>
      <Slam at={cues.wingsOf} frame={frame} top={520} size={190}>MONACO</Slam>
      <div style={{ ...kicker, top: 780, opacity: ramp(frame, cues.speedOf - 12, cues.speedOf + 4, EASE_OUT) }}>LA VITESSE DE</div>
      <Slam at={cues.speedOf} frame={frame} top={830} size={190}>MONZA</Slam>
      <VoiceCaption line={beats.payoff} top={1180} />
    </Stage>
  );
}
