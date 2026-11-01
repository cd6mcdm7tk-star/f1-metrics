import { useCurrentFrame } from 'remotion';
import type { Duel } from '../duel/data';
import type { CordeFacts, CordeStory } from './corde';
import { EASE_OUT, ramp } from './motion';
import SiteProof from './SiteProof';

// The proof on the site: the pole lap against the runner-up's through turn 1,
// on the site's own charts. The slowest point comes up first, nearly the same
// for both, then the exit, where the pole lap is quicker.

export default function ProofScene({ duel, facts, story, from, series, episode }: {
  duel: Duel; facts: CordeFacts; story: CordeStory; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  const [pole] = duel.drivers;
  const slowest = (facts.pole.minAt + facts.rival.minAt) / 2;
  return (
    <SiteProof
      duel={duel} window={[facts.corner - 220, facts.corner + 200]} until="throttle" line={beats.proof} from={from} series={series} episode={episode}
      marks={[
        { from: slowest - 10, to: slowest + 10, label: `${Math.round(facts.pole.min)} · ${Math.round(facts.rival.min)} KM/H`, shown: ramp(frame, cues.slowest, cues.slowest + 14, EASE_OUT), labelTop: 300 },
        { from: facts.exit[0], to: facts.exit[1], label: `${pole.code} +${facts.exitGain} KM/H`, shown: ramp(frame, cues.exitGain, cues.exitGain + 14, EASE_OUT) },
      ]}
    />
  );
}
