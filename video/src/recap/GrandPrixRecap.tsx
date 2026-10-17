import { useMemo } from 'react';
import { useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fetchRecap, type RecapQuery } from '../api';
import Cartel from '../Cartel';
import { BrandBackground } from '../components';
import type { Lang } from '../i18n';
import Show from '../Show';
import type { Voiceover } from '../voice';
import type { Recap } from './data';
import Championship from './Championship';
import Figures from './Figures';
import { SlideIn } from './Panel';
import PaceScene from './PaceScene';
import Podium from './Podium';
import RaceChart, { LapCounter } from './RaceChart';
import { raceFacts, type RaceFacts } from './race';
import Strategy from './Strategy';
import TelemetryScene from './TelemetryScene';
import { buildRecap, SHOWN, type RecapNarration, type RecapStory, type Scene } from './story';
import { RECAP_STRINGS } from './strings';

export type GrandPrixRecapProps = {
  lang: Lang;
  query: RecapQuery;
  /** Filled by calculateMetadata from the API */
  recap: Recap | null;
  narration: RecapNarration | null;
  voiceover: Voiceover | null;
};

/** Until calculateMetadata has the story's own length */
export const RECAP_FRAMES = 4200;
export const calculateRecapMetadata: CalculateMetadataFunction<GrandPrixRecapProps> = async ({ props }) => {
  const recap = props.recap ?? (await fetchRecap(props.query));
  return { props: { ...props, recap }, durationInFrames: buildRecap(recap, raceFacts(recap), props.lang, props.narration, props.voiceover).frames };
};

/** A Grand Prix in a minute: the mascot opens and closes, the site's page and
 * the race's numbers, animated, tell the rest */
export default function GrandPrixRecap({ lang, recap, narration, voiceover }: GrandPrixRecapProps) {
  const frame = useCurrentFrame();
  const facts = useMemo(() => recap && raceFacts(recap), [recap]);
  const story = useMemo(() => recap && facts && buildRecap(recap, facts, lang, narration, voiceover), [recap, facts, lang, narration, voiceover]);
  if (!recap || !facts || !story) return null;

  const s = RECAP_STRINGS[lang];
  const scene = story.scenes.find(sc => frame >= sc.from && frame < sc.to) ?? story.scenes[story.scenes.length - 1];
  const place = narration?.title ?? [recap.location.toUpperCase()];
  const date = recap.date ? new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(recap.date)) : `${recap.year}`;

  return (
    <Show
      scenes={story.scenes} voice={story.voice} voiceover={voiceover} outro={story.outro} lang={lang}
      cover={{ kicker: s.series, title: place, meta: `${s.round(recap.round, facts.totalLaps)} · ${date}` }}
    >
      <DataScene recap={recap} facts={facts} story={story} scene={scene} place={place.join(' ')} lang={lang} />
    </Show>
  );
}

function DataScene({ recap, facts, story, scene, place, lang }: { recap: Recap; facts: RaceFacts; story: RecapStory; scene: Scene; place: string; lang: Lang }) {
  const s = RECAP_STRINGS[lang];
  if (scene.kind === 'telemetry') return <SlideIn from={scene.from}><TelemetryScene recap={recap} story={story} scene={scene} lang={lang} /></SlideIn>;
  if (scene.kind === 'pace') return <SlideIn from={scene.from}><PaceScene recap={recap} facts={facts} story={story} scene={scene} lang={lang} /></SlideIn>;
  return (
    <BrandBackground>
      <SlideIn from={scene.from}>
        {scene.kind === 'podium' && <Podium facts={facts} drivers={recap.drivers} cues={story.podium} streak={recap.streak} scene={scene} lang={lang} />}
        {scene.kind === 'race' && <RaceChart facts={facts} story={story} scene={scene} lang={lang} />}
        {scene.kind === 'strategy' && <Strategy facts={facts} story={story} scene={scene} lang={lang} />}
        {scene.kind === 'figures' && <Figures cards={story.cards} />}
        {scene.kind === 'championship' && <Championship standings={recap.championship} winner={recap.drivers[0].code} scene={scene} />}
      </SlideIn>
      {scene.kind === 'podium' && <Cartel from={scene.from} to={scene.to} kicker={s.podium} title={s.round(recap.round, facts.totalLaps)} />}
      {scene.kind === 'race' && <Cartel from={scene.from} to={scene.to} kicker={s.race} title={s.raceTitle} maxWidth={420} />}
      {scene.kind === 'race' && <LapCounter story={story} total={facts.totalLaps} lang={lang} />}
      {scene.kind === 'strategy' && <Cartel from={scene.from} to={scene.to} kicker={s.strategy} title={s.strategyTitle(SHOWN)} />}
      {scene.kind === 'figures' && <Cartel from={scene.from} to={scene.to} kicker={s.figures} title={`${place} ${recap.year}`} />}
      {scene.kind === 'championship' && recap.championship.length > 1 && (
        <Cartel
          from={scene.from} to={scene.to} kicker={s.championship}
          title={s.lead(recap.championship[0].name, recap.championship[0].after - recap.championship[1].after)}
          detail={recap.seasonRounds > recap.round ? s.remaining(recap.seasonRounds - recap.round) : undefined}
        />
      )}
    </BrandBackground>
  );
}
