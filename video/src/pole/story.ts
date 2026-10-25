// Saturday's video: a qualifying session through its top six, told beat by
// beat (kit/timeline.ts). The script is written per session, its figures
// checked against facts.ts.
import type { Lang } from '../i18n';
import { buildTimeline, cueIn, type CueSpec, type Timeline } from '../kit/timeline';
import type { Voiceover } from '../voice';
import { normalise } from '../words';
import type { PoleDriver } from './data';

export const POLE_BEATS = ['hook', 'grid', 'lead', 'gain', 'loss', 'proof', 'redbull', 'leclerc', 'hamilton', 'russell', 'sectors', 'verdict'] as const;
export type PoleBeat = (typeof POLE_BEATS)[number];

/** The script (narration/<year>-<place>-pole.<lang>.json). The four detail
 * beats each focus a driver of the top six, from P3 down; their keys are
 * kept so the scenes stay the same from one session to the next. */
export type PoleNarration = Record<PoleBeat, string>;

export type PoleSceneKind = 'hook' | 'grid' | 'lap' | 'proof' | 'details' | 'sectors' | 'verdict';
const SCENE_OF: Record<PoleBeat, PoleSceneKind> = {
  hook: 'hook', grid: 'grid', lead: 'lap', gain: 'lap', loss: 'lap', proof: 'proof',
  redbull: 'details', leclerc: 'details', hamilton: 'details', russell: 'details', sectors: 'sectors', verdict: 'verdict',
};

/** The details' beats, and the place of the driver each focuses on */
export const DETAILS: { beat: PoleBeat; position: number }[] = [
  { beat: 'redbull', position: 3 }, { beat: 'leclerc', position: 4 }, { beat: 'hamilton', position: 5 }, { beat: 'russell', position: 6 },
];

const CUES = {
  firstCorner: ['lead', 'premier', 0.5],
  esses: ['lead', 'dans', 0.7],
  stadium: ['lead', 'stade', 0.9],
  exit: ['gain', 'sort', 0.35],
  gained: ['gain', 'prend', 0.75],
  lastCorner: ['loss', 'dernier', 0.6],
  proofExit: ['proof', 'sortie', 0.55],
  sectorOne: ['sectors', 'premier', 0.15],
  sectorsTwo: ['sectors', 'deux', 0.35],
  topSpeed: ['sectors', 'pointe', 0.6],
} as const satisfies Record<string, CueSpec<PoleBeat>>;
export type PoleCue = keyof typeof CUES;

export interface PoleStory extends Timeline<PoleBeat, PoleSceneKind, PoleCue> {
  /** When each driver of the grid comes up, by classification index */
  named: number[];
}

export function buildPole(narration: PoleNarration, drivers: PoleDriver[], lang: Lang, voiceover: Voiceover | null, fps = 60): PoleStory {
  const timeline = buildTimeline(POLE_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
  const grid = timeline.beats.grid;
  // Named from the back of the top six to pole, evenly through the line without a recording
  const named = drivers.map((d, i) => cueIn(grid, normalise(d.name), (drivers.length - i) / (drivers.length + 1)));
  return { ...timeline, named };
}
