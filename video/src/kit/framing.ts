// The camera over the new series' scenes: it reframes as each sentence of the
// voice starts, closer in on one and wider on the next, and drifts in slowly
// in between, so the picture keeps moving while a chart holds still. Frames
// at 60 fps.
import type { CSSProperties } from 'react';
import { SAFE } from '../format';
import type { VoiceLine } from '../voice';
import { EASE_OUT } from './motion';

export interface Framing {
  /** Zoom about the safe area's centre */
  scale: number;
  /** Sideways shift (px) */
  x: number;
}

export const STILL: Framing = { scale: 1, x: 0 };

/** A timeline's scenes and the lines said over them */
export interface Scenes {
  scenes: { from: number; to: number }[];
  voice: Pick<VoiceLine, 'from' | 'said'>[];
}

/** The framings sentences take in turn: wide, close on one side, a little wider, close on the other */
const FRAMINGS: Framing[] = [{ scale: 1, x: 0 }, { scale: 1.05, x: -12 }, { scale: 1.02, x: 8 }, { scale: 1.055, x: 10 }];
/** Zoom gained a second while a sentence is said, and at most */
const DRIFT = 0.005;
const MAX_DRIFT = 0.025;
/** The camera zooms about the middle of the safe area, where the content is */
const ORIGIN = `${(SAFE.left + SAFE.right) / 2}px ${(SAFE.top + SAFE.bottom) / 2}px`;
/** A reframe takes this long, and comes this long after the last one at least */
const REFRAME = 14;
const SPACING = 90;

/** A word that ends a sentence, or a clause before a colon */
const closes = (word: string) => /[.?!…:]$/.test(word);

/** When the camera reframes in the scene at `frame`: as the scene starts, then
 * as each sentence said in it starts, but the first */
export function reframes({ scenes, voice }: Scenes, frame: number): number[] {
  const scene = scenes.find(s => frame >= s.from && frame < s.to) ?? scenes[scenes.length - 1];
  const starts = [scene.from];
  for (const line of voice) {
    if (line.from < scene.from || line.from >= scene.to) continue;
    line.said.forEach((word, i) => {
      if ((i === 0 || closes(line.said[i - 1].word)) && word.start - starts[starts.length - 1] >= SPACING) starts.push(word.start);
    });
  }
  return starts;
}

/** The framing at `frame`, the camera having reframed at `starts` */
export function framingAt(starts: number[], frame: number, fps: number): Framing {
  let current = 0;
  while (current + 1 < starts.length && starts[current + 1] <= frame) current++;
  const held = (i: number, at: number): Framing => {
    const { scale, x } = FRAMINGS[i % FRAMINGS.length];
    return { scale: scale + Math.min(MAX_DRIFT, (DRIFT * Math.max(0, at - starts[i])) / fps), x };
  };
  const now = held(current, frame);
  if (current === 0) return now;
  const before = held(current - 1, starts[current]);
  const t = EASE_OUT(Math.min(1, (frame - starts[current]) / REFRAME));
  return { scale: before.scale + (now.scale - before.scale) * t, x: before.x + (now.x - before.x) * t };
}

/** The style that frames a full-screen layer, and the one that undoes it on a layer inside */
export const framed = ({ scale, x }: Framing): CSSProperties => ({ transform: `translateX(${x}px) scale(${scale})`, transformOrigin: ORIGIN });
export const unframed = ({ scale, x }: Framing): CSSProperties => ({ transform: `scale(${1 / scale}) translateX(${-x}px)`, transformOrigin: ORIGIN });
