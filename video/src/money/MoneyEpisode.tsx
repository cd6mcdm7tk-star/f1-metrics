import { useMemo, type ReactNode } from 'react';
import { useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { fetchDuel } from '../api';
import type { Lang } from '../i18n';
import Camera from '../kit/Camera';
import { buildTrack } from '../kit/track';
import type { Voiceover } from '../voice';
import type { TeamAccounts } from './accounts';
import { SERIES } from './common';
import {
  CampusScene, DebtScene, EndScene, HookScene, LossesScene, PointsScene, ProofScene, RevenueScene, SeasonScene, StaffScene, type MoneySceneProps,
} from './MoneyScenes';
import MoneyShell from './MoneyShell';
import { buildMoney, type MoneyBeat, type MoneyNarration } from './story';

export interface MoneyEpisodeProps extends Record<string, unknown> {
  lang: Lang;
  accounts: TeamAccounts;
  /** The base's circuit, filled by calculateMetadata from the API */
  circuit: TelemetryDataMulti | null;
  narration: MoneyNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculateMoneyMetadata: CalculateMetadataFunction<MoneyEpisodeProps> = async ({ props }) => ({
  props: { ...props, circuit: props.circuit ?? (await fetchDuel(props.accounts.base)).telemetry },
  durationInFrames: buildMoney(props.narration, props.lang, props.voiceover).frames,
});

const SCENES: Record<MoneyBeat, (props: MoneySceneProps) => ReactNode> = {
  hook: HookScene, revenue: RevenueScene, losses: LossesScene, campus: CampusScene, debt: DebtScene,
  staff: StaffScene, points: PointsScene, season: SeasonScene, proof: ProofScene, end: EndScene,
};

/** L'argent de la F1: a team's accounts, year by year, ending on its season */
export default function MoneyEpisode({ lang, accounts, circuit, narration, voiceover }: MoneyEpisodeProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => buildMoney(narration, lang, voiceover), [narration, lang, voiceover]);
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
        <Scene accounts={accounts} track={track} story={story} beat={scene.kind} from={scene.from} series={SERIES} episode={accounts.team.toUpperCase()} />
      </Camera>
    </MoneyShell>
  );
}
