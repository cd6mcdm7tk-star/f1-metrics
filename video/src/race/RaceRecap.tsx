import { useMemo } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import type { Lang } from '../i18n';
import Camera from '../kit/Camera';
import { INK } from '../kit/ink';
import { buildTrack } from '../kit/track';
import MascotBubble from '../mascot/MascotBubble';
import Swipe from '../Swipe';
import type { Voiceover } from '../voice';
import { fetchRaceWeekend, type RaceWeekend } from './data';
import { raceFacts } from './facts';
import {
  ChampionshipScene, ClimbersScene, EndScene, FastestScene, HookScene, PodiumScene, PositionsScene, ProofScene, StrategyScene,
} from './RaceScenes';
import { buildRace, type RaceNarration } from './story';

const SERIES = 'LA COURSE';

export interface RaceRecapProps extends Record<string, unknown> {
  lang: Lang;
  query: { year: number; gp: number };
  /** Filled by the render script, or by calculateMetadata from the APIs */
  race: RaceWeekend | null;
  narration: RaceNarration;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

export const calculateRaceMetadata: CalculateMetadataFunction<RaceRecapProps> = async ({ props }) => ({
  props: { ...props, race: props.race ?? (await fetchRaceWeekend(props.query)) },
  durationInFrames: buildRace(props.narration, props.lang, props.voiceover).frames,
});

/** Sunday's video: the race in a minute */
export default function RaceRecap({ lang, race, narration, voiceover }: RaceRecapProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => buildRace(narration, lang, voiceover), [narration, lang, voiceover]);
  const track = useMemo(() => race && buildTrack(race.duel.telemetry), [race]);
  const facts = useMemo(() => race && raceFacts(race), [race]);
  if (!race || !track || !facts) return null;

  const scene = story.scenes.find(s => frame >= s.from && frame < s.to) ?? story.scenes[story.scenes.length - 1];
  const props = { race, facts, story, track, from: scene.from, to: scene.to, series: SERIES, episode: `${race.location.toUpperCase()} ${race.year}` };
  const proof = story.scenes.find(s => s.kind === 'proof')!;
  const end = story.scenes.find(s => s.kind === 'end')!;

  return (
    <AbsoluteFill style={{ background: INK.bg }}>
      <Camera timeline={story}>
        {scene.kind === 'hook' && <HookScene {...props} />}
        {scene.kind === 'podium' && <PodiumScene {...props} />}
        {scene.kind === 'positions' && <PositionsScene {...props} />}
        {scene.kind === 'strategy' && <StrategyScene {...props} />}
        {scene.kind === 'fastest' && <FastestScene {...props} />}
        {scene.kind === 'proof' && <ProofScene {...props} />}
        {scene.kind === 'climbers' && <ClimbersScene {...props} />}
        {scene.kind === 'championship' && <ChampionshipScene {...props} />}
        {scene.kind === 'end' && <EndScene {...props} title={narration.endTitle} />}
      </Camera>
      {/* The mascot comes in for the proof, then for the closing question */}
      <MascotBubble lines={[story.beats.proof]} from={proof.from + 12} to={proof.to} at={{ x: 770, y: 1330, size: 170 }} />
      <MascotBubble lines={[story.beats.end]} from={end.from + 24} to={story.frames} at={{ x: 390, y: 960, size: 300 }} />
      {story.scenes.slice(1).map(s => <Swipe key={s.from} at={s.from} />)}
      {voiceover && story.voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
