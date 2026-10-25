// A right-angle corner, drawn to explain the racing line: the road, the line
// through its middle, and the line that uses all of it, outside – apex –
// outside, on the largest circle that fits. In metres, y up, with the corner's
// centre at the origin: the road comes up from below and turns right, or left
// when mirrored.

export interface Point {
  x: number;
  y: number;
}

export interface CornerGeometry {
  /** Inner and outer edge radii, and the middle line's */
  inner: number;
  outer: number;
  middle: number;
  /** How far the straights run from the corner */
  reach: number;
  line: {
    radius: number;
    centre: Point;
    /** Where the car turns in, touches the apex and reaches the exit */
    turnIn: Point;
    apex: Point;
    exit: Point;
    /** The line's distance from the edges: half a car */
    margin: number;
  };
}

export function cornerGeometry(inner: number, width: number, margin: number, reach: number): CornerGeometry {
  const outer = inner + width;
  // Tangent to both outer edges, a margin in, touching the apex a margin off the inner edge
  const o = outer - margin, i = inner + margin;
  const radius = (o * Math.SQRT2 - i) / (Math.SQRT2 - 1);
  return {
    inner, outer, middle: inner + width / 2, reach,
    line: {
      radius,
      centre: { x: radius - o, y: o - radius },
      turnIn: { x: -o, y: o - radius },
      apex: { x: -i / Math.SQRT2, y: i / Math.SQRT2 },
      exit: { x: radius - o, y: o },
      margin,
    },
  };
}

/** Points along an arc of `radius` around `centre`, from `a0` to `a1` (degrees) */
export function arcPoints(centre: Point, radius: number, a0: number, a1: number, steps = 48): Point[] {
  return Array.from({ length: steps + 1 }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / steps) * Math.PI) / 180;
    return { x: centre.x + radius * Math.cos(a), y: centre.y + radius * Math.sin(a) };
  });
}

/** A line round the corner at `r` from its centre: up the approach, round, out along the exit */
export const lineAt = (r: number, reach: number): Point[] =>
  [{ x: -r, y: -reach }, ...arcPoints({ x: 0, y: 0 }, r, 180, 90), { x: reach, y: r }];

/** The racing line: along the outside, on its circle from turn-in to exit, along the outside again */
export function racingLine(g: CornerGeometry): Point[] {
  const o = g.outer - g.line.margin;
  return [{ x: -o, y: -g.reach }, ...arcPoints(g.line.centre, g.line.radius, 180, 90), { x: g.reach, y: o }];
}

/** The first `fraction` of a polyline, by length */
export function partOf(points: Point[], fraction: number): Point[] {
  if (fraction >= 1) return points;
  if (fraction <= 0) return points.slice(0, 1);
  const lengths = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let left = lengths.reduce((a, b) => a + b, 0) * fraction;
  const part = [points[0]];
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i]) {
      const t = left / lengths[i];
      part.push({ x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t });
      return part;
    }
    left -= lengths[i];
    part.push(points[i + 1]);
  }
  return part;
}

/** Where a polyline is after `fraction` of its length, and which way it runs (radians) */
export function alongLine(points: Point[], fraction: number): Point & { heading: number } {
  const part = partOf(points, Math.max(0.001, Math.min(1, fraction)));
  const end = part[part.length - 1], before = part[part.length - 2] ?? points[0];
  return { ...end, heading: Math.atan2(end.y - before.y, end.x - before.x) };
}

/** How far along a polyline (0 to 1) its point nearest `p` is */
export function fractionAt(points: Point[], p: Point): number {
  const lengths = points.slice(1).map((q, i) => Math.hypot(q.x - points[i].x, q.y - points[i].y));
  const total = lengths.reduce((a, b) => a + b, 0);
  let best = 0, bestDistance = Infinity, run = 0;
  points.forEach((q, i) => {
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestDistance) { bestDistance = d; best = run; }
    run += lengths[i] ?? 0;
  });
  return best / total;
}
