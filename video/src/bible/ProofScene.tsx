import { useCurrentFrame } from 'remotion';
import type { Duel } from '../duel/data';
import { SAFE } from '../format';
import Headline, { headline } from '../kit/Headline';
import { INK } from '../kit/ink';
import ProofCard from '../kit/ProofCard';
import Stage from '../kit/Stage';
import VoiceCaption from '../kit/VoiceCaption';
import { MONO } from '../theme';
import type { CordeFacts, CordeStory } from './corde';
import { EASE_OUT, ramp } from './motion';

// The proof on the site: the pole lap against the runner-up's through turn 1,
// on the site's own charts. The slowest point comes up first, nearly the same
// for both, then the exit, where the pole lap is quicker.

export default function ProofScene({ duel, facts, story, from, series, episode }: {
  duel: Duel; facts: CordeFacts; story: CordeStory; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const [pole, rival] = duel.drivers;
  const card = ramp(frame, from + 6, from + 30, EASE_OUT);
  const slowest = (facts.pole.minAt + facts.rival.minAt) / 2;

  return (
    <Stage series={series} episode={episode}>
      <Headline lines={headline('La *preuve*')} size={110} reveal={() => ramp(frame, from, from + 18, EASE_OUT)} style={{ position: 'absolute', top: 270, left: SAFE.left }} />
      <div style={{ position: 'absolute', top: 392, left: SAFE.left, fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: INK.textSub, textTransform: 'uppercase' }}>
        Télémétrie réelle · {duel.location} {duel.year} · Qualifs · {pole.code} – {rival.code}
      </div>
      <div style={{ opacity: card, transform: `translateY(${(1 - card) * 120}px) scale(${0.94 + 0.06 * card})` }}>
        <ProofCard
          duel={duel} window={[facts.corner - 220, facts.corner + 200]} top={440} left={SAFE.left} width={SAFE.right - SAFE.left} until="throttle"
          marks={[
            { from: slowest - 10, to: slowest + 10, label: `${Math.round(facts.pole.min)} · ${Math.round(facts.rival.min)} KM/H`, shown: ramp(frame, cues.slowest, cues.slowest + 14, EASE_OUT), labelTop: 300 },
            { from: facts.exit[0], to: facts.exit[1], label: `${pole.code} +${facts.exitGain} KM/H`, shown: ramp(frame, cues.exitGain, cues.exitGain + 14, EASE_OUT) },
          ]}
        />
      </div>
      <VoiceCaption line={beats.proof} top={1120} />
    </Stage>
  );
}
