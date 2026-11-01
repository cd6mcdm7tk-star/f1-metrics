import { useCurrentFrame } from 'remotion';
import type { Duel } from '../duel/data';
import { SAFE } from '../format';
import Headline, { headline } from '../kit/Headline';
import { INK } from '../kit/ink';
import ProofCard, { type ProofMark } from '../kit/ProofCard';
import type { RowName } from '../site/geometry';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import { MONO } from '../theme';
import type { VoiceLine } from '../voice';
import { EASE_OUT, ramp } from './motion';

/** An episode's proof on the site: its own telemetry charts on a stretch of
 * the lap, the episode's marks coming in as the voice names them */
export default function SiteProof({ duel, window, until, marks, line, from, series, episode }: {
  duel: Duel; window: [number, number]; until: RowName; marks: ProofMark[]; line: VoiceLine; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const [pole, rival] = duel.drivers;
  const card = ramp(frame, from + 6, from + 30, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *preuve*')} size={110} reveal={() => ramp(frame, from, from + 18, EASE_OUT)} style={{ position: 'absolute', top: 270, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 392, left: SAFE.left, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub, textTransform: 'uppercase' }}>
        Télémétrie réelle · {duel.location} {duel.year} · Qualifs · {pole.code} – {rival.code}
      </div>
      <div style={{ opacity: card, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})` }}>
        <ProofCard duel={duel} window={window} top={440} left={SAFE.left} width={SAFE.right - SAFE.left} until={until} marks={marks} />
      </div>
      <VoiceCaption line={line} top={1120} />
    </Stage>
  );
}
