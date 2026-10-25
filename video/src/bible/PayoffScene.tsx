import { useMemo } from 'react';
import { useCurrentFrame } from 'remotion';
import type { Duel } from '../duel/data';
import { SAFE } from '../format';
import { INK } from '../kit/ink';
import { orbit } from '../kit/projection';
import Stage from '../kit/Stage';
import { positionAt, type Track } from '../kit/track';
import Track3D from '../kit/Track3D';
import VoiceCaption from '../kit/VoiceCaption';
import { DISPLAY, MONO } from '../theme';
import type { CordeFacts, CordeStory } from './corde';
import { EASE_OUT, ramp } from './motion';

// What the exit was worth: the time gained through turn 1, landing hard, then
// the pole's margin, over the corner turning slowly in the dark.

const seconds = (s: number) => `${s.toFixed(3).replace('.', ',')} s`;

/** A figure landing: bigger and transparent to its size, with a short shake */
function Slam({ at, frame, children, top, size }: { at: number; frame: number; children: string; top: number; size: number }) {
  const t = ramp(frame, at - 3, at + 10, EASE_OUT);
  if (t <= 0) return null;
  const shake = frame - at < 10 ? Math.sin((frame - at) * 2.4) * (10 - (frame - at)) * 1.4 : 0;
  return (
    <div style={{
      position: 'absolute', top, left: 0, right: 0, textAlign: 'center', opacity: t,
      transform: `translateX(${shake}px) scale(${1.5 - 0.5 * t})`,
      fontFamily: DISPLAY, fontWeight: 700, fontSize: size, lineHeight: 1, color: INK.text, letterSpacing: '0.01em', fontVariantNumeric: 'tabular-nums',
    }}>
      {children}
    </div>
  );
}

const kicker = { position: 'absolute' as const, left: 0, right: 0, textAlign: 'center' as const, fontFamily: MONO, fontSize: 26, letterSpacing: '0.24em', color: INK.textSub };

export default function PayoffScene({ duel, track, facts, story, from, series, episode }: {
  duel: Duel; track: Track; facts: CordeFacts; story: CordeStory; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const corner = useMemo(() => positionAt(track, facts.corner), [track, facts.corner]);
  const camera = orbit({ ...corner, z: 0 }, 900, 0.6 + (frame - from) * 0.002, 0.9, 40);
  const [pole, rival] = duel.drivers;
  const gainKicker = ramp(frame, cues.gain - 10, cues.gain + 6, EASE_OUT);
  const poleKicker = ramp(frame, cues.pole - 10, cues.pole + 6, EASE_OUT);

  return (
    <Stage series={series} episode={episode} scene={
      <div style={{ position: 'absolute', inset: 0, opacity: 0.35 }}>
        <Track3D track={track} camera={camera} width={14} paints={[{ from: facts.exit[0], to: facts.exit[1], color: INK.text, glow: true }]} />
      </div>
    }>
      <div style={{ ...kicker, top: 470, opacity: gainKicker }}>VIRAGE 1 · {pole.name.toUpperCase()} SUR {rival.name.toUpperCase()}</div>
      <Slam at={cues.gain} frame={frame} top={530} size={230}>{`+${seconds(facts.cornerGap)}`}</Slam>
      <div style={{ position: 'absolute', top: 820, left: SAFE.left + 200, right: 1080 - SAFE.right + 200, height: 2, background: INK.textGhost, opacity: poleKicker }} />
      <div style={{ ...kicker, top: 870, opacity: poleKicker }}>ÉCART DE LA POLE</div>
      <Slam at={cues.pole} frame={frame} top={920} size={130}>{seconds(facts.poleGap)}</Slam>
      <VoiceCaption line={beats.payoff} top={1180} />
    </Stage>
  );
}
