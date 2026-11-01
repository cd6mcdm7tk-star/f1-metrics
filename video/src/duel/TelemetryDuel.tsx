import { useMemo } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame, type CalculateMetadataFunction } from 'remotion';
import { fetchDuel, type DuelQuery } from '../api';
import { sessionName, STRINGS, type Lang } from '../i18n';
import MascotBubble from '../mascot/MascotBubble';
import MascotShot from '../mascot/MascotShot';
import SiteMark from '../SiteMark';
import Subtitle, { SUBTITLE_TOP } from '../Subtitle';
import { BRAND_NAME, SITE } from '../theme';
import { Signature, TitleCard } from '../TitleCard';
import { spokenGap, type Narration, type Voiceover } from '../voice';
import { analyse } from './analysis';
import type { Duel } from './data';
import PageShot from './PageShot';
import { buildStory } from './story';

export interface TelemetryDuelProps extends Record<string, unknown> {
  lang: Lang;
  query: DuelQuery;
  /** Filled by calculateMetadata from the API */
  duel: Duel | null;
  /** A script written for this video, or the voice is generated */
  narration: Narration | null;
  /** The voiceover recorded, which the video is timed to; silent without */
  voiceover: Voiceover | null;
}

/** Until calculateMetadata has the story's own length */
export const DUEL_FRAMES = 3600;
/** How long the title stays over the hook */
const COVER = 150;

export const calculateDuelMetadata: CalculateMetadataFunction<TelemetryDuelProps> = async ({ props }) => {
  const duel = props.duel ?? (await fetchDuel(props.query));
  return { props: { ...props, duel }, durationInFrames: buildStory(duel, analyse(duel), props.lang, props.narration, props.voiceover).frames };
};


/** A telemetry analysis of two laps, cut like a presenter's show: the mascot
 * says the hook and the verdict to camera, the site's page shows the rest */
export default function TelemetryDuel({ lang, duel, narration, voiceover }: TelemetryDuelProps) {
  const frame = useCurrentFrame();
  const story = useMemo(() => duel && buildStory(duel, analyse(duel), lang, narration, voiceover), [duel, lang, narration, voiceover]);
  if (!duel || !story) return null;

  const s = STRINGS[lang];
  const [hook, closing] = story.mascot;
  const scene = story.mascot.find(m => frame >= m.from && frame < m.to);
  const gap = duel.drivers[1].lapTime - duel.drivers[0].lapTime;
  // The titles sit over the mascot's shirt
  const titled = frame < COVER || frame >= story.outro;

  return (
    <AbsoluteFill>
      {scene
        ? <MascotShot lines={story.voice.filter(line => line.from < scene.to && line.to > scene.from)} from={scene.from} to={scene.to} print={!titled} />
        : <PageShot duel={duel} story={story} lang={lang} />}
      <MascotBubble lines={story.voice} from={hook.to} to={closing.from} />
      {frame < hook.to && (
        <TitleCard
          from={0} to={COVER} kicker={s.series} title={spokenGap(gap, lang).toUpperCase().split(' ')}
          meta={`${duel.drivers[0].name} – ${duel.drivers[1].name} · ${duel.location} ${duel.year} · ${sessionName(duel.session, lang)}`}
        />
      )}
      {frame < COVER && <Signature tagline={s.signature} />}
      {frame >= closing.from && <TitleCard from={story.outro} kicker={s.cta} title={BRAND_NAME.split(' ')} meta={SITE} />}
      <SiteMark />
      {/* The closing line is the title's */}
      {story.voice.slice(0, -1).map(line => <Subtitle key={line.from} line={line} top={SUBTITLE_TOP} />)}
      {voiceover && story.voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
