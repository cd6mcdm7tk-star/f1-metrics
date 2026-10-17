// The mascot's face as numbers: each expression and each mouth shape, so a
// line of the script can be played as the donkey saying it.

/** Mouth shapes from Rhubarb Lip Sync: A closed (M, B, P), B teeth (K, S, T,
 * EE), C open (EH), D wide (AA), E round (AO), F puckered (OO, W), G F/V,
 * H tongue (L), X at rest */
export type Viseme = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';
export type Mouth = Viseme | 'grin';

export interface MouthShape {
  width: number;
  /** 0 for closed lips */
  height: number;
  round: boolean;
  teeth: 'none' | 'upper' | 'both';
  tongue: boolean;
}

export const MOUTHS: Record<Mouth, MouthShape> = {
  A: { width: 70, height: 0, round: false, teeth: 'none', tongue: false },
  B: { width: 78, height: 18, round: false, teeth: 'both', tongue: false },
  C: { width: 84, height: 32, round: false, teeth: 'upper', tongue: false },
  D: { width: 92, height: 54, round: false, teeth: 'upper', tongue: true },
  E: { width: 62, height: 42, round: true, teeth: 'none', tongue: false },
  F: { width: 36, height: 30, round: true, teeth: 'none', tongue: false },
  G: { width: 72, height: 14, round: false, teeth: 'upper', tongue: false },
  H: { width: 80, height: 38, round: false, teeth: 'upper', tongue: true },
  X: { width: 96, height: 0, round: false, teeth: 'none', tongue: false },
  grin: { width: 108, height: 26, round: false, teeth: 'both', tongue: false },
};

export type Expression = 'neutral' | 'surprised' | 'ironic' | 'disappointed' | 'pleased' | 'focused';

/** [viewer's left, viewer's right] */
export type Pair = [number, number];

export interface Face {
  /** Degrees out from upright */
  ears: Pair;
  /** Upper lids, 0 open → 1 shut */
  lids: Pair;
  /** Degrees, inner corner up (sad) or down (determined) */
  lidTilt: Pair;
  /** Lower lids pushed up by a smile, 0 → 1 */
  lower: Pair;
  /** -1 → 1 */
  browLift: Pair;
  /** Degrees, inner end up */
  browTilt: Pair;
  /** Mouth corners, -1 down → 1 up */
  corners: Pair;
  /** Head tilt, degrees clockwise */
  tilt: number;
  /** The mouth when not speaking */
  rest: Mouth;
}

export const FACES: Record<Expression, Face> = {
  neutral: {
    ears: [18, 18], lids: [0.06, 0.06], lidTilt: [0, 0], lower: [0, 0],
    browLift: [0, 0], browTilt: [0, 0], corners: [0.3, 0.3], tilt: 0, rest: 'X',
  },
  surprised: {
    ears: [4, 4], lids: [0, 0], lidTilt: [0, 0], lower: [0, 0],
    browLift: [1, 1], browTilt: [4, 4], corners: [0, 0], tilt: -3, rest: 'E',
  },
  ironic: {
    ears: [14, 128], lids: [0.06, 0.5], lidTilt: [0, -6], lower: [0, 0.2],
    browLift: [0.9, -0.3], browTilt: [-6, 0], corners: [-0.2, 0.9], tilt: 6, rest: 'X',
  },
  disappointed: {
    ears: [132, 132], lids: [0.46, 0.46], lidTilt: [14, 14], lower: [0, 0],
    browLift: [0.3, 0.3], browTilt: [18, 18], corners: [-0.7, -0.7], tilt: -4, rest: 'X',
  },
  pleased: {
    ears: [24, 24], lids: [0.1, 0.1], lidTilt: [0, 0], lower: [0.5, 0.5],
    browLift: [0.4, 0.4], browTilt: [4, 4], corners: [1, 1], tilt: 3, rest: 'grin',
  },
  focused: {
    ears: [8, 8], lids: [0.24, 0.24], lidTilt: [-5, -5], lower: [0.1, 0.1],
    browLift: [-0.25, -0.25], browTilt: [-7, -7], corners: [0, 0], tilt: 0, rest: 'A',
  },
};

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixPair = (a: Pair, b: Pair, t: number): Pair => [mix(a[0], b[0], t), mix(a[1], b[1], t)];

/** From face `a` to face `b`; the mouth at rest switches halfway */
export function blendFaces(a: Face, b: Face, t: number): Face {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    ears: mixPair(a.ears, b.ears, t),
    lids: mixPair(a.lids, b.lids, t),
    lidTilt: mixPair(a.lidTilt, b.lidTilt, t),
    lower: mixPair(a.lower, b.lower, t),
    browLift: mixPair(a.browLift, b.browLift, t),
    browTilt: mixPair(a.browTilt, b.browTilt, t),
    corners: mixPair(a.corners, b.corners, t),
    tilt: mix(a.tilt, b.tilt, t),
    rest: t < 0.5 ? a.rest : b.rest,
  };
}

/** An open mouth's outline around (cx, cy) as an SVG path, with where its
 * top and bottom edges are; null for closed lips */
export function mouthOutline(shape: MouthShape, cx: number, cy: number): { d: string; top: number; bottom: number } | null {
  const { width: w, height: h } = shape;
  if (h <= 0) return null;
  if (shape.round) {
    const rx = w / 2, ry = h / 2, mid = cy + h * 0.25;
    return {
      d: `M ${cx - rx} ${mid} A ${rx} ${ry} 0 1 0 ${cx + rx} ${mid} A ${rx} ${ry} 0 1 0 ${cx - rx} ${mid} Z`,
      top: mid - ry,
      bottom: mid + ry,
    };
  }
  // A cubic reaches 3/4 of its control points' offset
  const top = cy - h * 0.25, bottom = cy + h * 0.75;
  const up = cy - (cy - top) / 0.75, down = cy + (bottom - cy) / 0.75;
  return {
    d: `M ${cx - w / 2} ${cy} C ${cx - w / 2} ${up} ${cx + w / 2} ${up} ${cx + w / 2} ${cy} C ${cx + w / 2} ${down} ${cx - w / 2} ${down} ${cx - w / 2} ${cy} Z`,
    top,
    bottom,
  };
}
