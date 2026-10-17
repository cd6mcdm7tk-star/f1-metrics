// The mascot alive: what its mouth, eyes, ears and head do at each frame,
// from the line it says and the expressions written into it. Everything is
// worked out from the frame number, so every render moves the same way.
import type { VoiceLine } from '../voice';
import { blendFaces, FACES, type Face, type Mouth, type Pair, type Viseme } from './face';
import type { MoodAt } from './script';

/** A fixed pseudo-random value in [0, 1) for each `n` */
export const noise = (n: number, seed = 0): number => {
  const x = Math.sin(n * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** The voice's mouth shape at `frame`, X (at rest) between cues */
export function visemeAt(mouth: VoiceLine['mouth'], frame: number): Viseme {
  return mouth.find(c => frame >= c.from && frame < c.to)?.value ?? 'X';
}

const OPENNESS: Record<Viseme, number> = { A: 0, B: 0.3, C: 0.6, D: 1, E: 0.5, F: 0.3, G: 0.2, H: 0.6, X: 0 };

/** How much the mouth has moved over the last `window` frames, 0 → 1 */
export function talkEnergy(mouth: VoiceLine['mouth'], frame: number, window = 10): number {
  let sum = 0;
  for (let f = frame - window + 1; f <= frame; f++) sum += OPENNESS[visemeAt(mouth, f)];
  return sum / window;
}

// A blink at 60 fps: shut in 3 frames, held 2, open again in 5
const BLINK = [0.45, 0.85, 1, 1, 1, 0.8, 0.6, 0.4, 0.2, 0.06];

/** Eyelids from blinking, 0 open → 1 shut: a blink every 2.5 to 5 seconds */
export function blinkAt(frame: number, fps: number, seed = 0): number {
  let start = Math.round(fps * 0.8);
  for (let k = 0; start <= frame; k++) {
    const step = Math.floor(((frame - start) * 60) / fps);
    if (step < BLINK.length) return BLINK[step];
    start += Math.round(fps * (2.5 + noise(k, seed) * 2.5));
  }
  return 0;
}

/** An ear twitching now and then, degrees outwards on top of the expression */
export function earFlick(frame: number, fps: number, seed = 0): Pair {
  let start = Math.round(fps * 1.6);
  for (let k = 0; start <= frame; k++) {
    const t = (frame - start) / fps;
    if (t < 0.4) {
      const amount = Math.sin((t / 0.4) * Math.PI) * 14;
      return noise(k, seed + 1) < 0.5 ? [amount, 0] : [0, amount];
    }
    start += Math.round(fps * (3 + noise(k, seed + 2) * 4));
  }
  return [0, 0];
}

/** Where the eyes look, -1 → 1: at the viewer, glancing aside every second or two */
export function lookAt(frame: number, fps: number, seed = 0): { x: number; y: number } {
  const target = (k: number) => (k % 3 === 0 ? { x: 0, y: 0 } : { x: (noise(k, seed + 3) - 0.5) * 0.6, y: (noise(k, seed + 4) - 0.5) * 0.3 });
  let start = 0, k = 0;
  for (let next = Math.round(fps * 1.2); next <= frame; k++, next += Math.round(fps * (1.2 + noise(k, seed + 5) * 1.6))) start = next;
  const from = k > 0 ? target(k - 1) : target(0), to = target(k);
  const t = Math.min(1, (frame - start) / (fps * 0.07));
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

/** The head's slow sway and its bob with the voice: tilt in degrees, nod in pixels down */
export function headMotion(frame: number, fps: number, energy: number): { tilt: number; nod: number } {
  const s = frame / fps;
  return {
    tilt: 1.4 * Math.sin(s * 2 * Math.PI * 0.21) + 0.6 * Math.sin(s * 2 * Math.PI * 0.53 + 1.3),
    nod: 2.5 * Math.sin(s * 2 * Math.PI * 0.37) + energy * 7,
  };
}

const ease = (t: number) => 1 - (1 - t) ** 3;

/** The face at `frame`, easing over `blend` frames from the one before */
export function faceAt(moods: MoodAt[], frame: number, blend: number): Face {
  let i = -1;
  for (let k = 0; k < moods.length && moods[k].from <= frame; k++) i = k;
  if (i < 0) return FACES.neutral;
  const before = faceAt(moods.slice(0, i), moods[i].from, blend);
  return blendFaces(before, FACES[moods[i].expression], ease(Math.min(1, (frame - moods[i].from) / blend)));
}

export interface Pose {
  face: Face;
  mouth: Mouth;
  blink: number;
  look: { x: number; y: number };
  nod: number;
}

/** Everything the mascot does at `frame` while saying `lines` */
export function poseAt(lines: VoiceLine[], frame: number, fps: number): Pose {
  const mouth = lines.flatMap(line => line.mouth);
  const expression = faceAt(lines.flatMap(line => line.moods), frame, Math.round(fps * 0.2));
  const motion = headMotion(frame, fps, talkEnergy(mouth, frame));
  const flick = earFlick(frame, fps);
  const viseme = visemeAt(mouth, frame);
  return {
    face: { ...expression, tilt: expression.tilt + motion.tilt, ears: [expression.ears[0] + flick[0], expression.ears[1] + flick[1]] },
    mouth: viseme === 'X' ? expression.rest : viseme,
    blink: blinkAt(frame, fps),
    look: lookAt(frame, fps),
    nod: motion.nod,
  };
}
