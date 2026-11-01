// Renders a video in every language, spoken by Chatterbox when it is set up
// (scripts/voice.ts), with the voiceover's script as subtitles. The voice
// follows narration/<video>.<lang>.json when written, or is generated:
//   npm run render -- duel --year 2025 --gp 1 --session Q --drivers NOR,PIA [--laps 19,17] [--lang fr] [--silent]
//   npm run render -- recap --year 2026 --gp 17 [--lang fr] [--silent]
//   npm run render -- quali --year 2026 --gp 17 [--lang fr] [--silent]
//   npm run render -- bible --episode corde|altitude [--lang fr] [--silent]
//   npm run render -- pole --year 2026 --gp 18 [--lang fr] [--silent]
//   npm run render -- money --team aston-martin|mclaren [--lang fr] [--silent]
//   npm run render -- race --year 2026 --gp 18 [--lang fr] [--silent]
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { fetchDuel, fetchQuali, fetchRecap, type DuelQuery } from '../src/api';
import { buildCorde, CORDE_QUERY, type CordeNarration } from '../src/bible/corde';
import { ALTITUDE_QUERY } from '../src/bible/altitude/data';
import { buildAltitude, type AltitudeNarration } from '../src/bible/altitude/story';
import type { Duel } from '../src/duel/data';
import { fetchPoleSession, type PoleSession } from '../src/pole/data';
import { ASTON_MARTIN } from '../src/money/astonMartin';
import { MCLAREN } from '../src/money/mclaren/data';
import { buildMcLaren, type McLarenNarration } from '../src/money/mclaren/story';
import { buildMoney, type MoneyNarration } from '../src/money/story';
import { fetchRaceWeekend, type RaceWeekend } from '../src/race/data';
import { buildRace, type RaceNarration } from '../src/race/story';
import type { TelemetryDataMulti } from '../../frontend/src/types/telemetry';

/** An episode of La Bible F1: the lap it tells, its composition, and what it says */
interface BibleEpisode {
  slug: string;
  query: DuelQuery;
  composition: string;
  voice(narration: Record<string, string>, lang: Lang, voiceover: Voiceover | null): VoiceLine[];
}

/** The Bible's episodes, by the name on the command line */
const BIBLE_EPISODES: Record<string, BibleEpisode> = {
  corde: {
    slug: 'bible-01-corde', query: CORDE_QUERY, composition: 'BibleCorde',
    voice: (narration: CordeNarration, lang: Lang, voiceover: Voiceover | null) => buildCorde(narration, lang, voiceover).voice,
  },
  altitude: {
    slug: 'bible-02-altitude', query: ALTITUDE_QUERY, composition: 'BibleAltitude',
    voice: (narration: AltitudeNarration, lang: Lang, voiceover: Voiceover | null) => buildAltitude(narration, lang, voiceover).voice,
  },
};

/** A team whose accounts have been read: the circuit behind its episode, its composition, what it is given and says */
interface MoneyTeam {
  base: DuelQuery;
  composition: string;
  props: Record<string, unknown>;
  voice(narration: Record<string, string>, lang: Lang, voiceover: Voiceover | null): VoiceLine[];
}

/** The money episodes, by the team's name on the command line */
const MONEY_TEAMS: Record<string, MoneyTeam> = {
  'aston-martin': {
    base: ASTON_MARTIN.base, composition: 'MoneyAstonMartin', props: { accounts: ASTON_MARTIN },
    voice: (narration: MoneyNarration, lang: Lang, voiceover: Voiceover | null) => buildMoney(narration, lang, voiceover).voice,
  },
  mclaren: {
    base: MCLAREN.base, composition: 'MoneyMcLaren', props: {},
    voice: (narration: McLarenNarration, lang: Lang, voiceover: Voiceover | null) => buildMcLaren(narration, lang, voiceover).voice,
  },
};
import { buildPole, type PoleNarration } from '../src/pole/story';
import { analyse } from '../src/duel/analysis';
import { buildStory } from '../src/duel/story';
import { VIDEO } from '../src/format';
import { LANGS, type Lang } from '../src/i18n';
import type { Quali } from '../src/quali/data';
import { qualiFacts } from '../src/quali/facts';
import { buildQuali, type QualiNarration } from '../src/quali/story';
import type { Recap } from '../src/recap/data';
import { raceFacts } from '../src/recap/race';
import { buildRecap, type RecapNarration } from '../src/recap/story';
import { toSrt, type Narration, type Voiceover, type VoiceLine } from '../src/voice';
import { webpackOverride } from '../webpack-override';
import { canSpeak, speak } from './voice';

