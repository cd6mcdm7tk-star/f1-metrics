// What the voiceover says, in each language: sentences written to be heard,
// with units and gaps in words. Every sentence starts with its subject, so a
// "but" can go in front of any of them.
import { lapKm, type Lang } from './i18n';
import type { Viseme } from './mascot/face';
import { moodFrames, parseMoods, type MoodAt } from './mascot/script';
import { showWords, timeWords, type HeardWord } from './words';

const FR_GEARS = ['première', 'deuxième', 'troisième', 'quatrième', 'cinquième', 'sixième', 'septième', 'huitième'];
const EN_GEARS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

const join = (items: string[], and: string) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} ${and} ${items[items.length - 1]}` : items[0]);

/** A gap as said aloud: "84 millièmes", "9 hundredths", "1,2 seconde" */
export function spokenGap(seconds: number, lang: Lang, digits: 2 | 3 = 3): string {
  const abs = Math.abs(seconds);
  if (abs >= 1) {
    const value = abs.toFixed(digits - 1);
    return lang === 'fr' ? `${value.replace('.', ',')} seconde${abs >= 2 ? 's' : ''}` : `${value} seconds`;
  }
  const count = Math.round(abs * 10 ** digits);
  if (count === 0) return lang === 'fr' ? 'moins d’un centième' : 'less than a hundredth';
  const unit = digits === 3 ? (lang === 'fr' ? 'millième' : 'thousandth') : lang === 'fr' ? 'centième' : 'hundredth';
  return `${count} ${unit}${count > 1 ? 's' : ''}`;
}

/** A lap time as said aloud: "1 minute 15 secondes 096", "1:15.096" */
export function spokenLapTime(seconds: number, lang: Lang): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds - minutes * 60;
  const [whole, thousandths] = rest.toFixed(3).split('.');
  if (lang === 'fr') return `${minutes} minute${minutes > 1 ? 's' : ''} ${Number(whole)} secondes ${thousandths}`;
  return `${minutes}:${whole.padStart(2, '0')}.${thousandths}`;
}

/** "T1", "T13", "straight" → "aux virages 1 et 13" / "at turns 1 and 13";
 * a corner by its place on the lap ("@1230") → "à 1,2 kilomètres" */
export function spokenPlaces(labels: string[], lang: Lang): string {
  const corners = labels.filter(l => l !== 'straight');
  const turns = corners.filter(l => !l.startsWith('@')).map(l => l.replace('T', ''));
  const marks = corners.filter(l => l.startsWith('@')).map(l => lapKm(l, lang));
  const straight = labels.length > corners.length;
  if (lang === 'fr') {
    const numbered = turns.length ? [turns.length > 1 ? `aux virages ${join(turns, 'et')}` : `au virage ${turns[0]}`] : [];
    return join([...numbered, ...marks.map(k => `à ${k} kilomètres`), ...(straight ? ['en ligne droite'] : [])], 'et');
  }
  const parts = [
    ...(turns.length ? [`at turn${turns.length > 1 ? 's' : ''} ${join(turns, 'and')}`] : []),
    ...marks.map(k => `${k} kilometres in`),
    ...(straight ? ['on the straight'] : []),
  ];
  return parts.join(' and ');
}

/** Which sectors each driver takes: names in sector order, faster driver first */
function sectorSentence(winners: string[], names: [string, string], lang: Lang): string {
  const of = (name: string) => winners.map((w, i) => (w === name ? i + 1 : 0)).filter(Boolean);
  const [a, b] = [of(names[0]), of(names[1])];
  if (!b.length || !a.length) {
    const who = a.length ? names[0] : names[1];
    return lang === 'fr' ? `${who} prend les trois secteurs.` : `${who} takes all three sectors.`;
  }
  if (lang === 'fr') {
    const say = (s: number[]) => (s.length > 1 ? `les secteurs ${join(s.map(String), 'et')}` : `le secteur ${s[0]}`);
    return `${names[0]} prend ${say(a)}, ${names[1]} ${say(b)}.`;
  }
  const say = (s: number[]) => (s.length > 1 ? `sectors ${join(s.map(String), 'and')}` : `sector ${s[0]}`);
  return `${names[0]} takes ${say(a)}, ${names[1]} ${say(b)}.`;
}

const kmh = { fr: 'kilomètres-heure', en: 'kilometres an hour' };

export const VOICE = {
  fr: {
    hook: (loser: string, winner: string, gap: string) => `Où sont passés les ${gap} perdus par ${loser} face à ${winner} ?`,
    laps: (session: string, location: string, year: number, a: string, time: string, b: string, gap: string) =>
      `${location} ${year}, ${session.toLowerCase()}. ${a} en ${time}, ${b} à ${gap}.`,
    sectors: sectorSentence,
    corner: (label: string) => (label.startsWith('@') ? `À ${lapKm(label, 'fr')} kilomètres. ` : `Virage ${label.replace('T', '')}. `),
    braking: (who: string, by: number, entry?: number) => `${who} freine ${by} mètres plus tard${entry ? ` et garde ${entry} ${kmh.fr} de plus` : ''}.`,
    lifting: (who: string, by: number) => `${who} lève le pied ${by} mètres plus tard.`,
    entrySpeed: (who: string, by: number) => `${who} entre avec ${by} ${kmh.fr} de plus.`,
    liftOnly: (who: string, other: string) => `${who} passe sans freiner, ${other} freine.`,
    apexSpeed: (who: string, by: number, gear: 'higher' | 'lower' | null) =>
      `${who} a ${by} ${kmh.fr} de plus à la corde${gear === 'higher' ? ', avec un rapport au-dessus' : gear === 'lower' ? ', avec un rapport en dessous' : ''}.`,
    gear: (a: string, ga: number, b: string, gb: number) => `${a} passe en ${FR_GEARS[ga - 1]}, ${b} en ${FR_GEARS[gb - 1]}.`,
    lift: (who: string) => `${who} relâche l’accélérateur en sortie : signe d’une glisse, sa vitesse stagne.`,
    throttle: (who: string, by: number, exit?: number) => `${who} remet plein gaz ${by} mètres plus tôt${exit ? ` et sort ${exit} ${kmh.fr} plus vite` : ''}.`,
    exitSpeed: (who: string, by: number) => `${who} sort ${by} ${kmh.fr} plus vite.`,
    cornerSpeed: (who: string, by: number) => `${who} est plus rapide sur tout le virage, ${by} ${kmh.fr} de plus en moyenne.`,
    straightSpeed: (who: string, by: number) => `${who} a ${by} ${kmh.fr} de plus en ligne droite.`,
    but: (sentence: string) => `Mais ${sentence}`,
    gains: (who: string, gap: string) => `${who} y gagne ${gap}.`,
    even: 'Au final, ça s’équilibre.',
    summary: (a: string, placesA: string, b: string, placesB: string | null) =>
      `Au bilan, ${a} fait la différence ${placesA}${placesB ? `, ${b} reprend du temps ${placesB}` : ''}.`,
    dominance: (who: string, pct: number) => `${who} est plus rapide sur ${pct} pour cent du tour.`,
    topSpeed: (a: string, ta: number, b: string, tb: number) => `Vitesse de pointe : ${ta} pour ${a}, ${tb} pour ${b}.`,
    verdict: (who: string, gap: string) => `Verdict : ${who} devant, de ${gap}.`,
    end: 'Toute la télémétrie, chaque session, sur metrikdelta point com.',
  },
  en: {
    hook: (loser: string, winner: string, gap: string) => `Where did ${loser} lose ${gap} to ${winner}?`,
    laps: (session: string, location: string, year: number, a: string, time: string, b: string, gap: string) =>
      `${location} ${year}, ${session.toLowerCase()}. ${a} on a ${time}, ${b} ${gap} back.`,
    sectors: sectorSentence,
    corner: (label: string) => (label.startsWith('@') ? `${lapKm(label, 'en')} kilometres in. ` : `Turn ${label.replace('T', '')}. `),
    braking: (who: string, by: number, entry?: number) => `${who} brakes ${by} metres later${entry ? ` and carries ${entry} ${kmh.en} more` : ''}.`,
    lifting: (who: string, by: number) => `${who} lifts ${by} metres later.`,
    entrySpeed: (who: string, by: number) => `${who} carries ${by} ${kmh.en} more into the corner.`,
    liftOnly: (who: string, other: string) => `${who} doesn’t touch the brakes, ${other} does.`,
    apexSpeed: (who: string, by: number, gear: 'higher' | 'lower' | null) =>
      `${who} is ${by} ${kmh.en} faster at the apex${gear === 'higher' ? ', a gear higher' : gear === 'lower' ? ', a gear lower' : ''}.`,
    gear: (a: string, ga: number, b: string, gb: number) => `${a} takes it in ${EN_GEARS[ga - 1]}, ${b} in ${EN_GEARS[gb - 1]}.`,
    lift: (who: string) => `${who} lifts on the way out: a sign of a slide, and the speed stalls.`,
    throttle: (who: string, by: number, exit?: number) => `${who} is back on full throttle ${by} metres earlier${exit ? ` and exits ${exit} ${kmh.en} faster` : ''}.`,
    exitSpeed: (who: string, by: number) => `${who} exits ${by} ${kmh.en} faster.`,
    cornerSpeed: (who: string, by: number) => `${who} is quicker through the whole corner, ${by} ${kmh.en} on average.`,
    straightSpeed: (who: string, by: number) => `${who} is ${by} ${kmh.en} quicker on the straight.`,
    but: (sentence: string) => `But ${sentence}`,
    gains: (who: string, gap: string) => `${who} gains ${gap} there.`,
    even: 'In the end, it evens out.',
    summary: (a: string, placesA: string, b: string, placesB: string | null) =>
      `So ${a} makes the difference ${placesA}${placesB ? `, and ${b} claws time back ${placesB}` : ''}.`,
    dominance: (who: string, pct: number) => `${who} is quicker over ${pct} percent of the lap.`,
    topSpeed: (a: string, ta: number, b: string, tb: number) => `Top speed: ${ta} for ${a}, ${tb} for ${b}.`,
    verdict: (who: string, gap: string) => `Verdict: ${who} ahead by ${gap}.`,
    end: 'Full telemetry for every session, at metrikdelta dot com.',
  },
} satisfies Record<Lang, unknown>;

/** Roughly how long a line takes to say, in frames at 60 fps: an AI voice
 * reads about 15 characters a second, with a pause at each full stop */
export function speechFrames(text: string): number {
  const pauses = (text.match(/[.?!…:]/g) ?? []).length;
  return Math.round((text.length / 15 + pauses * 0.25 + 0.3) * 60);
}

/** A script written for one video (narration/<video>.<lang>.json): the voice
 * tells the story while the captions keep to the numbers */
export interface Narration {
  hook: string;
  laps: string;
  sectors: string;
  /** By corner label ("T1", or "straight"): a line per beat, the last over
   * the time gained. Only these corners are told. */
  moments: Record<string, string[]>;
  summary: string;
  /** Left out, that beat is cut */
  dominance?: string;
  topSpeed?: string;
  /** In place of the verdict: caption and line */
  epilogue?: { kicker: string; title: string; voice: string };
  end: string;
}

/** A mouth shape from Rhubarb Lip Sync, in seconds into the line */
export interface MouthCue {
  start: number;
  end: number;
  value: Viseme;
}

/** The voiceover recorded: each line's audio (under public/), length, words
 * as heard and mouth shapes, by its text */
export type Voiceover = Record<string, { file: string; seconds: number; words: HeardWord[]; mouth: MouthCue[] }>;

export interface VoiceLine {
  /** Frames */
  from: number;
  to: number;
  text: string;
  /** As shown on screen, in frames */
  words: { text: string; from: number; to: number; figure: boolean }[];
  /** As written, in frames: what the video's cues listen for */
  said: { word: string; start: number }[];
  /** The mascot's mouth, in frames; empty without a recording */
  mouth: { from: number; to: number; value: Viseme }[];
  /** The mascot's expressions, from the script's tags */
  moods: MoodAt[];
}

/** The voiceover plays this much faster than it was spoken, its pitch kept
 * (Remotion's playbackRate goes through ffmpeg's atempo) */
export const VOICE_PACE = 1.12;

/** A line of the script said from frame `start`, without its expression tags,
 * timed by its recording or, without one, by its length, at the voice's pace */
export function toVoiceLine(script: string, start: number, lang: Lang, fps: number, voiceover?: Voiceover | null): VoiceLine {
  const { text, moods } = parseMoods(script);
  const recorded = voiceover?.[text];
  const seconds = (recorded?.seconds ?? speechFrames(text) / 60) / VOICE_PACE;
  const length = Math.ceil(seconds * fps) + (recorded ? 6 : 0);
  const timed = timeWords(text, recorded?.words ?? [], recorded?.seconds ?? seconds * VOICE_PACE);
  const frame = (t: number) => start + Math.round((t / VOICE_PACE) * fps);
  const said = timed.map(w => ({ word: w.word, start: frame(w.start) }));
  return {
    from: start, to: start + length, text,
    words: showWords(timed, lang).map(w => ({ text: w.text, from: frame(w.start), to: frame(w.end), figure: w.figure })),
    said,
    mouth: (recorded?.mouth ?? []).map(c => ({ from: frame(c.start), to: frame(c.end), value: c.value })),
    moods: moodFrames(moods, said, start),
  };
}

const timestamp = (frame: number, fps: number) => {
  const ms = Math.round((frame / fps) * 1000);
  const pad = (n: number, size = 2) => String(n).padStart(size, '0');
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
};

/** The voiceover as subtitles (.srt), for a voice tool or to read along */
export function toSrt(lines: Pick<VoiceLine, 'from' | 'to' | 'text'>[], fps: number): string {
  return lines.map((line, i) => `${i + 1}\n${timestamp(line.from, fps)} --> ${timestamp(line.to, fps)}\n${line.text}\n`).join('\n');
}
