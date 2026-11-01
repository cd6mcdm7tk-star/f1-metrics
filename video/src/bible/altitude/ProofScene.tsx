import { useCurrentFrame } from 'remotion';
import type { Duel } from '../../duel/data';
import { EASE_OUT, ramp } from '../motion';
import SiteProof from '../SiteProof';
import type { AltitudeFacts } from './data';
import type { AltitudeStory } from './story';

// The proof on the site: the end of Mexico's straight on the pole lap and the
// runner-up's, both at the same top speed, then the braking for turn 1.

/** Metres of straight shown before the top speed, and of turn 1 after its marker */
const BEFORE = 480;
const AFTER = 110;
/** The flat-out stretch marked before the top speed, so its label clears turn 1's (m) */
const PLATEAU = 220;

export default function ProofScene({ duel, facts, story, from, series, episode }: {
  duel: Duel; facts: AltitudeFacts; story: AltitudeStory; from: number; series: string; episode: string;
}) {
  const frame = useCurrentFrame();
  const { cues, beats } = story;
  return (
    <SiteProof
      duel={duel} window={[facts.topAt - BEFORE, facts.corner + AFTER]} until="throttle" line={beats.proof} from={from} series={series} episode={episode}
      marks={[
        { from: facts.topAt - PLATEAU, to: facts.topAt, label: `${Math.round(facts.top[0])} · ${Math.round(facts.top[1])} KM/H`, shown: ramp(frame, cues.topMark, cues.topMark + 14, EASE_OUT), labelTop: 40 },
        { from: facts.brakeAt, to: facts.corner, label: 'VIRAGE 1', shown: ramp(frame, cues.turnOne - 6, cues.turnOne + 10, EASE_OUT) },
      ]}
    />
  );
}
