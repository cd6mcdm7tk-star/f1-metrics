// La Bible F1, episode 1: the apex, told beat by beat (kit/timeline.ts), and
// the figures it quotes from the lap.
import type { DuelQuery } from '../api';
import type { Lang } from '../i18n';
import { analyse } from '../duel/analysis';
import type { Duel } from '../duel/data';
import { cornerBraking, type CornerBraking } from '../kit/figures';
import { buildTimeline, type CueSpec, type Timeline } from '../kit/timeline';
import type { Voiceover } from '../voice';

/** The lap the episode tells: Austin 2025's pole against the runner-up */
export const CORDE_QUERY: DuelQuery = { year: 2025, gp: 19, session: 'Q', drivers: ['VER', 'NOR'] };

export const CORDE_BEATS = ['hook', 'context', 'braking', 'middle', 'line', 'circle', 'exit', 'proof', 'payoff', 'end'] as const;
export type CordeBeat = (typeof CORDE_BEATS)[number];
/** The script (narration/bible-01-corde.<lang>.json): a line per beat, and
 * the next episode's title for the closing card (*stars* mark a word) */
export type CordeNarration = Record<CordeBeat, string> & { next: string };

export type CordeSceneKind = 'fly' | 'schema' | 'proof' | 'payoff' | 'end';
const SCENE_OF: Record<CordeBeat, CordeSceneKind> = {
  hook: 'fly', context: 'fly', braking: 'fly',
  middle: 'schema', line: 'schema', circle: 'schema', exit: 'schema',
  proof: 'proof', payoff: 'payoff', end: 'end',
};

/** What the episode quotes, read from the pole lap against the runner-up's */
export interface CordeFacts {
  /** Turn 1's marker (m) */
  corner: number;
  pole: CornerBraking;
  rival: CornerBraking;
  /** Exit speed the pole lap has over the runner-up's, and where (km/h, m) */
  exitGain: number;
  exit: [number, number];
  /** Time the pole lap gains through turn 1, peak to peak, and over the lap (s) */
  cornerGap: number;
  poleGap: number;
}

export function cordeFacts(duel: Duel): CordeFacts {
  const corner = duel.telemetry.corners.find(c => c.number === 1)?.distance;
  const turn1 = analyse(duel).sections.flatMap(s => s.corners).find(c => c.label === 'T1');
  const exit = turn1?.findings.find(f => f.kind === 'exitSpeed' && f.side === 0);
  if (corner == null || !turn1 || exit?.kind !== 'exitSpeed') throw new Error('The apex episode needs a turn 1 won on the exit by the pole lap');
  return {
    corner,
    pole: cornerBraking(duel.telemetry, duel.order[0], corner),
    rival: cornerBraking(duel.telemetry, duel.order[1], corner),
    exitGain: exit.by,
    exit: [exit.from, exit.to],
    cornerGap: turn1.gapChange,
    poleGap: duel.drivers[1].lapTime - duel.drivers[0].lapTime,
  };
}

/** Each cue: its beat, the word that triggers it, and where in the line it falls without a recording */
const CUES = {
  middleLine: ['middle', 'milieu', 0.35],
  smallCircle: ['middle', 'petit', 0.55],
  slow: ['middle', 'ralentir', 0.9],
  outside: ['line', 'exterieur', 0.5],
  apex: ['line', 'corde', 0.72],
  out: ['line', 'ressortent', 0.85],
  bigCircle: ['circle', 'cercle', 0.25],
  faster: ['circle', 'vite', 0.5],
  radius: ['circle', 'rayon', 0.7],
  exit: ['exit', 'sortie', 0.3],
  throttle: ['exit', 'reaccelerer', 0.8],
  slowest: ['proof', 'lent', 0.4],
  exitGain: ['proof', 'sortie', 0.7],
  gain: ['payoff', 'quinze', 0.35],
  pole: ['payoff', 'pole', 0.65],
} as const satisfies Record<string, CueSpec<CordeBeat>>;
export type CordeCue = keyof typeof CUES;

export type CordeStory = Timeline<CordeBeat, CordeSceneKind, CordeCue>;

export const buildCorde = (narration: CordeNarration, lang: Lang, voiceover: Voiceover | null, fps = 60): CordeStory =>
  buildTimeline(CORDE_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
