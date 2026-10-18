import { Composition, Still } from 'remotion';
import TelemetryDuel, { calculateDuelMetadata, DUEL_FRAMES, type TelemetryDuelProps } from './duel/TelemetryDuel';
import { VIDEO } from './format';
import { LANGS } from './i18n';
import MascotAvatar, { AVATAR_SIZE } from './mascot/MascotAvatar';
import MascotLine, { calculateMascotLine } from './mascot/MascotLine';
import QualiRecap, { calculateQualiMetadata, QUALI_FRAMES } from './quali/QualiRecap';
import type { QualiNarration } from './quali/story';
import GrandPrixRecap, { calculateRecapMetadata, RECAP_FRAMES } from './recap/GrandPrixRecap';
import type { RecapNarration } from './recap/story';
import MascotSheet from './mascot/MascotSheet';
import type { Narration } from './voice';
import sampleEn from '../narration/2025-melbourne-q-nor-pia.en.json';
import sampleFr from '../narration/2025-melbourne-q-nor-pia.fr.json';
import qualiFr from '../narration/2026-marinabay-quali.fr.json';
import recapFr from '../narration/2026-marinabay-recap.fr.json';

const SAMPLE_QUERY: TelemetryDuelProps['query'] = { year: 2025, gp: 1, session: 'Q', drivers: ['NOR', 'PIA'] };
const SAMPLE_NARRATION: Record<string, Narration> = { en: sampleEn, fr: sampleFr };
const SAMPLE_VIDEO = '2025-melbourne-q-nor-pia';
const RECAP_NARRATION: Record<string, RecapNarration | null> = { en: null, fr: recapFr };
const QUALI_NARRATION: Record<string, QualiNarration | null> = { en: null, fr: qualiFr };

export default function Root() {
  return (
    <>
      {LANGS.map(lang => (
        <Composition
          key={lang}
          id={`TelemetryDuel-${lang}`}
          component={TelemetryDuel}
          durationInFrames={DUEL_FRAMES}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ lang, query: SAMPLE_QUERY, duel: null, narration: SAMPLE_NARRATION[lang], voiceover: null }}
          calculateMetadata={calculateDuelMetadata}
        />
      ))}
      {LANGS.map(lang => (
        <Composition
          key={lang}
          id={`GrandPrixRecap-${lang}`}
          component={GrandPrixRecap}
          durationInFrames={RECAP_FRAMES}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ lang, query: { year: 2026, gp: 17 }, recap: null, narration: RECAP_NARRATION[lang], voiceover: null }}
          calculateMetadata={calculateRecapMetadata}
        />
      ))}
      {LANGS.map(lang => (
        <Composition
          key={lang}
          id={`QualiRecap-${lang}`}
          component={QualiRecap}
          durationInFrames={QUALI_FRAMES}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ lang, query: { year: 2026, gp: 17 }, quali: null, narration: QUALI_NARRATION[lang], voiceover: null }}
          calculateMetadata={calculateQualiMetadata}
        />
      ))}
      <Still id="MascotSheet" component={MascotSheet} width={VIDEO.width} height={VIDEO.height} />
      <Still id="MascotAvatar" component={MascotAvatar} width={AVATAR_SIZE} height={AVATAR_SIZE} />
      {LANGS.map(lang => (
        <Composition
          key={lang}
          id={`MascotLine-${lang}`}
          component={MascotLine}
          durationInFrames={300}
          fps={VIDEO.fps}
          width={VIDEO.width}
          height={VIDEO.height}
          defaultProps={{ lang, video: SAMPLE_VIDEO, script: SAMPLE_NARRATION[lang].hook, line: null, audio: null }}
          calculateMetadata={calculateMascotLine}
        />
      ))}
    </>
  );
}
