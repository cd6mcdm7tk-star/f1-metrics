import { useMemo, type ReactNode } from 'react';
import { useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import type { TelemetryDataMulti } from '../../../../frontend/src/types/telemetry';
import { fetchDuel } from '../../api';
import type { Lang } from '../../i18n';
import Camera from '../../kit/Camera';
import { buildTrack } from '../../kit/track';
import type { Voiceover } from '../../voice';
import { SERIES } from '../common';
import MoneyShell from '../MoneyShell';
import { MCLAREN } from './data';
import {
  BonusScene, EndScene, HookScene, PayoutScene, PointsScene, ProofScene, RescueScene, RevenueScene, SeasonScene, type McLarenSceneProps,
} from './scenes';
import { buildMcLaren, type McLarenBeat, type McLarenNarration } from './story';

export interface McLarenEpisodeProps extends Record<string, unknown> {
  lang: Lang;
  /** The 2025 finale's circuit, filled by calculateMetadata from the API */
  circuit: TelemetryDataMulti | null;
  narration: McLarenNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculateMcLarenMetadata: CalculateMetadataFunction<McLarenEpisodeProps> = async ({ props }) => ({
  props: { ...props, circuit: props.circuit ?? (await fetchDuel(MCLAREN.base)).telemetry },
  durationInFrames: buildMcLaren(props.narration, props.lang, props.voiceover).frames,
});

const SCENES: Record<McLarenBeat, (props: McLarenSceneProps) => ReactNode> = {
  hook: HookScene, rescue: RescueScene, revenue: RevenueScene, bonuses: BonusScene, payout: PayoutScene,
  points: PointsScene, season: SeasonScene, proof: ProofScene, end: EndScene,
};

/** L'argent de la F1, McLaren: double champions, and in the red */
export default function McLarenEpisode({ lang, circuit, narration, voiceover }: McLarenEpisodeProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => buildMcLaren(narration, lang, voiceover), [narration, lang, voiceover]);
  const track = useMemo(() => circuit && buildTrack(circuit), [circuit]);
  if (!track) return null;

  const scene = story.scenes.find(s => frame >= s.from && frame < s.to) ?? story.scenes[story.scenes.length - 1];
  const Scene = SCENES[scene.kind];
  const proof = story.scenes.find(s => s.kind === 'proof')!;
  const end = story.scenes.find(s => s.kind === 'end')!;

  return (
    <MoneyShell
      cuts={story.scenes.slice(1).map(s => s.from)} voice={story.voice} voiceover={voiceover} frames={story.frames}
      proof={{ line: story.beats.proof, from: proof.from, to: proof.to }} end={{ line: story.beats.end, from: end.from }}
    >
      <Camera timeline={story}>
        <Scene track={track} story={story} from={scene.from} series={SERIES} episode={MCLAREN.team.toUpperCase()} />
      </Camera>
    </MoneyShell>
  );
}
