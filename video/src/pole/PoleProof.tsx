import { useCurrentFrame } from 'remotion';
import { EASE_OUT, ramp } from '../kit/motion';
import { SAFE } from '../format';
import Headline, { headline } from '../kit/Headline';
import { INK } from '../kit/ink';
import ProofCard from '../kit/ProofCard';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import { MONO } from '../theme';
import type { SceneProps } from './GridScenes';

/** The corner pole gained most in, on the site's own charts: where it was faster lit up */
export default function PoleProof({ session, facts, story, from, series, episode }: SceneProps) {
  const frame = useCurrentFrame();
  const { duel } = session;
  const [pole, rival] = session.drivers;
  const faster = facts.gainStretch;
  const card = ramp(frame, from + 6, from + 30, EASE_OUT);
  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *preuve*')} size={110} reveal={() => ramp(frame, from, from + 18, EASE_OUT)} style={{ position: 'absolute', top: 270, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 392, left: SAFE.left, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub, textTransform: 'uppercase' }}>
        Télémétrie réelle · {session.location} {session.year} · Qualifs · {pole.code} – {rival.code}
      </div>
      <div style={{ opacity: card, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})` }}>
        <ProofCard
          duel={duel} window={[facts.gain.apexAt - 230, facts.gain.apexAt + 170]} top={440} left={SAFE.left} width={SAFE.right - SAFE.left} until="throttle"
          marks={faster ? [{ from: faster.from, to: faster.to, label: `${pole.code} +${faster.by} KM/H`, shown: ramp(frame, story.cues.proofMark, story.cues.proofMark + 14, EASE_OUT) }] : []}
        />
      </div>
      <VoiceCaption line={story.beats.proof} top={1120} />
    </Stage>
  );
}
