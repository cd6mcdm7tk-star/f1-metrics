import { useMemo, type ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import type { Lang } from '../i18n';
import { INK } from '../kit/ink';
import { buildTrack } from '../kit/track';
import MascotBubble from '../mascot/MascotBubble';
import Swipe from '../Swipe';
import { VOICE_PACE, type Voiceover } from '../voice';
import { fetchPoleSession, type PoleSession } from './data';
import { poleFacts } from './facts';
import { DetailsScene, GridScene, HookScene, type SceneProps } from './GridScenes';
import LapScene from './LapScene';
import PoleProof from './PoleProof';
import SectorsScene from './SectorsScene';
import { buildPole, type PoleNarration, type PoleSceneKind } from './story';
import VerdictScene from './VerdictScene';

const SERIES = 'LES QUALIFS';

export interface PoleRecapProps extends Record<string, unknown> {
  lang: Lang;
  query: { year: number; gp: number };
  /** Filled by the render script, or by calculateMetadata from the API */
  session: PoleSession | null;
  narration: PoleNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculatePoleMetadata: CalculateMetadataFunction<PoleRecapProps> = async ({ props }) => {
  const session = props.session ?? (await fetchPoleSession(props.query));
  return { props: { ...props, session }, durationInFrames: buildPole(props.narration, session.drivers, props.lang, props.voiceover).frames };
};

const SCENES: Record<PoleSceneKind, (props: SceneProps) => ReactNode> = {
  hook: HookScene, grid: GridScene, lap: LapScene, proof: PoleProof, details: DetailsScene, sectors: SectorsScene, verdict: VerdictScene,
};

/** Saturday's video: qualifying through its top six */
export default function PoleRecap({ lang, session, narration, voiceover }: PoleRecapProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => session && buildPole(narration, session.drivers, lang, voiceover), [session, narration, lang, voiceover]);
  const track = useMemo(() => session && buildTrack(session.telemetry), [session]);
  const facts = useMemo(() => session && poleFacts(session), [session]);
  if (!session || !story || !track || !facts) return null;

  const scene = story.scenes.find(s => frame >= s.from && frame < s.to) ?? story.scenes[story.scenes.length - 1];
  const Scene = SCENES[scene.kind];
  const proof = story.scenes.find(s => s.kind === 'proof')!;
  const verdict = story.scenes.find(s => s.kind === 'verdict')!;

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      <Scene session={session} facts={facts} story={story} track={track} from={scene.from} series={SERIES} episode={`${session.location.toUpperCase()} ${session.year}`} />
      {/* The mascot comes in for the proof, then for the closing question */}
      <MascotBubble lines={[story.beats.proof]} from={proof.from + 12} to={proof.to} at={{ x: 770, y: 1330, size: 170 }} />
      <MascotBubble lines={[story.beats.verdict]} from={verdict.from + 24} to={story.frames} at={{ x: 390, y: 960, size: 300 }} />
      {story.scenes.slice(1).map(s => <Swipe key={s.from} at={s.from} />)}
      {voiceover && story.voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} playbackRate={VOICE_PACE} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
