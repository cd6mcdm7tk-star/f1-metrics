import type { ReactNode } from 'react';
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';
import { STRINGS, type Lang } from './i18n';
import MascotBubble from './mascot/MascotBubble';
import MascotShot from './mascot/MascotShot';
import SiteMark from './SiteMark';
import Subtitle, { SUBTITLE_TOP } from './Subtitle';
import Swipe from './Swipe';
import { BRAND_NAME, SITE } from './theme';
import { Signature, TitleCard } from './TitleCard';
import { VOICE_PACE, type Voiceover, type VoiceLine } from './voice';

export interface ShowScene {
  kind: string;
  from: number;
  to: number;
}

/** How long the title stays over the hook */
const COVER = 150;

/** What every recap has around its scenes: the mascot saying the first and the
 * last one to camera, in its bubble in between, a sweep at each cut, the cover's
 * and the closing titles, the site's mark, the subtitles and the voice.
 * `children` is the scene on screen when the mascot isn't. */
export default function Show({ scenes, voice, voiceover, outro, cover, lang, children }: {
  scenes: ShowScene[];
  voice: VoiceLine[];
  voiceover: Voiceover | null;
  /** Where the closing line starts, under the closing title */
  outro: number;
  cover: { kicker: string; title: string[]; meta: string };
  lang: Lang;
  children: ReactNode;
}) {
  const frame = useCurrentFrame();
  const first = scenes[0];
  const last = scenes[scenes.length - 1];
  const scene = scenes.find(sc => frame >= sc.from && frame < sc.to) ?? last;
  const toCamera = scene === first || scene === last;
  const titled = frame < COVER || frame >= outro;

  return (
    <AbsoluteFill>
      {toCamera
        ? <MascotShot lines={voice.filter(line => line.from < scene.to && line.to > scene.from)} from={scene.from} to={scene.to} print={!titled} />
        : children}
      <MascotBubble lines={voice} from={first.to} to={last.from} />
      {scenes.slice(1).map(sc => <Swipe key={sc.from} at={sc.from} />)}
      {frame < first.to && <TitleCard from={0} to={COVER} kicker={cover.kicker} title={cover.title} meta={cover.meta} />}
      {frame < COVER && <Signature tagline={STRINGS[lang].signature} />}
      {frame >= last.from && <TitleCard from={outro} kicker={STRINGS[lang].cta} title={BRAND_NAME.split(' ')} meta={SITE} />}
      <SiteMark />
      {/* The closing line is the title's */}
      {voice.slice(0, -1).map(line => <Subtitle key={line.from} line={line} top={SUBTITLE_TOP} />)}
      {voiceover && voice.map(line => voiceover[line.text] && (
        <Sequence key={line.from} from={line.from} durationInFrames={line.to - line.from + 30} layout="none">
          <Html5Audio src={staticFile(voiceover[line.text].file)} playbackRate={VOICE_PACE} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
