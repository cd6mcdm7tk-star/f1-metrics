// The recap's script: seven scenes back to back, each as long as its lines
// take to say, and what the animations wait for in the voice. Frames at 60 fps.
import { fit, type Camera, type Rect } from '../camera';
import { CARD, CARD_FOCUS, VIDEO } from '../format';
import { ordinal, type Lang } from '../i18n';
import { CHARTS, lapsRect, PAGE, ROWS } from '../site/geometry';
import { spokenGap, toVoiceLine, VOICE, type Voiceover, type VoiceLine } from '../voice';
import { cueTime, normalise } from '../words';
import type { Recap, RecapDriver } from './data';
import { paceChart } from './pace';
import type { RaceFacts } from './race';
import { RECAP_STRINGS } from './strings';

/** A script written for one recap (narration/<video>.<lang>.json) */
export interface RecapNarration {
  /** The cover's title, a line each; the place by default */
  title?: string[];
  hook: string;
  podium: string;
  race: string;
  /** Over the site's telemetry page: the top two's best laps */
  telemetry: string;
  strategy: string;
  /** Over the site's lap chart of the top two */
  pace: string;
  /** A line per figure card, in their order */
  figures: string[];
  championship: string;
  verdict: string;
  end: string;
}

export type SceneKind = 'cover' | 'podium' | 'race' | 'telemetry' | 'strategy' | 'pace' | 'figures' | 'championship' | 'verdict';

export interface Scene {
  kind: SceneKind;
  from: number;
  to: number;
}

export interface FigureCard {
  from: number;
  to: number;
  value: number;
  /** "+" before a number of places gained */
  sign: string;
  label: string;
  detail: string;
  color: string;
  /** The driver's code, huge behind the figure */
  ghost: string;
}

export interface RecapStory {
  frames: number;
  scenes: Scene[];
  voice: VoiceLine[];
  /** When P1, P2 and P3 come up on the podium */
  podium: [number, number, number];
  /** The race chart's lap at these frames, linear in between */
  raceLaps: { frame: number; lap: number }[];
  /** When the strategy's telling stint lights up, and which driver's */
  stint: { from: number; code: string } | null;
  cards: FigureCard[];
  /** The site's telemetry page, framed on its charts */
  telemetry: Camera;
  /** The lap chart, framed whole, then on the laps from the restart when the voice gets there */
  pace: { whole: Camera; late: Camera | null; at: number | null };
  /** Where the closing line starts */
  outro: number;
}

// Just long enough for each scene's animation: the voice sets the pace
const MIN: Record<SceneKind, number> = { cover: 200, podium: 300, race: 480, telemetry: 300, strategy: 300, pace: 420, figures: 0, championship: 300, verdict: 240 };
const CARD_MIN = 150;
/** The voice starts this many frames into a scene; a scene lasts this long after its line */
const LEAD = 8;
const TAIL = 14;
/** The lap chart takes this long to draw before the camera may close in */
export const REVEAL = 90;
/** The race chart draws at most a lap in this many frames */
const FRAMES_PER_LAP = 3;
/** Drivers on the race chart and the strategy */
export const SHOWN = 6;

