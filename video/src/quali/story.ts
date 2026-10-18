// The qualifying recap's script: six scenes back to back, each as long as its
// lines take to say. The pole lap is told on the site's telemetry page, corner
// by corner, as the duel does. Frames at 60 fps.
import { fit, type Rect } from '../camera';
import type { Analysis } from '../duel/analysis';
import { PageTimeline, type PageStory } from '../duel/page';
import { momentBeats, pickMoments } from '../duel/story';
import { CARD_FOCUS } from '../format';
import { formatGap, formatLapTime, sessionName, STRINGS, type Lang } from '../i18n';
import { DRIVERS } from '../site/geometry';
import { spokenGap, toVoiceLine, VOICE, type Voiceover, type VoiceLine } from '../voice';
import { cueTime, normalise } from '../words';
import type { Quali, QualiDriver } from './data';
import type { Close, QualiFacts } from './facts';

/** A script written for one session (narration/<video>.<lang>.json) */
export interface QualiNarration {
  /** The cover's title, a line each; the place by default */
  title?: string[];
  hook: string;
  grid: string;
  /** Over the two laps' times on the site's telemetry page */
  lap: string;
  /** The corners told on the pole lap, by label ("T1"): a line per beat, the
   * last over the time gained. Only these corners are told. */
  moments: Record<string, string[]>;
  sectors: string;
  teammates: string;
  verdict: string;
  end: string;
}

export type QualiSceneKind = 'cover' | 'grid' | 'lap' | 'sectors' | 'teammates' | 'verdict';

export interface QualiScene {
  kind: QualiSceneKind;
  from: number;
  to: number;
}

export interface QualiStory {
  frames: number;
  scenes: QualiScene[];
  voice: VoiceLine[];
  /** When each grid slot drops in, by position */
  grid: number[];
  /** The pole lap on the site's page */
  page: PageStory;
  /** When each sector's best comes up, and the ideal lap after them */
  sectors: number[];
  ideal: number | null;
  /** When each teammates' duel comes up */
  teammates: number[];
  /** Where the closing line starts */
  outro: number;
}

const MIN: Record<QualiSceneKind, number> = { cover: 200, grid: 300, lap: 300, sectors: 300, teammates: 300, verdict: 240 };
const LEAD = 8;
const TAIL = 14;
/** Grid slots on screen */
export const GRID = 10;
/** Teammates' duels on screen */
export const PAIRS = 4;
/** Corners told on the pole lap */
const CORNERS = 2;

const gapWords = (gap: number, lang: Lang) => spokenGap(gap, lang);
const CLOSE_WORDS: Record<Lang, Record<Close, string>> = {
  fr: { 0.2: 'de deux dixièmes', 0.5: 'd’une demi-seconde', 1: 'd’une seconde' },
  en: { 0.2: 'two tenths', 0.5: 'half a second', 1: 'a second' },
};

/** The lines when no script was written for the session */
export function defaultNarration(facts: QualiFacts, lang: Lang): QualiNarration {
  const [p1, p2] = facts.gaps;
  const pairs = facts.teammates.slice(0, 2);
  const [s1, s2, s3] = facts.sectors;
  const ideal = facts.ideal;
  if (lang === 'fr') {
    return {
      hook: `${gapWords(p2?.gap ?? 0, lang)} entre la pole et la deuxième place.`,
      grid: `${p1.driver.name} en pole, ${p2?.driver.name ?? ''} à ${gapWords(p2?.gap ?? 0, lang)}. ${facts.within.count} pilotes en moins ${CLOSE_WORDS.fr[facts.within.gap]}.`,
      lap: `La pole, sur le site, mètre par mètre.`,
      moments: {},
      sectors: [
        s1 && s2 && s3 ? `Meilleurs secteurs : ${s1.driver.name}, ${s2.driver.name}, ${s3.driver.name}.` : '',
        ideal ? `Les meilleurs secteurs de ${ideal.driver.name} font ${gapWords(ideal.underPole, lang)} de moins que la pole.` : '',
      ].filter(Boolean).join(' '),
      teammates: pairs.map(p => `${p.ahead.name} devance ${p.behind.name} de ${gapWords(p.gap, lang)}.`).join(' '),
      verdict: `Verdict : ${p1.driver.name} en pole.`,
      end: VOICE.fr.end,
    };
  }
  return {
    hook: `${gapWords(p2?.gap ?? 0, lang)} between pole and second.`,
    grid: `${p1.driver.name} on pole, ${p2?.driver.name ?? ''} ${gapWords(p2?.gap ?? 0, lang)} back. ${facts.within.count} drivers within ${CLOSE_WORDS.en[facts.within.gap]}.`,
    lap: 'Pole, on the site, metre by metre.',
    moments: {},
    sectors: [
      s1 && s2 && s3 ? `Best sectors: ${s1.driver.name}, ${s2.driver.name}, ${s3.driver.name}.` : '',
      ideal ? `${ideal.driver.name}'s best sectors add up to ${gapWords(ideal.underPole, lang)} under pole.` : '',
    ].filter(Boolean).join(' '),
    teammates: pairs.map(p => `${p.ahead.name} beats ${p.behind.name} by ${gapWords(p.gap, lang)}.`).join(' '),
    verdict: `Verdict: ${p1.driver.name} on pole.`,
    end: VOICE.en.end,
  };
}

