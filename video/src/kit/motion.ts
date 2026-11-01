// Easing and timing shared by every scene.
import { Easing, interpolate } from 'remotion';

export const EASE_IN_OUT = Easing.inOut(Easing.cubic);
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 from frame `from` to `to`, eased, held either side */
export const ramp = (frame: number, from: number, to: number, easing = EASE_IN_OUT): number =>
  interpolate(frame, [from, Math.max(from + 1, to)], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing });

/** A video's opening lands by this frame, so the first frame, which TikTok
 * shows as the cover, already reads: a Slam's or a chip's `at` */
export const OPENING = -2;

/** An opening's title, on screen from the first frame and settling from a little bigger: its scale */
export const landing = (frame: number): number => 1 + 0.12 * (1 - ramp(frame, 0, 20, EASE_OUT));

/** A word of an opening's title, lit up as the voice says it (`said`, 0 to 1): dimmed but legible before */
export const lit = (said: number): number => 0.4 + 0.6 * said;

/** The scale of something already on screen, bumping as the voice names it at frame `at` */
export const pulse = (frame: number, at: number): number => 1 + 0.08 * Math.sin(Math.PI * Math.min(1, Math.max(0, (frame - at) / 18)));
