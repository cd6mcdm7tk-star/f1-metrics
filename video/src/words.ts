// A voiceover line word by word: when each word of the script is said (from
// what Whisper heard, or spread evenly when there is no recording), and how
// it reads on screen ("neuf kilomètres-heure" → "9 km/h").
import type { Lang } from './i18n';

/** A word as Whisper heard it, in seconds into the line */
export interface HeardWord {
  word: string;
  start: number;
  end: number;
}

/** A word on screen, in seconds into the line */
export interface ShownWord {
  text: string;
  start: number;
  end: number;
  /** A figure, set apart on screen */
  figure: boolean;
}

/** Lowercase, without accents or punctuation, to compare what was written and heard */
export const normalise = (word: string): string =>
  word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

/** When each word of `text` is said: matched against what was heard, the rest in between by length */
export function timeWords(text: string, heard: HeardWord[], duration: number): { word: string; start: number; end: number }[] {
  // Punctuation standing alone (French " :") goes with the word before it
  const words: string[] = [];
  for (const w of text.split(/\s+/).filter(Boolean)) {
    if (normalise(w) || !words.length) words.push(w);
    else words[words.length - 1] += `\u00a0${w}`;
  }
  const said = heard.filter(h => normalise(h.word));

  // Longest common subsequence of the two word lists
  const n = words.length, m = said.length;
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = normalise(words[i]) === normalise(said[j].word) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const anchors = new Map<number, HeardWord>();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (normalise(words[i]) === normalise(said[j].word)) { anchors.set(i, said[j]); i++; j++; }
    else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }

  // Unmatched words share the time between their neighbours, by length
  const timed = words.map(word => ({ word, start: 0, end: 0 }));
  const speechStart = said[0]?.start ?? 0;
  const speechEnd = Math.min(duration, said[said.length - 1]?.end ?? duration);
  let i = 0;
  while (i < n) {
    const anchor = anchors.get(i);
    if (anchor) { timed[i].start = anchor.start; timed[i].end = anchor.end; i++; continue; }
    let k = i;
    while (k < n && !anchors.has(k)) k++;
    const from = i > 0 ? timed[i - 1].end : speechStart;
    const to = k < n ? anchors.get(k)!.start : speechEnd;
    const length = words.slice(i, k).reduce((sum, w) => sum + w.length, 0);
    let t = from;
    for (let x = i; x < k; x++) {
      const share = ((to - from) * words[x].length) / length;
      timed[x].start = t;
      timed[x].end = t + share;
      t += share;
    }
    i = k;
  }
  return timed;
}

// ── Numbers as figures ──────────────────────────────────────────────────────

const FR_NUMBERS: Record<string, number> = {
  zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12,
  treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, cents: 100, mille: 1000,
};
const EN_NUMBERS: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13,
  fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
};

/** "quatre-vingt-quatre" → 84, "eighty-four" → 84; null when not a number */
export function numberValue(word: string, lang: Lang): number | null {
  const table = lang === 'fr' ? FR_NUMBERS : EN_NUMBERS;
  const parts = normaliseKeepDashes(word).split('-').filter(p => p && p !== 'et' && p !== 'and');
  if (!parts.length || !parts.every(p => p in table)) return null;
  let total = 0, current = 0;
  for (const p of parts) {
    const v = table[p];
    if (v === 100) current = (current || 1) * 100;
    else if (v === 1000) { total += (current || 1) * 1000; current = 0; }
    else if (lang === 'fr' && v === 20 && current % 100 === 4) current += 76; // quatre-vingt
    else current += v;
  }
  return total + current;
}

const normaliseKeepDashes = (word: string) => word.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]/g, '');
const trailing = (word: string) => word.match(/[.,:;!?…]+$/)?.[0] ?? '';

