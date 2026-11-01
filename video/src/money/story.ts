// L'argent de la F1: a team's accounts told beat by beat (kit/timeline.ts),
// one scene per beat. The script is written per team, its figures checked
// against the accounts (accounts.test.ts).
import type { Lang } from '../i18n';
import { buildTimeline, type CueSpec, type Timeline } from '../kit/timeline';
import type { Voiceover } from '../voice';

export const MONEY_BEATS = ['hook', 'revenue', 'losses', 'campus', 'debt', 'staff', 'points', 'season', 'proof', 'end'] as const;
export type MoneyBeat = (typeof MONEY_BEATS)[number];
/** The script (narration/money-<team>.<lang>.json): a line per beat */
export type MoneyNarration = Record<MoneyBeat, string>;

const SCENE_OF = Object.fromEntries(MONEY_BEATS.map(beat => [beat, beat])) as Record<MoneyBeat, MoneyBeat>;

const CUES = {
  spent: ['hook', 'quatre', 0.3],
  points: ['hook', 'points', 0.85],
  revenue: ['revenue', 'trois', 0.25],
  double: ['revenue', 'double', 0.6],
  losses: ['losses', 'quatre', 0.45],
  lossTotal: ['losses', 'total', 0.9],
  tunnel: ['campus', 'soufflerie', 0.55],
  facilities: ['campus', 'installations', 0.95],
  loans: ['debt', 'emprunts', 0.3],
  interest: ['debt', 'interets', 0.5],
  operating: ['debt', 'perte', 0.85],
  staff: ['staff', 'salaries', 0.25],
  payroll: ['staff', 'masse', 0.6],
  firstPoint: ['points', 'million', 0.5],
  lastPoint: ['points', 'virgule', 0.8],
  standing: ['season', 'sept', 0.6],
  accounts: ['proof', 'comptes', 0.5],
} as const satisfies Record<string, CueSpec<MoneyBeat>>;
export type MoneyCue = keyof typeof CUES;

export type MoneyStory = Timeline<MoneyBeat, MoneyBeat, MoneyCue>;

export const buildMoney = (narration: MoneyNarration, lang: Lang, voiceover: Voiceover | null, fps = 60): MoneyStory =>
  buildTimeline(MONEY_BEATS, SCENE_OF, narration, CUES, lang, voiceover, fps);