const USAGE = [
  'npm run render -- duel --year 2025 --gp 1 --session Q --drivers NOR,PIA [--laps 19,17] [--lang fr] [--silent]',
  'npm run render -- recap --year 2026 --gp 17 [--lang fr] [--silent]',
  'npm run render -- quali --year 2026 --gp 17 [--lang fr] [--silent]',
  'npm run render -- bible --episode corde|altitude [--lang fr] [--silent]',
  'npm run render -- pole --year 2026 --gp 18 [--lang fr] [--silent]',
  'npm run render -- money --team aston-martin|mclaren [--lang fr] [--silent]',
  'npm run render -- race --year 2026 --gp 18 [--lang fr] [--silent]',
].join('\n');

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    year: { type: 'string' },
    gp: { type: 'string' },
    session: { type: 'string', default: 'Q' },
    drivers: { type: 'string' },
    laps: { type: 'string' },
    episode: { type: 'string' },
    team: { type: 'string' },
    lang: { type: 'string' },
    silent: { type: 'boolean', default: false },
  },
});

const [template] = positionals;
const valid = template === 'money'
  ? values.team != null && values.team in MONEY_TEAMS
  : template === 'bible'
  ? values.episode != null && values.episode in BIBLE_EPISODES
  : !!values.year && !!values.gp && ['duel', 'recap', 'quali', 'pole', 'race'].includes(template) && (template !== 'duel' || !!values.drivers);
if (!valid) {
  console.error(USAGE);
  process.exit(1);
}
const langs = (values.lang ? values.lang.split(',') : LANGS) as Lang[];

/** One video: its name, its composition, and per language what to render and say */
interface Job {
  /** Its script's and voiceover's name */
  slug: string;
  /** The rendered file's name */
  output: string;
  composition: (lang: Lang) => string;
  /** The props and voice lines, timed to the voiceover when there is one */
  take: (lang: Lang, voiceover: Voiceover | null) => { inputProps: Record<string, unknown>; voice: VoiceLine[] };
}

const readScript = <T,>(slug: string, lang: Lang): T | null => {
  const file = path.resolve('narration', `${slug}.${lang}.json`);
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null;
};

async function duelJob(): Promise<Job> {
  const drivers = values.drivers!.toUpperCase().split(',') as [string, string];
  const laps = values.laps?.split(',').map(l => (l ? Number(l) : null)) as DuelQuery['laps'];
  const query: DuelQuery = { year: Number(values.year), gp: Number(values.gp), session: values.session!.toUpperCase(), drivers, laps };
  const duel = await fetchDuel(query);
  const slug = [query.year, duel.location, query.session, ...drivers].join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  return {
    slug,
    output: `duel-${slug}`,
    composition: lang => `TelemetryDuel-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<Narration>(slug, lang);
      return { inputProps: { lang, query, duel, narration, voiceover }, voice: buildStory(duel, analyse(duel), lang, narration, voiceover).voice };
    },
  };
}

/** A session's data doesn't change once run: fetched once, then read from out/cache */
async function cached<T>(name: string, fetch: () => Promise<T>): Promise<T> {
  const file = path.resolve('out/cache', `${name}.json`);
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const data = await fetch();
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data));
  return data;
}

async function recapJob(): Promise<Job> {
  const query = { year: Number(values.year), gp: Number(values.gp) };
  const recap = await cached<Recap>(`recap-${query.year}-${query.gp}`, () => fetchRecap(query));
  const slug = [query.year, recap.location, 'recap'].join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  const facts = raceFacts(recap);
  return {
    slug,
    output: slug,
    composition: lang => `GrandPrixRecap-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<RecapNarration>(slug, lang);
      return { inputProps: { lang, query, recap, narration, voiceover }, voice: buildRecap(recap, facts, lang, narration, voiceover).voice };
    },
  };
}

async function qualiJob(): Promise<Job> {
  const query = { year: Number(values.year), gp: Number(values.gp) };
  const quali = await cached<Quali>(`quali-${query.year}-${query.gp}`, () => fetchQuali(query));
  const slug = [query.year, quali.location, 'quali'].join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  const facts = qualiFacts(quali);
  const analysis = analyse(quali.duel);
  return {
    slug,
    output: slug,
    composition: lang => `QualiRecap-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<QualiNarration>(slug, lang);
      return { inputProps: { lang, query, quali, narration, voiceover }, voice: buildQuali(quali, facts, analysis, lang, narration, voiceover).voice };
    },
  };
}

/** La Bible F1: an episode explained on one lap, its script required */
async function bibleJob(): Promise<Job> {
  const episode = BIBLE_EPISODES[values.episode!];
  const { year, gp, session, drivers } = episode.query;
  const duel = await cached<Duel>(`duel-${year}-${gp}-${session}-${drivers.join('-')}`, () => fetchDuel(episode.query));
  return {
    slug: episode.slug,
    output: episode.slug,
    composition: lang => `${episode.composition}-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<Record<string, string>>(episode.slug, lang);
      if (!narration) throw new Error(`narration/${episode.slug}.${lang}.json is missing: this episode has no generated script`);
      return { inputProps: { lang, duel, narration, voiceover }, voice: episode.voice(narration, lang, voiceover) };
    },
  };
}

