// A virtual camera over the site's page, like a screen recording that zooms
// in on what matters. Shots frame a rectangle of the page; the camera eases
// from one shot to the next.
import { VIDEO } from './format';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** The page point at the centre of the screen, and the zoom */
export interface Camera {
  x: number;
  y: number;
  scale: number;
}

export interface Shot {
  /** Frame the camera starts moving to this shot */
  from: number;
  /** Frames the move takes */
  blend: number;
  camera: (frame: number) => Camera;
}

const easeInOut = (t: number): number => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);

/** The camera that shows `rect` as large as fits inside the screen area
 * `focus`, centred or at its top */
export function fit(rect: Rect, focus: Rect, align: 'center' | 'top' = 'center'): Camera {
  const scale = Math.min(focus.w / rect.w, focus.h / rect.h);
  const screenY = align === 'top' ? focus.y + (rect.h * scale) / 2 : focus.y + focus.h / 2;
  return {
    x: rect.x + rect.w / 2 + (VIDEO.width / 2 - (focus.x + focus.w / 2)) / scale,
    y: rect.y + rect.h / 2 + (VIDEO.height / 2 - screenY) / scale,
    scale,
  };
}

/** From `a` to `b`. The zoom moves geometrically, so 1× → 4× feels even. */
export function blend(a: Camera, b: Camera, t: number): Camera {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    scale: a.scale * (b.scale / a.scale) ** t,
  };
}

/** Where the camera is at `frame`, easing into each shot from the one before */
export function cameraAt(shots: Shot[], frame: number): Camera {
  let i = shots.length - 1;
  while (i > 0 && shots[i].from > frame) i--;
  const current = shots[i].camera(frame);
  const t = (frame - shots[i].from) / shots[i].blend;
  if (i === 0 || t >= 1) return current;
  return blend(cameraAt(shots.slice(0, i), frame), current, easeInOut(Math.max(0, t)));
}

/** CSS transform that puts the page under the camera */
export const cameraTransform = ({ x, y, scale }: Camera): string =>
  `translate(${VIDEO.width / 2 - x * scale}px, ${VIDEO.height / 2 - y * scale}px) scale(${scale})`;

export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));