const SPOKEN_PLACES: Record<Lang, string[]> = {
  fr: ['premier', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième', 'neuvième', 'dixième'],
  en: ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'],
};
const spokenPlace = (n: number, lang: Lang) => SPOKEN_PLACES[lang][n - 1] ?? ordinal(n, lang);

const stops = (facts: RaceFacts, driver: RecapDriver) => (facts.followed.find(f => f.driver === driver)?.stints.length ?? 1) - 1;

/** The lines when no script was written for the race */
export function defaultNarration(recap: Recap, facts: RaceFacts, lang: Lang): RecapNarration {
  const [p1, p2, p3] = recap.drivers;
  const [leader, second] = recap.championship;
  const lead = leader && second ? leader.after - second.after : 0;
  const climbed = recap.championship.find(s => s.code === p1.code && s.before > 0 && s.placeBefore > s.place);
  const gap = spokenGap(facts.followed[1]?.gaps.at(-1) ?? 0, lang, 2);
  const stop = facts.neutralised[0]?.from;
  const faller = facts.faller;
  const climbers = facts.climbers.slice(0, 2);
  // The top two's pace from the restart, or over the race without one
  const paceOf = (d: RecapDriver) => facts.pace.find(p => p.driver === d);
  const late = facts.restart != null && paceOf(p1)?.late != null && paceOf(p2)?.late != null;
  const [a, b] = [paceOf(p1)?.[late ? 'late' : 'overall'] ?? 0, paceOf(p2)?.[late ? 'late' : 'overall'] ?? 0];
  const [quicker, slower] = a <= b ? [p1, p2] : [p2, p1];
  const perLap = spokenGap(Math.abs(a - b), lang, 2);
  // Their best laps, quicker first, as the telemetry page shows them
  const [best, next] = recap.duel.drivers ?? [];
  const oneLap = best && next ? spokenGap(next.lapTime - best.lapTime, lang) : '';
  if (lang === 'fr') {
    return {
      hook: facts.lapsLed === facts.totalLaps
        ? `${facts.totalLaps} tours, ${facts.totalLaps} en tête : ${p1.name} n’a rien laissé.`
        : `${p1.name} s’impose à ${recap.location}.`,
      podium: `${p1.name} gagne. ${p2.name} termine à ${gap}. ${p3.name} complète le podium.`,
      race: [stop && `Tour ${stop} : la course est neutralisée.`, faller && `${faller.driver.name} pointe ${spokenPlace(faller.best, lang)} au tour ${faller.lap}.`].filter(Boolean).join(' ')
        || `${p1.name} mène ${facts.lapsLed} tours.`,
      strategy: `${p1.name} : ${stops(facts, p1)} arrêt${stops(facts, p1) > 1 ? 's' : ''}.${faller ? ` ${faller.driver.name} finit ${spokenPlace(faller.final, lang)}.` : ''}`,
      telemetry: best && next ? `Sur un tour, ${best.name} est ${oneLap} plus rapide que ${next.name}.` : '',
      pace: late
        ? `Le rythme, tour par tour. Après le tour ${facts.restart! - 1}, ${quicker.name} tourne ${perLap} plus vite par tour que ${slower.name}.`
        : `Le rythme, tour par tour : ${quicker.name} tourne ${perLap} plus vite par tour que ${slower.name}.`,
      figures: [
        ...climbers.map(c => `${c.driver.name} gagne ${c.gained} places.`),
        ...(facts.retired.length ? [`${facts.retired.length} abandon${facts.retired.length > 1 ? 's' : ''}.`] : []),
      ],
      championship: leader && second
        ? `Au championnat, ${leader.name} compte ${lead} points d’avance sur ${second.name}.${climbed ? ` ${p1.name} remonte ${spokenPlace(climbed.place, lang)}.` : ''}`
        : '',
      verdict: `Verdict : ${p1.name} devant ${p2.name}.`,
      end: VOICE.fr.end,
    };
  }
  return {
    hook: facts.lapsLed === facts.totalLaps
      ? `${facts.totalLaps} laps, ${facts.totalLaps} in the lead: ${p1.name} left nothing.`
      : `${p1.name} wins in ${recap.location}.`,
    podium: `${p1.name} wins. ${p2.name} finishes ${gap} back. ${p3.name} completes the podium.`,
    race: [stop && `Lap ${stop}: the race is neutralised.`, faller && `${faller.driver.name} runs ${spokenPlace(faller.best, lang)} on lap ${faller.lap}.`].filter(Boolean).join(' ')
      || `${p1.name} leads ${facts.lapsLed} laps.`,
    strategy: `${p1.name}: ${stops(facts, p1)} stop${stops(facts, p1) > 1 ? 's' : ''}.${faller ? ` ${faller.driver.name} finishes ${spokenPlace(faller.final, lang)}.` : ''}`,
    telemetry: best && next ? `Over one lap, ${best.name} is ${oneLap} quicker than ${next.name}.` : '',
    pace: late
      ? `The pace, lap by lap. After lap ${facts.restart! - 1}, ${quicker.name} is ${perLap} a lap quicker than ${slower.name}.`
      : `The pace, lap by lap: ${quicker.name} is ${perLap} a lap quicker than ${slower.name}.`,
    figures: [
      ...climbers.map(c => `${c.driver.name} gains ${c.gained} places.`),
      ...(facts.retired.length ? [`${facts.retired.length} retirement${facts.retired.length > 1 ? 's' : ''}.`] : []),
    ],
    championship: leader && second
      ? `In the championship, ${leader.name} leads ${second.name} by ${lead} points.${climbed ? ` ${p1.name} climbs to ${spokenPlace(climbed.place, lang)}.` : ''}`
      : '',
    verdict: `Verdict: ${p1.name} ahead of ${p2.name}.`,
    end: VOICE.en.end,
  };
}


/** The telemetry page's charts, speed to brake, the whole lap wide */
const TELEMETRY_RECT: Rect = { x: CHARTS.x, y: ROWS.speed.y - 24, w: CHARTS.w, h: ROWS.brake.y + ROWS.brake.h - ROWS.speed.y + 24 };

/** The camera moved sideways so the card shows nothing past the page's edges */
const withinPage = (cam: Camera): Camera => {
  const left = (VIDEO.width / 2 - CARD.x) / cam.scale, right = (CARD.x + CARD.w - VIDEO.width / 2) / cam.scale;
  return { ...cam, x: Math.min(Math.max(cam.x, left), PAGE.width - right) };
};

export function buildRecap(recap: Recap, facts: RaceFacts, lang: Lang, narration: RecapNarration | null = null, voiceover: Voiceover | null = null): RecapStory {
  const script = narration ?? defaultNarration(recap, facts, lang);
  const s = RECAP_STRINGS[lang];
  const voice: VoiceLine[] = [];
  const scenes: Scene[] = [];
  let cursor = 0;

  const speak = (from: number, text: string): VoiceLine => {
    const line = toVoiceLine(text, Math.max(from, (voice.at(-1)?.to ?? 0) + 6), lang, 60, voiceover);
    voice.push(line);
    return line;
  };
  /** A scene with its lines one after the other; it ends a little after the last */
  const scene = (kind: SceneKind, texts: string[], min = MIN[kind]): VoiceLine[] => {
    const from = cursor;
    const lines = texts.filter(Boolean).map((text, i) => speak(i === 0 ? from + (kind === 'cover' ? 12 : LEAD) : 0, text));
    const to = Math.max(from + min, (lines.at(-1)?.to ?? from) + TAIL);
    scenes.push({ kind, from, to });
    cursor = to;
    return lines;
  };
  const heard = (line: VoiceLine | undefined, cues: string[], values: number[] = []) => (line ? cueTime(line.said, cues, values, lang) : null);
  const named = (driver: RecapDriver) => [normalise(driver.name)];

  scene('cover', [script.hook]);

  const [podiumLine] = scene('podium', [script.podium]);
  const podiumFrom = scenes.at(-1)!.from;
  const podium = recap.drivers.slice(0, 3).map((d, i) => heard(podiumLine, named(d)) ?? podiumFrom + 20 + 30 * i) as [number, number, number];

  // The chart reaches the laps the voice names as it names them
  const [raceLine] = scene('race', [script.race]);
  const race = scenes.at(-1)!;
  const keys: { frame: number; lap: number }[] = [];
  const stop = facts.neutralised.find(n => heard(raceLine, [], [n.from]) != null);
  if (stop) keys.push({ frame: heard(raceLine, [], [stop.from])!, lap: stop.from });
  const faller = facts.faller;
  const fallerAt = faller && heard(raceLine, named(faller.driver));
  if (faller && fallerAt != null) keys.push({ frame: fallerAt, lap: faller.lap });
  // In the order the voice names them, never faster than the chart can be
  // followed: a lap named too early is left to wait for it. The last lap is
  // always reached, just before the cut.
  const raceLaps = [{ frame: race.from + 10, lap: 1 }];
  for (const k of [...keys].sort((a, b) => a.frame - b.frame)) {
    const last = raceLaps[raceLaps.length - 1];
    if (k.lap > last.lap && k.frame >= last.frame + (k.lap - last.lap) * FRAMES_PER_LAP) raceLaps.push(k);
  }
  const reached = raceLaps[raceLaps.length - 1];
  if (facts.totalLaps > reached.lap) raceLaps.push({ frame: Math.max(race.to - 40, reached.frame + 20), lap: facts.totalLaps });

  if (recap.duel.drivers?.length === 2) scene('telemetry', [script.telemetry]);

  // A script leaves the strategy out when the tyre data can't be trusted
  const [strategyLine] = script.strategy ? scene('strategy', [script.strategy]) : [];
  const longest = faller && facts.followed.find(f => f.driver === faller.driver);
  const stintFrom = faller && heard(strategyLine, named(faller.driver));
  const stint = longest && stintFrom != null ? { from: stintFrom, code: longest.driver.code } : null;

  // The lap chart zooms onto the end of the race as the voice names the restart
  const [paceLine] = scene('pace', [script.pace]);
  const pace = scenes.at(-1)!;
  const restart = facts.restart;
  const zoomAt = restart != null ? heard(paceLine, [], [restart - 1, restart]) : null;
  const paceZoom = zoomAt != null && zoomAt >= pace.from + REVEAL ? zoomAt : null;

  // A card per figure, each as long as its line
  const figures: Omit<FigureCard, 'from' | 'to'>[] = [
    ...facts.climbers.slice(0, 2).filter(c => c.gained >= 3).map(c => ({
      value: c.gained, sign: '+', label: s.climber, detail: s.climb(c.driver.name, c.driver.grid!, c.driver.position), color: c.driver.color, ghost: c.driver.code,
    })),
    ...(facts.retired.length ? [{ value: facts.retired.length, sign: '', label: s.retired(facts.retired.length), detail: facts.retired.map(d => d.name).join(', '), color: '#f2e6d8', ghost: 'DNF' }] : []),
  ];
  const cards: FigureCard[] = [];
  const figuresFrom = cursor;
  figures.forEach((figure, i) => {
    const from = cursor;
    const text = script.figures[i];
    const line = text ? speak(from + LEAD, text) : null;
    cursor = Math.max(from + CARD_MIN, (line?.to ?? from) + TAIL);
    cards.push({ ...figure, from, to: cursor });
  });
  if (cards.length) scenes.push({ kind: 'figures', from: figuresFrom, to: cursor });

  if (recap.championship.length > 1) scene('championship', [script.championship]);

  const [, endLine] = scene('verdict', [script.verdict, script.end]);
  const outro = (endLine?.from ?? cursor) - 10;

  return {
    frames: cursor, scenes, voice, podium, raceLaps, stint, cards, outro,
    telemetry: fit(TELEMETRY_RECT, CARD_FOCUS),
    pace: paceCameras(recap, facts, paceZoom),
  };
}

/** The lap chart whole, and closed in on the laps from the restart around the top two's pace there */
function paceCameras(recap: Recap, facts: RaceFacts, at: number | null): RecapStory['pace'] {
  const { drivers, domain } = paceChart(recap);
  const last = facts.totalLaps;
  const whole = withinPage(fit(lapsRect([1, last], domain, last, domain), CARD_FOCUS));
  const late = drivers.map(d => facts.pace.find(p => p.driver === d)?.late).filter((t): t is number => t != null);
  if (facts.restart == null || late.length < 2) return { whole, late: null, at: null };
  const times: [number, number] = [Math.min(...late) - 1.2, Math.max(...late) + 1.8];
  return { whole, late: withinPage(fit(lapsRect([Math.max(1, facts.restart - 4), last], times, last, domain), CARD_FOCUS)), at };
}

/** The race chart's lap at a frame, with its fraction */
export function raceLapAt(story: RecapStory, frame: number): number {
  const keys = story.raceLaps;
  if (frame <= keys[0].frame) return keys[0].lap;
  for (let i = 1; i < keys.length; i++) {
    if (frame <= keys[i].frame) {
      const t = (frame - keys[i - 1].frame) / (keys[i].frame - keys[i - 1].frame);
      return keys[i - 1].lap + (keys[i].lap - keys[i - 1].lap) * t;
    }
  }
  return keys.at(-1)!.lap;
}