const driversRect: Rect = { x: DRIVERS.x, y: DRIVERS.y, w: 560, h: DRIVERS.h };

export function buildQuali(
  quali: Quali, facts: QualiFacts, analysis: Analysis, lang: Lang, narration: QualiNarration | null = null, voiceover: Voiceover | null = null,
): QualiStory {
  const script = narration ?? defaultNarration(facts, lang);
  const voice: VoiceLine[] = [];
  const scenes: QualiScene[] = [];
  let cursor = 0;

  const speak = (from: number, text: string): VoiceLine | null => {
    if (!text) return null;
    const line = toVoiceLine(text, Math.max(from, (voice.at(-1)?.to ?? 0) + 6), lang, 60, voiceover);
    voice.push(line);
    return line;
  };
  const scene = (kind: QualiSceneKind, texts: string[]): VoiceLine[] => {
    const from = cursor;
    const lines = texts.filter(Boolean).map((text, i) => speak(i === 0 ? from + (kind === 'cover' ? 12 : LEAD) : 0, text)!);
    const to = Math.max(from + MIN[kind], (lines.at(-1)?.to ?? from) + TAIL);
    scenes.push({ kind, from, to });
    cursor = to;
    return lines;
  };
  const heard = (line: VoiceLine | undefined, cues: string[], values: number[] = []) => (line ? cueTime(line.said, cues, values, lang) : null);
  const named = (driver: QualiDriver) => [normalise(driver.name)];

  scene('cover', [script.hook]);

  // The grid fills from the back, pole last, as the voice names it
  const [gridLine] = scene('grid', [script.grid]);
  const gridFrom = scenes.at(-1)!.from;
  const shown = facts.gaps.slice(0, GRID);
  const poleAt = heard(gridLine, named(facts.pole)) ?? gridFrom + 50;
  const grid = shown.map((_, i) => (i === 0 ? Math.max(poleAt, gridFrom + 4 * shown.length) : gridFrom + 4 * (shown.length - i)));

  // The pole lap on the site: the two laps' times, then each corner where it was won
  const lapFrom = cursor;
  const page = new PageTimeline(quali.duel, lang, speak, lapFrom);
  const s = STRINGS[lang];
  const [faster, slower] = quali.duel.drivers;
  page.hold(lapFrom, fit(driversRect, CARD_FOCUS, 'top'));
  page.beat(60, {
    kicker: `${quali.duel.location} ${quali.duel.year} · ${sessionName(quali.duel.session, lang)}`,
    title: s.laps(faster.name, formatLapTime(faster.lapTime, lang), slower.name, formatGap(slower.lapTime - faster.lapTime, lang)),
    voice: script.lap, marks: [], window: null,
  }, fit(driversRect, CARD_FOCUS, 'top'), 1);
  const lapLength = quali.duel.distance[quali.duel.distance.length - 1];
  const written = Object.keys(script.moments);
  const moments = pickMoments(analysis, lapLength, written.length || CORNERS, written.length ? written : undefined);
  moments.forEach((m, k) => page.corner(m, momentBeats(m, quali.duel, lang), script.moments[m.label], { index: k + 1, total: moments.length }));
  const lapLines = voice.filter(l => l.from >= lapFrom);
  scenes.push({ kind: 'lap', from: lapFrom, to: Math.max(lapFrom + MIN.lap, page.cursor) });
  cursor = scenes.at(-1)!.to;

  // Each sector's best, then the lap someone had in them
  const [sectorsLine] = scene('sectors', [script.sectors]);
  const sectorsFrom = scenes.at(-1)!.from;
  const sectors = facts.sectors.map((_, k) => sectorsFrom + 10 + 10 * k);
  const ideal = facts.ideal
    ? heard(sectorsLine, ['bout', 'ideal', 'assembl', 'addition', 'add'], []) ?? sectorsFrom + Math.round((scenes.at(-1)!.to - sectorsFrom) * 0.55)
    : null;

  // Each teammates' duel as the voice comes to it
  const [teammatesLine] = scene('teammates', [script.teammates]);
  const teammatesFrom = scenes.at(-1)!.from;
  const teammates = facts.teammates.slice(0, PAIRS).map((p, i) => heard(teammatesLine, named(p.ahead)) ?? teammatesFrom + 12 + 20 * i);

  const [, endLine] = scene('verdict', [script.verdict, script.end]);
  const outro = (endLine?.from ?? cursor) - 10;

  return {
    frames: cursor, scenes, voice, grid, sectors, ideal, teammates, outro,
    page: page.story(analysis, lapLines),
  };
}
