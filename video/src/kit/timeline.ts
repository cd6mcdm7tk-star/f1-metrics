// A video told beat by beat: one line of the script per beat, back to back;
// each scene lasts as long as its beats take to say, and the animations wait
// for the words that name what they draw. Frames at 60 fps.
import type { Lang } from '../i18n';
import { toVoiceLine, type Voiceover, type VoiceLine } from '../voice';
import { cueTime } from '../words';

/** A cue: its beat, the word that triggers it, and where in the line it falls without a recording */
export type CueSpec<Beat extends string> = readonly [Beat, string, number];

export interface Timeline<Beat extends string, Scene extends string, Cue extends string> {
  frames: number;
  voice: VoiceLine[];
  beats: Record<Beat, VoiceLine>;
  scenes: { kind: Scene; from: number; to: number }[];
  /** The frames the animations wait for: when the voice names what they draw */
  cues: Record<Cue, number>;
}

/** Between two lines, and longer where the scene changes: the swipe's length */
const GAP = 8;
const CUT = 18;
/** Before the first line, and after the last one for the closing card, by default */
const LEAD = 8;
const TAIL = 100;
/** TikTok only pays for videos over a minute: a shorter script holds its closing card longer (s) */
const MIN_SECONDS = 61;

/** When a word starting with `word` is said in `line`, or `fallback` of the way through it */
export const cueIn = (line: VoiceLine, word: string, fallback: number): number =>
  cueTime(line.said, [word]) ?? Math.round(line.from + (line.to - line.from) * fallback);

export function buildTimeline<Beat extends string, Scene extends string, Cue extends string>(
  order: readonly Beat[], sceneOf: Record<Beat, Scene>, script: Record<Beat, string>, cues: Record<Cue, CueSpec<Beat>>,
  lang: Lang, voiceover: Voiceover | null, fps = 60, tail = TAIL,
): Timeline<Beat, Scene, Cue> {
  let at = LEAD;
  const beats = {} as Record<Beat, VoiceLine>;
  order.forEach((beat, i) => {
    if (i > 0) at += sceneOf[beat] === sceneOf[order[i - 1]] ? GAP : CUT;
    beats[beat] = toVoiceLine(script[beat], at, lang, fps, voiceover);
    at = beats[beat].to;
  });
  const frames = Math.max(at + tail, MIN_SECONDS * fps);

  const scenes: Timeline<Beat, Scene, Cue>['scenes'] = [];
  order.forEach((beat, i) => {
    const kind = sceneOf[beat];
    if (scenes.length && scenes[scenes.length - 1].kind === kind) return;
    const from = i === 0 ? 0 : beats[beat].from - Math.round(CUT / 2);
    if (scenes.length) scenes[scenes.length - 1].to = from;
    scenes.push({ kind, from, to: frames });
  });

  const frameOf = Object.fromEntries(
    (Object.entries(cues) as [Cue, CueSpec<Beat>][]).map(([name, [beat, word, fallback]]) => [name, cueIn(beats[beat], word, fallback)]),
  ) as Record<Cue, number>;

  return { frames, voice: order.map(beat => beats[beat]), beats, scenes, cues: frameOf };
}
