// Expressions written into a line of the script: "[ironic] Assez pour perdre
// une pole position… chez soi." The tags are not said; each one changes the
// mascot's face from the word that follows it.
import type { VoiceLine } from '../voice';
import { normalise } from '../words';
import { FACES, type Expression } from './face';

export interface Mood {
  /** Index of the word it starts on, counted as timeWords counts them */
  word: number;
  expression: Expression;
}

export interface MoodAt {
  from: number;
  expression: Expression;
}

const TAG = /\[([a-z]+)\]/g;

const isExpression = (name: string): name is Expression => name in FACES;

/** The line as said, without its tags, and where each expression starts */
export function parseMoods(script: string): { text: string; moods: Mood[] } {
  const moods: Mood[] = [];
  let words = 0;
  for (const token of script.replace(TAG, ' [$1] ').split(/\s+/).filter(Boolean)) {
    const tag = /^\[([a-z]+)\]$/.exec(token);
    if (tag) {
      if (!isExpression(tag[1])) throw new Error(`Unknown expression [${tag[1]}] in "${script}"`);
      moods.push({ word: words, expression: tag[1] });
    } else if (normalise(token) || words === 0) {
      // Punctuation on its own belongs to the word before it
      words++;
    }
  }
  return { text: script.replace(TAG, ' ').replace(/\s+/g, ' ').trim(), moods };
}

/** The frames the expressions start on, a little before their word, as people do */
export function moodFrames(moods: Mood[], said: VoiceLine['said'], from: number, lead = 6): MoodAt[] {
  return moods.map(mood => ({
    from: (said[Math.min(mood.word, said.length - 1)]?.start ?? from) - lead,
    expression: mood.expression,
  }));
}
