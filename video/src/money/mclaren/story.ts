// McLaren's money episode told beat by beat (kit/timeline.ts), one scene per
// beat: the double champions in the red, back to the 2020 rescue, the
// revenue that tripled, the bonuses behind the loss, the price of a point.
import type { Lang } from '../../i18n';
import { buildTimeline, type CueSpec, type Timeline } from '../../kit/timeline';
import type { Voiceover } from '../../voice';

export const MCLAREN_BEATS = ['hook', 'rescue', 'revenue', 'bonuses', 'payout', 'points', 'season', 'proof', 'end'] as const;
export type McLarenBeat = (typeof MCLAREN_BEATS)[number];
/** The script (narration/money-mclaren.<lang>.json): a line per beat */
export type McLarenNarration = Record<McLarenBeat, string>;

const SCENE_OF = Object.fromEntries(MCLAREN_BEATS.map(beat => [beat, beat])) as Record<McLarenBeat, McLarenBeat>;

const CUES = {
  titles: ['hook', 'titre', 0.3],
  driver: ['hook', 'norris', 0.55],
  lost: ['hook', 'perd', 0.85],
  covid: ['rescue', 'covid', 0.12],
  furlough: ['rescue', 'chomage', 0.18],
  pay: ['rescue', 'salaires', 0.25],
  heritage: ['rescue', 'legende', 0.55],
  investors: ['rescue', 'investisseurs', 0.8],
  revenue: ['revenue', 'revenus', 0.3],
  tripled: ['revenue', 'triple', 0.45],
  bonuses: ['bonuses', 'primes', 0.4],
  without: ['bonuses', 'sans', 0.75],
  buyout: ['payout', 'rachete', 0.2],
  directors: ['payout', 'dirigeants', 0.45],
  topEarner: ['payout', 'mieux', 0.65],
  profit: ['payout', 'benefice', 0.9],
  ourPoint: ['points', 'huit', 0.5],
  theirPoint: ['points', 'quatre', 0.85],
  standing: ['season', 'quatriemes', 0.5],
  accounts: ['proof', 'comptes', 0.5],
} as const satisfies Record<string, CueSpec<McLarenBeat>>;
export type McLarenCue = keyof typeof CUES;

export type McLarenStory = Timeline<McLarenBeat, McLarenBeat, McLarenCue>;

export const buildMcLaren = (narration: McLarenNarration, lang: Lang, voiceover: Voiceover | null, fps = 60): McLarenStory =>
  buildTimeline(MCLAREN_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