/** The words as shown: numbers as figures, speeds as km/h. "un" / "one" stay words, they are rarely numbers. */
export function showWords(words: { word: string; start: number; end: number }[], lang: Lang): ShownWord[] {
  const shown: ShownWord[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const value = numberValue(w.word, lang);
    // "quatre virgule quatre" → "4,4": a French decimal said aloud
    const decimal = lang === 'fr' && value != null && !trailing(w.word) && normalise(words[i + 1]?.word ?? '') === 'virgule'
      ? numberValue(words[i + 2]?.word ?? '', lang) : null;
    if (decimal != null) {
      const last = words[i + 2];
      shown.push({ text: `${value},${decimal}${trailing(last.word)}`, start: w.start, end: last.end, figure: true });
      i += 2;
      continue;
    }
    if (value != null && value > 1) {
      // "cent deux", "deux cents": a French number in several words
      if (lang === 'fr') {
        let j = i;
        // "cinquante et un": "et" joins the tens to un or onze
        const joined = (k: number) => normalise(words[k + 1]?.word ?? '') === 'et' && !trailing(words[k + 1].word) && /^(un|onze)$/.test(normalise(words[k + 2]?.word ?? ''));
        while (j + 1 < words.length && !trailing(words[j].word)) {
          if (numberValue(words[j + 1].word, lang) != null) j++;
          else if (joined(j)) j += 2;
          else break;
        }
        const run = words.slice(i, j + 1);
        const merged = run.length > 1 && run.some(r => /^(cents?|mille|et)$/.test(normalise(r.word))) ? numberValue(run.map(r => r.word).join('-'), lang) : null;
        if (merged != null) {
          shown.push({ text: `${merged}${trailing(run[run.length - 1].word)}`, start: w.start, end: run[run.length - 1].end, figure: true });
          i = j;
          continue;
        }
      }
      // "three twenty-nine", "twenty twenty-five": said in pairs
      const next = words[i + 1] && numberValue(words[i + 1].word, lang);
      if (lang === 'en' && next != null && value < 100 && next >= 10 && next < 100) {
        shown.push({ text: `${value}${next}${trailing(words[i + 1].word)}`, start: w.start, end: words[i + 1].end, figure: true });
        i++;
        continue;
      }
      shown.push({ text: `${value}${trailing(w.word)}`, start: w.start, end: w.end, figure: true });
      continue;
    }
    // "quarante pour cent" → "40 %", "forty percent" → "40 %"
    // How many words after this one the percentage takes, or -1 when it isn't one
    const percent = lang === 'fr'
      ? normalise(w.word) === 'pour' && /^cents?$/.test(normalise(words[i + 1]?.word ?? '')) ? 1 : -1
      : normalise(w.word) === 'percent' ? 0 : -1;
    if (percent >= 0 && shown[shown.length - 1]?.figure) {
      const last = words[i + percent];
      const figure = shown[shown.length - 1];
      shown[shown.length - 1] = { ...figure, text: `${figure.text} %${trailing(last.word)}`, end: last.end };
      i += percent;
      continue;
    }
    if (lang === 'fr' && normalise(w.word) === 'kilometresheure') {
      shown.push({ text: `km/h${trailing(w.word)}`, start: w.start, end: w.end, figure: true });
      continue;
    }
    if (lang === 'en' && normalise(w.word) === 'kilometres' && normalise(words[i + 1]?.word ?? '') === 'an' && normalise(words[i + 2]?.word ?? '') === 'hour') {
      shown.push({ text: `km/h${trailing(words[i + 2].word)}`, start: w.start, end: words[i + 2].end, figure: true });
      i += 2;
      continue;
    }
    shown.push({ text: w.word, start: w.start, end: w.end, figure: false });
  }
  return shown;
}

const FR_ORDINALS = ['premier', 'deuxieme', 'troisieme', 'quatrieme', 'cinquieme', 'sixieme', 'septieme', 'huitieme'];
const EN_ORDINALS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth'];

/** "cinquième" → 5, "fifth" → 5; null when not an ordinal */
export function ordinalValue(word: string, lang: Lang): number | null {
  const index = (lang === 'fr' ? FR_ORDINALS : EN_ORDINALS).indexOf(normalise(word));
  return index < 0 ? null : index + 1;
}

/** Whether a word is one of `cues` (starting with it), also after an apostrophe: "l'entrée" */
const isCue = (word: string, cues: string[]) =>
  word.split(/['’]/).some(part => cues.some(c => normalise(part).startsWith(c)));

/** The first moment a word starting with one of `cues`, or saying one of
 * `values` (a number or an ordinal), is said, in seconds into the line */
export function cueTime(words: { word: string; start: number }[], cues: string[], values: number[] = [], lang: Lang = 'fr'): number | null {
  const found = words.find(w => isCue(w.word, cues) || values.includes(numberValue(w.word, lang) ?? ordinalValue(w.word, lang) ?? NaN));
  return found ? found.start : null;
}

/** Subtitle chunks: a few words at a time, broken after punctuation */
export function chunkWords<W extends { text: string }>(words: W[], maxChars = 18, maxWords = 4): W[][] {
  const chunks: W[][] = [];
  let chunk: W[] = [];
  for (const word of words) {
    const length = chunk.reduce((sum, w) => sum + w.text.length + 1, 0) + word.text.length;
    if (chunk.length && (chunk.length >= maxWords || length > maxChars)) { chunks.push(chunk); chunk = []; }
    chunk.push(word);
    if (/[.,:;!?…]$/.test(word.text)) { chunks.push(chunk); chunk = []; }
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}
