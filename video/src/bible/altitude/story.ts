// La Bible F1, episode 2, told beat by beat (kit/timeline.ts): the question,
// the flight down Mexico's straight and up to its altitude, the air explained
// on the car, the top speeds, the site, the verdict.
import type { Lang } from '../../i18n';
import { buildTimeline, type CueSpec, type Timeline } from '../../kit/timeline';
import type { Voiceover } from '../../voice';

export const ALTITUDE_BEATS = ['hook', 'context', 'altitude', 'downforce', 'wings', 'drag', 'cost', 'speeds', 'proof', 'payoff', 'end'] as const;
export type AltitudeBeat = (typeof ALTITUDE_BEATS)[number];
/** The script (narration/bible-02-altitude.<lang>.json): a line per beat, and
 * the next episode's title for the closing card (*stars* mark a word) */
export type AltitudeNarration = Record<AltitudeBeat, string> & { next: string };

export type AltitudeSceneKind = 'fly' | 'air' | 'speeds' | 'proof' | 'payoff' | 'end';
const SCENE_OF: Record<AltitudeBeat, AltitudeSceneKind> = {
  hook: 'fly', context: 'fly', altitude: 'fly',
  downforce: 'air', wings: 'air', drag: 'air', cost: 'air',
  speeds: 'speeds', proof: 'proof', payoff: 'payoff', end: 'end',
};

/** Each cue: its beat, the word that triggers it, and where in the line it falls without a recording */
const CUES = {
  monza: ['hook', 'monza', 0.45],
  monaco: ['hook', 'monaco', 0.75],
  flat: ['context', 'fond', 0.5],
  top: ['context', 'trois', 0.7],
  climb: ['altitude', 'lahaut', 0.15],
  metres: ['altitude', 'metres', 0.5],
  thin: ['altitude', 'vingt', 0.8],
  pressed: ['downforce', 'plaque', 0.3],
  lessGrip: ['downforce', 'moins', 0.7],
  wings: ['wings', 'ailerons', 0.45],
  lost: ['wings', 'perdu', 0.9],
  resistance: ['drag', 'resistance', 0.5],
  glide: ['drag', 'glisse', 0.8],
  turbo: ['cost', 'turbo', 0.3],
  brakes: ['cost', 'freins', 0.7],
  bars: ['speeds', 'vitesse', 0.25],
  mexico: ['speeds', 'trois', 0.45],
  ahead: ['speeds', 'monza', 0.75],
  topMark: ['proof', 'trois', 0.5],
  turnOne: ['proof', 'virage', 0.9],
  wingsOf: ['payoff', 'monaco', 0.3],
  speedOf: ['payoff', 'monza', 0.5],
  suffer: ['payoff', 'freins', 0.85],
} as const satisfies Record<string, CueSpec<AltitudeBeat>>;
export type AltitudeCue = keyof typeof CUES;

export type AltitudeStory = Timeline<AltitudeBeat, AltitudeSceneKind, AltitudeCue>;

export const buildAltitude = (narration: AltitudeNarration, lang: Lang, voiceover: Voiceover | null, fps = 60): AltitudeStory =>
  buildTimeline(ALTITUDE_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