/** L'argent de la F1: a team's accounts, its script required */
async function moneyJob(): Promise<Job> {
  const team = MONEY_TEAMS[values.team!];
  const { year, gp, session } = team.base;
  const circuit = await cached<TelemetryDataMulti>(`circuit-${year}-${gp}-${session}`, async () => (await fetchDuel(team.base)).telemetry);
  const slug = `money-${values.team}`;
  return {
    slug,
    output: slug,
    composition: lang => `${team.composition}-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<Record<string, string>>(slug, lang);
      if (!narration) throw new Error(`narration/${slug}.${lang}.json is missing: write the script from the accounts first`);
      return { inputProps: { lang, ...team.props, circuit, narration, voiceover }, voice: team.voice(narration, lang, voiceover) };
    },
  };
}

/** Sunday's video: the race in a minute, its script required */
async function raceJob(): Promise<Job> {
  const query = { year: Number(values.year), gp: Number(values.gp) };
  const race = await cached<RaceWeekend>(`race-${query.year}-${query.gp}`, () => fetchRaceWeekend(query));
  const slug = [query.year, race.location, 'race'].join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  return {
    slug,
    output: slug,
    composition: lang => `RaceRecap-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<RaceNarration>(slug, lang);
      if (!narration) throw new Error(`narration/${slug}.${lang}.json is missing: write the script from the race's facts first`);
      return { inputProps: { lang, query, race, narration, voiceover }, voice: buildRace(narration, lang, voiceover).voice };
    },
  };
}

/** Saturday's video: qualifying through its top six, its script required */
async function poleJob(): Promise<Job> {
  const query = { year: Number(values.year), gp: Number(values.gp) };
  const session = await cached<PoleSession>(`pole-${query.year}-${query.gp}`, () => fetchPoleSession(query));
  const slug = [query.year, session.location, 'pole'].join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');
  return {
    slug,
    output: slug,
    composition: lang => `PoleRecap-${lang}`,
    take: (lang, voiceover) => {
      const narration = readScript<PoleNarration>(slug, lang);
      if (!narration) throw new Error(`narration/${slug}.${lang}.json is missing: write the script from the session's facts first`);
      return { inputProps: { lang, query, session, narration, voiceover }, voice: buildPole(narration, session.drivers, lang, voiceover).voice };
    },
  };
}

const job = template === 'race' ? await raceJob() : template === 'money' ? await moneyJob() : template === 'pole' ? await poleJob() : template === 'bible' ? await bibleJob() : template === 'duel' ? await duelJob() : template === 'recap' ? await recapJob() : await qualiJob();

// Each language's voiceover, spoken before bundling, which copies public/.
// The lines don't depend on the timing: speak them, then time the video to them.
const voiceovers = langs.map(lang => (!values.silent && canSpeak(lang) ? speak(job.take(lang, null).voice.map(line => line.text), lang, job.slug) : null));

const serveUrl = await bundle({ entryPoint: path.resolve('src/index.ts'), webpackOverride });

for (const [i, lang] of langs.entries()) {
  const { inputProps, voice } = job.take(lang, voiceovers[i]);
  const composition = await selectComposition({ serveUrl, id: job.composition(lang), inputProps });
  const seconds = composition.durationInFrames / VIDEO.fps;
  const outputLocation = path.resolve('out', `${job.output}-${lang}.mp4`);
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    outputLocation,
    codec: 'h264',
    crf: 16,
    pixelFormat: 'yuv420p',
    imageFormat: 'jpeg',
    jpegQuality: 95,
    x264Preset: 'slow',
    onProgress: ({ progress }) => process.stdout.write(`\r${lang}: ${Math.round(progress * 100)}%`),
  });
  const script = outputLocation.replace(/\.mp4$/, '.srt');
  writeFileSync(script, toSrt(voice, VIDEO.fps));
  process.stdout.write(`\r${lang}: ${outputLocation} (${seconds.toFixed(1)} s${voiceovers[i] ? ', with voice' : ''})\n${lang}: ${script}\n`);
}
