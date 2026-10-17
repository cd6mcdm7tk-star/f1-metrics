import { useMemo } from 'react';
import { useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fetchQuali, type RecapQuery } from '../api';
import Cartel from '../Cartel';
import { BrandBackground } from '../components';
import { analyse } from '../duel/analysis';
import PageShot from '../duel/PageShot';
import { formatGap, type Lang } from '../i18n';
import { SlideIn } from '../recap/Panel';
import Show from '../Show';
import type { Voiceover } from '../voice';
import type { Quali } from './data';
import { qualiFacts, type QualiFacts } from './facts';
import Grid from './Grid';
import Sectors from './Sectors';
import { buildQuali, type QualiNarration, type QualiScene, type QualiStory } from './story';
import { QUALI_STRINGS } from './strings';
import Teammates from './Teammates';

export type QualiRecapProps = {
  lang: Lang;
  query: RecapQuery;
  /** Filled by calculateMetadata from the API */
  quali: Quali | null;
  narration: QualiNarration | null;
  voiceover: Voiceover | null;
};

/** Until calculateMetadata has the story's own length */
export const QUALI_FRAMES = 3600;

export const calculateQualiMetadata: CalculateMetadataFunction<QualiRecapProps> = async ({ props }) => {
  const quali = props.quali ?? (await fetchQuali(props.query));
  const story = buildQuali(quali, qualiFacts(quali), analyse(quali.duel), props.lang, props.narration, props.voiceover);
  return { props: { ...props, quali }, durationInFrames: story.frames };
};

/** A qualifying session in a minute: the grid, the pole lap corner by corner on
 * the site's telemetry, the sectors and the lap someone had in them, the teammates */
export default function QualiRecap({ lang, quali, narration, voiceover }: QualiRecapProps) {
  const frame = useCurrentFrame();
  const facts = useMemo(() => quali && qualiFacts(quali), [quali]);
  const story = useMemo(() => quali && facts && buildQuali(quali, facts, analyse(quali.duel), lang, narration, voiceover), [quali, facts, lang, narration, voiceover]);
  if (!quali || !facts || !story) return null;

  const s = QUALI_STRINGS[lang];
  const scene = story.scenes.find(sc => frame >= sc.from && frame < sc.to) ?? story.scenes[story.scenes.length - 1];
  return (
    <Show
      scenes={story.scenes} voice={story.voice} voiceover={voiceover} outro={story.outro} lang={lang}
      cover={{ kicker: s.series, title: narration?.title ?? [quali.location.toUpperCase()], meta: s.meta(quali.round) }}
    >
      <DataScene quali={quali} facts={facts} story={story} scene={scene} lang={lang} />
    </Show>
  );
}

function DataScene({ quali, facts, story, scene, lang }: { quali: Quali; facts: QualiFacts; story: QualiStory; scene: QualiScene; lang: Lang }) {
  const s = QUALI_STRINGS[lang];
  if (scene.kind === 'lap') return <SlideIn from={scene.from}><PageShot duel={quali.duel} story={story.page} lang={lang} /></SlideIn>;
  return (
    <BrandBackground>
      <SlideIn from={scene.from}>
        {scene.kind === 'grid' && <Grid facts={facts} cues={story.grid} lang={lang} />}
        {scene.kind === 'sectors' && <Sectors facts={facts} cues={story.sectors} ideal={story.ideal} lang={lang} />}
        {scene.kind === 'teammates' && <Teammates facts={facts} cues={story.teammates} lang={lang} />}
      </SlideIn>
      {scene.kind === 'grid' && (
        <Cartel from={scene.from} to={scene.to} kicker={s.grid} title={s.gridTitle} detail={s.within(facts.within.count, formatGap(facts.within.gap, lang, 1))} />
      )}
      {scene.kind === 'sectors' && <Cartel from={scene.from} to={scene.to} kicker={s.sectors} title={s.sectorsTitle} />}
      {scene.kind === 'teammates' && <Cartel from={scene.from} to={scene.to} kicker={s.teammates} title={s.teammatesTitle} />}
    </BrandBackground>
  );
}
