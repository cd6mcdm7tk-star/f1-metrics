// Sunday's video: the race in a minute, told beat by beat (kit/timeline.ts).
// The script is written per race, its figures checked against facts.ts.
import type { Lang } from '../i18n';
import { buildTimeline, type CueSpec, type Timeline } from '../kit/timeline';
import type { Voiceover } from '../voice';

export const RACE_BEATS = ['hook', 'podium', 'start', 'strategy', 'lead', 'fastest', 'proof', 'climbers', 'championship', 'end'] as const;
export type RaceBeat = (typeof RACE_BEATS)[number];
/** The script (narration/<year>-<place>-race.<lang>.json): a line per beat,
 * and the closing card's title (*stars* mark a word) */
export type RaceNarration = Record<RaceBeat, string> & { endTitle: string };

export type RaceSceneKind = 'hook' | 'podium' | 'positions' | 'strategy' | 'fastest' | 'proof' | 'climbers' | 'championship' | 'end';
const SCENE_OF: Record<RaceBeat, RaceSceneKind> = {
  hook: 'hook', podium: 'podium', start: 'positions', strategy: 'strategy', lead: 'positions',
  fastest: 'fastest', proof: 'proof', climbers: 'climbers', championship: 'championship', end: 'end',
};

const CUES = {
  second: ['podium', 'leclerc', 0.1],
  third: ['podium', 'verstappen', 0.55],
  firstLap: ['start', 'perd', 0.7],
  oneStop: ['strategy', 'seul', 0.45],
  twoStops: ['strategy', 'deux', 0.75],
  leads: ['lead', 'mene', 0.4],
  pits: ['lead', 'deuxieme', 0.9],
  fastestLap: ['fastest', 'meilleur', 0.35],
  quicker: ['fastest', 'deux', 0.6],
  everywhere: ['proof', 'partout', 0.7],
  norris: ['climbers', 'norris', 0.3],
  bortoleto: ['climbers', 'bortoleto', 0.7],
  lead: ['championship', 'avance', 0.5],
  left: ['championship', 'jeu', 0.9],
} as const satisfies Record<string, CueSpec<RaceBeat>>;
export type RaceCue = keyof typeof CUES;

export type RaceStory = Timeline<RaceBeat, RaceSceneKind, RaceCue>;

export const buildRace = (narration: RaceNarration, lang: Lang, voiceover: Voiceover | null, fps = 60): RaceStory =>
  buildTimeline(RACE_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
