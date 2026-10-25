// A perspective camera over the ground plane, drawn as flat SVG: points are
// projected here so lines keep their weight, labels face the viewer, and the
// same scene can be filmed from above (2D) or from a low angle (3D).
// World axes: x east, y north, z up, in metres.

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Camera3D {
  eye: Vec3;
  target: Vec3;
  /** Vertical field of view (degrees) */
  fov: number;
  /** Screen up, as a world direction; z up unless the camera looks straight down */
  up?: Vec3;
  /** Moves the picture on screen without turning the camera (px), like a shift lens */
  shift?: { x: number; y: number };
}

export interface Projected {
  x: number;
  y: number;
  /** Distance in front of the camera (m) */
  depth: number;
  /** Screen pixels per metre at that depth */
  scale: number;
}

export interface Viewport {
  width: number;
  height: number;
}

/** Nothing closer than this is drawn (m) */
export const NEAR = 1;

const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Vec3, b: Vec3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec3, b: Vec3): Vec3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const normalize = (a: Vec3): Vec3 => {
  const length = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / length, y: a.y / length, z: a.z / length };
};

/** The camera `distance` metres from `target`, looking along `heading`
 * (radians from east, counter-clockwise) and `pitch` below the horizon
 * (radians: 0 level, π/2 straight down) */
export function orbit(target: Vec3, distance: number, heading: number, pitch: number, fov = 40): Camera3D {
  const ahead = { x: Math.cos(heading), y: Math.sin(heading), z: 0 };
  const eye = {
    x: target.x - distance * Math.cos(pitch) * ahead.x,
    y: target.y - distance * Math.cos(pitch) * ahead.y,
    z: target.z + distance * Math.sin(pitch),
  };
  // The camera's own up, defined at every pitch, straight down included
  const up = { x: Math.sin(pitch) * ahead.x, y: Math.sin(pitch) * ahead.y, z: Math.cos(pitch) };
  return { eye, target, fov, up };
}

/** The camera's axes and focal length, for many projections in a row */
export function projector(camera: Camera3D, viewport: Viewport) {
  const forward = normalize(sub(camera.target, camera.eye));
  const right = normalize(cross(forward, camera.up ?? { x: 0, y: 0, z: 1 }));
  const up = cross(right, forward);
  const focal = viewport.height / 2 / Math.tan((camera.fov * Math.PI) / 360);

  /** In camera space: x right, y up, z ahead */
  const toCamera = (p: Vec3): Vec3 => {
    const d = sub(p, camera.eye);
    return { x: dot(d, right), y: dot(d, up), z: dot(d, forward) };
  };
  const centre = { x: viewport.width / 2 + (camera.shift?.x ?? 0), y: viewport.height / 2 + (camera.shift?.y ?? 0) };
  const toScreen = (c: Vec3): Projected => ({
    x: centre.x + (c.x * focal) / c.z,
    y: centre.y - (c.y * focal) / c.z,
    depth: c.z,
    scale: focal / c.z,
  });

  return {
    /** Where a point lands on screen, or null behind the camera */
    point(p: Vec3): Projected | null {
      const c = toCamera(p);
      return c.z < NEAR ? null : toScreen(c);
    },
    /** A segment's visible part, cut at the near plane */
    segment(a: Vec3, b: Vec3): [Projected, Projected] | null {
      let ca = toCamera(a), cb = toCamera(b);
      if (ca.z < NEAR && cb.z < NEAR) return null;
      const cut = (inside: Vec3, outside: Vec3): Vec3 => {
        const t = (NEAR - inside.z) / (outside.z - inside.z);
        return { x: inside.x + (outside.x - inside.x) * t, y: inside.y + (outside.y - inside.y) * t, z: NEAR };
      };
      if (ca.z < NEAR) ca = cut(cb, ca);
      else if (cb.z < NEAR) cb = cut(ca, cb);
      return [toScreen(ca), toScreen(cb)];
    },
  };
}

/** The orbit camera, looking along `heading` at `pitch`, that shows all of
 * `points` as large as fits in the screen rectangle `rect` */
export function fitCamera(
  points: Vec3[], heading: number, pitch: number, fov: number,
  rect: { x: number; y: number; w: number; h: number }, viewport: Viewport,
): Camera3D {
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const target = { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2, z: 0 };
  let distance = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) * 2;
  let bounds = { x0: 0, x1: 0, y0: 0, y1: 0 };
  // Perspective isn't linear in the distance: a few rounds settle it
  for (let round = 0; round < 8; round++) {
    const project = projector(orbit(target, distance, heading, pitch, fov), viewport);
    const shown = points.map(p => project.point(p)).filter((p): p is Projected => p !== null);
    bounds = {
      x0: Math.min(...shown.map(p => p.x)), x1: Math.max(...shown.map(p => p.x)),
      y0: Math.min(...shown.map(p => p.y)), y1: Math.max(...shown.map(p => p.y)),
    };
    distance *= Math.max((bounds.x1 - bounds.x0) / rect.w, (bounds.y1 - bounds.y0) / rect.h);
  }
  const shift = { x: rect.x + rect.w / 2 - (bounds.x0 + bounds.x1) / 2, y: rect.y + rect.h / 2 - (bounds.y0 + bounds.y1) / 2 };
  return { ...orbit(target, distance, heading, pitch, fov), shift };
}

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixVec = (a: Vec3, b: Vec3, t: number): Vec3 => ({ x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), z: mix(a.z, b.z, t) });

/** From camera `a` to camera `b`: the eye and what it looks at travel in a straight line */
export function blendCamera(a: Camera3D, b: Camera3D, t: number): Camera3D {
  const up = { x: 0, y: 0, z: 1 };
  const shiftA = a.shift ?? { x: 0, y: 0 }, shiftB = b.shift ?? { x: 0, y: 0 };
  return {
    eye: mixVec(a.eye, b.eye, t),
    target: mixVec(a.target, b.target, t),
    fov: mix(a.fov, b.fov, t),
    up: mixVec(a.up ?? up, b.up ?? up, t),
    shift: { x: mix(shiftA.x, shiftB.x, t), y: mix(shiftA.y, shiftB.y, t) },
  };
}

/** From angle `a` to `b` (radians) the short way round */
export function mixAngle(a: number, b: number, t: number): number {
  const turn = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + turn * t;
}
