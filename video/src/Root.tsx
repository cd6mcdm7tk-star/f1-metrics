import { Composition, Still } from 'remotion';
import TelemetryDuel, { calculateDuelMetadata, DUEL_FRAMES, type TelemetryDuelProps } from './duel/TelemetryDuel';
import { VIDEO } from './format';
import { LANGS } from './i18n';
import MascotAvatar, { AVATAR_SIZE } from './mascot/MascotAvatar';
import MascotLine, { calculateMascotLine } from './mascot/MascotLine';
import ShareImage, { SHARE_SIZE } from './mascot/ShareImage';
import StyleFrames, { calculateStyleFrames } from './kit/StyleFrames';
import CordeEpisode, { calculateCordeMetadata } from './bible/CordeEpisode';
import cordeFr from '../narration/bible-01-corde.fr.json';
import AltitudeEpisode, { calculateAltitudeMetadata } from './bible/altitude/AltitudeEpisode';
import altitudeFr from '../narration/bible-02-altitude.fr.json';
import PoleRecap, { calculatePoleMetadata } from './pole/PoleRecap';
import MoneyEpisode, { calculateMoneyMetadata } from './money/MoneyEpisode';
import RaceRecap, { calculateRaceMetadata } from './race/RaceRecap';
import austinRaceFr from '../narration/2026-austin-race.fr.json';
import { ASTON_MARTIN } from './money/astonMartin';
import astonMoneyFr from '../narration/money-aston-martin.fr.json';
import McLarenEpisode, { calculateMcLarenMetadata } from './money/mclaren/McLarenEpisode';
import mclarenMoneyFr from '../narration/money-mclaren.fr.json';
import austinPoleFr from '../narration/2026-austin-pole.fr.json';
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
      <Still id="ShareImage" component={ShareImage} width={SHARE_SIZE.width} height={SHARE_SIZE.height} />
      <Composition
        id="BibleCorde-fr" component={CordeEpisode} durationInFrames={4200} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', duel: null, narration: cordeFr, voiceover: null }} calculateMetadata={calculateCordeMetadata}
      />
      <Composition
        id="BibleAltitude-fr" component={AltitudeEpisode} durationInFrames={4800} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', duel: null, narration: altitudeFr, voiceover: null }} calculateMetadata={calculateAltitudeMetadata}
      />
      <Composition
        id="PoleRecap-fr" component={PoleRecap} durationInFrames={4500} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', query: { year: 2026, gp: 18 }, session: null, narration: austinPoleFr, voiceover: null }} calculateMetadata={calculatePoleMetadata}
      />
      <Composition
        id="MoneyAstonMartin-fr" component={MoneyEpisode} durationInFrames={4800} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', accounts: ASTON_MARTIN, circuit: null, narration: astonMoneyFr, voiceover: null }} calculateMetadata={calculateMoneyMetadata}
      />
      <Composition
        id="MoneyMcLaren-fr" component={McLarenEpisode} durationInFrames={4800} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', circuit: null, narration: mclarenMoneyFr, voiceover: null }} calculateMetadata={calculateMcLarenMetadata}
      />
      <Composition
        id="RaceRecap-fr" component={RaceRecap} durationInFrames={4500} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height}
        defaultProps={{ lang: 'fr', query: { year: 2026, gp: 18 }, race: null, narration: austinRaceFr, voiceover: null }} calculateMetadata={calculateRaceMetadata}
      />
      <Composition id="StyleFrames" component={StyleFrames} durationInFrames={4} fps={VIDEO.fps} width={VIDEO.width} height={VIDEO.height} defaultProps={{ duel: null }} calculateMetadata={calculateStyleFrames} />
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
