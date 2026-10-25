import { useMemo } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fetchDuel } from '../api';
import type { Duel } from '../duel/data';
import type { Lang } from '../i18n';
import { INK } from '../kit/ink';
import { buildTrack } from '../kit/track';
import MascotBubble from '../mascot/MascotBubble';
import Swipe from '../Swipe';
import { VOICE_PACE, type Voiceover } from '../voice';
import { buildCorde, cordeFacts, CORDE_QUERY, type CordeNarration } from './corde';
import EndScene from './EndScene';
import FlyScene from './FlyScene';
import PayoffScene from './PayoffScene';
import ProofScene from './ProofScene';
import SchemaScene from './SchemaScene';
import { ramp } from './motion';

const SERIES = 'LA BIBLE F1';
const EPISODE = 'ÉP. 01';
/** The flight dissolves into the schematic over this many frames */
const DISSOLVE = 24;

export interface CordeEpisodeProps extends Record<string, unknown> {
  lang: Lang;
  /** Filled by calculateMetadata from the API */
  duel: Duel | null;
  narration: CordeNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculateCordeMetadata: CalculateMetadataFunction<CordeEpisodeProps> = async ({ props }) => ({
  props: { ...props, duel: props.duel ?? (await fetchDuel(CORDE_QUERY)) },
  durationInFrames: buildCorde(props.narration, props.lang, props.voiceover).frames,
});

/** La Bible F1, episode 1: why drivers never take the middle of the track */
export default function CordeEpisode({ lang, duel, narration, voiceover }: CordeEpisodeProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => buildCorde(narration, lang, voiceover), [narration, lang, voiceover]);
  const track = useMemo(() => duel && buildTrack(duel.telemetry), [duel]);
  const facts = useMemo(() => duel && cordeFacts(duel), [duel]);
  if (!duel || !track || !facts) return null;

  const [, schema, proof, payoff, end] = story.scenes;
  const dissolve = ramp(frame, schema.from - DISSOLVE / 2, schema.from + DISSOLVE / 2);
  const within = (scene: { from: number; to: number }) => frame >= scene.from && frame < scene.to;
  const brand = { series: SERIES, episode: EPISODE };

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      {dissolve < 1 && <AbsoluteFill><FlyScene duel={duel} track={track} facts={facts} story={story} {...brand} /></AbsoluteFill>}
      {dissolve > 0 && frame < proof.from && <AbsoluteFill style={{ opacity: dissolve }}><SchemaScene story={story} from={schema.from} {...brand} /></AbsoluteFill>}
      {within(proof) && <ProofScene duel={duel} facts={facts} story={story} from={proof.from} {...brand} />}
      {within(payoff) && <PayoffScene duel={duel} track={track} facts={facts} story={story} from={payoff.from} {...brand} />}
      {within(end) && <EndScene next={narration.next} line={story.beats.end} from={end.from} {...brand} />}
      {/* The mascot comes in for the proof and the verdict, then says goodbye */}
      <MascotBubble lines={[story.beats.proof, story.beats.payoff]} from={proof.from + 12} to={payoff.to} at={{ x: 770, y: 1330, size: 170 }} />
      <MascotBubble lines={[story.beats.end]} from={end.from + 20} to={story.frames} at={{ x: 390, y: 960, size: 300 }} />
      {[proof.from, payoff.from, end.from].map(at => <Swipe key={at} at={at} />)}
      {voiceover && story.voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} playbackRate={VOICE_PACE} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
