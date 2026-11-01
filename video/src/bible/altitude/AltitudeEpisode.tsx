import { useMemo } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fetchDuel } from '../../api';
import type { Duel } from '../../duel/data';
import type { Lang } from '../../i18n';
import Camera from '../../kit/Camera';
import { INK } from '../../kit/ink';
import { buildTrack } from '../../kit/track';
import MascotBubble from '../../mascot/MascotBubble';
import Swipe from '../../Swipe';
import type { Voiceover } from '../../voice';
import EndScene from '../EndScene';
import { ramp } from '../motion';
import AirScene from './AirScene';
import { altitudeFacts, ALTITUDE_QUERY } from './data';
import FlyScene from './FlyScene';
import PayoffScene from './PayoffScene';
import ProofScene from './ProofScene';
import SpeedsScene from './SpeedsScene';
import { buildAltitude, type AltitudeNarration } from './story';

const SERIES = 'LA BIBLE F1';
const EPISODE = 'ÉP. 02';
/** The climb dissolves into the car's schematic over this many frames */
const DISSOLVE = 24;

export interface AltitudeEpisodeProps extends Record<string, unknown> {
  lang: Lang;
  /** Filled by calculateMetadata from the API */
  duel: Duel | null;
  narration: AltitudeNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculateAltitudeMetadata: CalculateMetadataFunction<AltitudeEpisodeProps> = async ({ props }) => ({
  props: { ...props, duel: props.duel ?? (await fetchDuel(ALTITUDE_QUERY)) },
  durationInFrames: buildAltitude(props.narration, props.lang, props.voiceover).frames,
});

/** La Bible F1, episode 2: why cars are as fast at Mexico as at Monza with Monaco's wings */
export default function AltitudeEpisode({ lang, duel, narration, voiceover }: AltitudeEpisodeProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => buildAltitude(narration, lang, voiceover), [narration, lang, voiceover]);
  const track = useMemo(() => duel && buildTrack(duel.telemetry), [duel]);
  const facts = useMemo(() => duel && altitudeFacts(duel), [duel]);
  if (!duel || !track || !facts) return null;

  const [, air, speeds, proof, payoff, end] = story.scenes;
  const dissolve = ramp(frame, air.from - DISSOLVE / 2, air.from + DISSOLVE / 2);
  const within = (scene: { from: number; to: number }) => frame >= scene.from && frame < scene.to;
  const brand = { series: SERIES, episode: EPISODE };

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      <Camera timeline={story}>
        {dissolve < 1 && <AbsoluteFill><FlyScene duel={duel} track={track} facts={facts} story={story} {...brand} /></AbsoluteFill>}
        {dissolve > 0 && frame < speeds.from && <AbsoluteFill style={{ opacity: dissolve }}><AirScene story={story} from={air.from} {...brand} /></AbsoluteFill>}
        {within(speeds) && <SpeedsScene story={story} from={speeds.from} {...brand} />}
        {within(proof) && <ProofScene duel={duel} facts={facts} story={story} from={proof.from} {...brand} />}
        {within(payoff) && <PayoffScene track={track} facts={facts} story={story} from={payoff.from} {...brand} />}
        {within(end) && <EndScene next={narration.next} line={story.beats.end} from={end.from} {...brand} />}
      </Camera>
      {/* The mascot comes in for the proof and the verdict, then says goodbye */}
      <MascotBubble lines={[story.beats.proof, story.beats.payoff]} from={proof.from + 12} to={payoff.to} at={{ x: 770, y: 1330, size: 170 }} />
      <MascotBubble lines={[story.beats.end]} from={end.from + 20} to={story.frames} at={{ x: 390, y: 960, size: 300 }} />
      {[speeds.from, proof.from, payoff.from, end.from].map(at => <Swipe key={at} at={at} />)}
      {voiceover && story.voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
