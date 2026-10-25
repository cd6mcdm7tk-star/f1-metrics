import { useId, useMemo, type ReactNode } from 'react';
import { SAFE, VIDEO } from '../format';
import { DISPLAY, MONO } from '../theme';
import { INK, inkOn } from './ink';
import { projector, type Camera3D, type Projected } from './projection';
import { positionAt, stretch, type Track, type TrackPoint } from './track';

// The circuit on the ground, filmed by a perspective camera: the asphalt as a
// ribbon with fine edges, a floor grid for depth, stretches painted on the
// track, the car with its light trail, and labels that face the viewer.

export interface Paint {
  from: number;
  to: number;
  color: string;
  /** Lit from within, for what the voice is talking about */
  glow?: boolean;
}

export interface TrackLabel {
  distance: number;
  text: string;
  /** A second, smaller line */
  detail?: string;
  /** Which side of the track it sits on, seen along the lap */
  side?: 'left' | 'right';
}

export interface CarMark {
  distance: number;
  color: string;
  /** Metres of light trail behind it */
  trail?: number;
  /** A tag above it, the driver's code */
  tag?: string;
}

export interface Track3DProps {
  track: Track;
  camera: Camera3D;
  /** Ribbon width (m): about real in close shots, wider from far away */
  width?: number;
  paints?: Paint[];
  labels?: TrackLabel[];
  car?: CarMark;
  /** More cars, drawn after `car`: the last one on top */
  cars?: CarMark[];
  grid?: boolean;
  /** Marks across both edges every so many metres, which stream past a close camera */
  ticks?: number;
}

/** Grid spacing on the floor (m) */
const GRID = 100;
/** How far the grid reaches past the track (m) */
const GRID_MARGIN = 400;

type Project = ReturnType<typeof projector>;

/** Left and right edges of a stretch of track, `width` apart */
function edges(points: TrackPoint[], track: Track, width: number) {
  return points.map(p => {
    const { heading } = positionAt(track, p.distance);
    const nx = -Math.sin(heading) * (width / 2), ny = Math.cos(heading) * (width / 2);
    return { left: { x: p.x + nx, y: p.y + ny, z: 0 }, right: { x: p.x - nx, y: p.y - ny, z: 0 } };
  });
}

/** The ribbon as filled paths, one per run of points in front of the camera */
function ribbonPaths(points: TrackPoint[], track: Track, width: number, project: Project): string[] {
  const paths: string[] = [];
  let run: { left: Projected; right: Projected }[] = [];
  const flush = () => {
    if (run.length > 1) {
      const outline = [...run.map(r => r.left), ...run.map(r => r.right).reverse()];
      paths.push(`M${outline.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}Z`);
    }
    run = [];
  };
  for (const { left, right } of edges(points, track, width)) {
    const l = project.point(left), r = project.point(right);
    if (l && r) run.push({ left: l, right: r });
    else flush();
  }
  flush();
  return paths;
}

/** The ribbon's two edges as open lines */
function edgePaths(points: TrackPoint[], track: Track, width: number, project: Project): string[] {
  const sides = edges(points, track, width);
  return (['left', 'right'] as const).map(side => {
    let d = '', open = false;
    for (const e of sides) {
      const p = project.point(e[side]);
      if (!p) { open = false; continue; }
      d += `${open ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
      open = true;
    }
    return d;
  });
}

function FloorGrid({ track, project }: { track: Track; project: Project }) {
  const lines: ReactNode[] = [];
  const reach = { x: Math.ceil((track.half.x + GRID_MARGIN) / GRID) * GRID, y: Math.ceil((track.half.y + GRID_MARGIN) / GRID) * GRID };
  const draw = (a: { x: number; y: number }, b: { x: number; y: number }, key: string) => {
    const s = project.segment({ ...a, z: 0 }, { ...b, z: 0 });
    if (!s) return;
    // Fades with distance, like the far end of a lit floor
    const opacity = Math.min(1, 900 / ((s[0].depth + s[1].depth) / 2));
    lines.push(<line key={key} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y} stroke={INK.grid} strokeOpacity={opacity} strokeWidth={1.5} />);
  };
  for (let x = -reach.x; x <= reach.x; x += GRID) {
    for (let y = -reach.y; y < reach.y; y += GRID) draw({ x, y }, { x, y: y + GRID }, `v${x},${y}`);
  }
  for (let y = -reach.y; y <= reach.y; y += GRID) {
    for (let x = -reach.x; x < reach.x; x += GRID) draw({ x, y }, { x: x + GRID, y }, `h${x},${y}`);
  }
  return <g>{lines}</g>;
}

function Ticks({ track, width, every, project }: { track: Track; width: number; every: number; project: Project }) {
  const marks: ReactNode[] = [];
  for (let d = every; d < track.length; d += every) {
    const p = positionAt(track, d);
    const nx = -Math.sin(p.heading), ny = Math.cos(p.heading);
    for (const side of [1, -1]) {
      const inner = { x: p.x + nx * side * (width / 2 - 1.5), y: p.y + ny * side * (width / 2 - 1.5), z: 0 };
      const outer = { x: p.x + nx * side * (width / 2 + 2.5), y: p.y + ny * side * (width / 2 + 2.5), z: 0 };
      const s = project.segment(inner, outer);
      if (!s || s[0].depth > 900) continue;
      const opacity = Math.min(0.8, 160 / s[0].depth);
      marks.push(<line key={`${d}${side}`} x1={s[0].x} y1={s[0].y} x2={s[1].x} y2={s[1].y} stroke={INK.text} strokeOpacity={opacity} strokeWidth={Math.max(1.5, s[0].scale * 0.6)} />);
    }
  }
  return <g>{marks}</g>;
}

function Label({ label, track, width, project }: { label: TrackLabel; track: Track; width: number; project: Project }) {
  const p = positionAt(track, label.distance);
  const sign = label.side === 'left' ? 1 : -1;
  const offset = width * 0.5 + 18;
  const anchor = project.point({ x: p.x - Math.sin(p.heading) * offset * sign, y: p.y + Math.cos(p.heading) * offset * sign, z: 0 });
  const foot = project.point({ x: p.x - Math.sin(p.heading) * (width / 2) * sign, y: p.y + Math.cos(p.heading) * (width / 2) * sign, z: 0 });
  if (!anchor || !foot) return null;
  // A pole from the track edge up to the tag, like a marker planted in the
  // ground; the tag kept inside the safe area, the pole leaning to reach it
  const top = anchor.y - 90;
  const x = Math.min(SAFE.right - 120, Math.max(SAFE.left + 120, anchor.x));
  return (
    <g>
      <line x1={foot.x} y1={foot.y} x2={x} y2={top} stroke={INK.text} strokeOpacity={0.55} strokeWidth={2} />
      <circle cx={foot.x} cy={foot.y} r={5} fill={INK.text} />
      <text x={x} y={top - 14} textAnchor="middle" fill={INK.text} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 44, letterSpacing: '0.06em' }}>
        {label.text}
      </text>
      {label.detail && (
        <text x={x} y={top - 66} textAnchor="middle" fill={INK.textSub} style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em' }}>
          {label.detail}
        </text>
      )}
    </g>
  );
}

/** The car's outline on the ground (m, x ahead, y left): an arrowhead a car long */
const CAR_SHAPE = [[3, 0], [-2.6, 1.1], [-1.6, 0], [-2.6, -1.1]];

/** `tagShift` moves the tag sideways (px), so two cars side by side keep theirs apart */
function Car({ track, car, project, gradient, tagShift = 0 }: { track: Track; car: CarMark; project: Project; gradient: string; tagShift?: number }) {
  const p = positionAt(track, car.distance);
  const centre = project.point({ x: p.x, y: p.y, z: 0 });
  if (!centre) return null;
  const trail = car.trail ? stretch(track, Math.max(0, car.distance - car.trail), car.distance) : [];
  const tail = trail.length ? project.point({ ...trail[0], z: 0 }) : null;
  const streak = tail ? ribbonPaths(trail, track, 3.4, project) : [];
  // Close up, the car's own shape, a little larger than life; from afar, a dot
  const cos = Math.cos(p.heading), sin = Math.sin(p.heading);
  const outline = CAR_SHAPE.map(([ahead, left]) => project.point({ x: p.x + (ahead * cos - left * sin) * 1.6, y: p.y + (ahead * sin + left * cos) * 1.6, z: 0 }));
  const shaped = centre.scale > 5 && outline.every(Boolean);
  const radius = Math.max(10, centre.scale * 2.4);
  return (
    <g>
      {tail && (
        <defs>
          <linearGradient id={gradient} gradientUnits="userSpaceOnUse" x1={tail.x} y1={tail.y} x2={centre.x} y2={centre.y}>
            <stop offset="0" stopColor={INK.text} stopOpacity={0} />
            <stop offset="1" stopColor={INK.text} stopOpacity={0.95} />
          </linearGradient>
        </defs>
      )}
      {streak.map(d => <path key={d.slice(0, 24)} d={d} fill={`url(#${gradient})`} />)}
      <circle cx={centre.x} cy={centre.y} r={shaped ? Math.min(46, centre.scale * 4) : radius * 2.6} fill={car.color} opacity={0.45} filter="url(#kit-soft)" />
      {shaped
        ? <path d={`M${outline.map(q => `${q!.x.toFixed(1)},${q!.y.toFixed(1)}`).join('L')}Z`} fill={INK.text} stroke={car.color} strokeWidth={4} strokeLinejoin="round" />
        : <circle cx={centre.x} cy={centre.y} r={radius} fill={INK.text} stroke={car.color} strokeWidth={Math.max(4, radius * 0.35)} />}
      {car.tag && (
        <g transform={`translate(${centre.x + tagShift} ${centre.y - Math.max(46, radius * 3)})`}>
          <rect x={-46} y={-30} width={92} height={40} fill={car.color} />
          <text y={2} textAnchor="middle" fill={inkOn(car.color)} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 30, letterSpacing: '0.08em' }}>{car.tag}</text>
        </g>
      )}
    </g>
  );
}

export default function Track3D({ track, camera, width = 14, paints = [], labels = [], car, cars = [], grid = true, ticks }: Track3DProps) {
  const id = useId().replace(/:/g, '');
  const project = useMemo(() => projector(camera, VIDEO), [camera]);
  const asphalt = useMemo(() => ribbonPaths(track.points, track, width, project), [track, width, project]);
  const lines = useMemo(() => edgePaths(track.points, track, width, project), [track, width, project]);

  return (
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
      <defs>
        <filter id="kit-soft" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="14" /></filter>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      {grid && <FloorGrid track={track} project={project} />}
      {asphalt.map(d => <path key={d.slice(0, 24)} d={d} fill={INK.asphalt} />)}
      {lines.map((d, i) => <path key={i} d={d} fill="none" stroke={INK.edge} strokeWidth={2.5} strokeLinejoin="round" />)}
      {ticks && <Ticks track={track} width={width} every={ticks} project={project} />}
      {paints.map(paint => {
        const part = stretch(track, paint.from, paint.to);
        const shapes = ribbonPaths(part, track, width * 0.6, project);
        return (
          <g key={`${paint.from}-${paint.to}`}>
            {paint.glow && shapes.map(d => <path key={`g${d.slice(0, 24)}`} d={d} fill={paint.color} opacity={0.7} filter={`url(#${id}-glow)`} />)}
            {shapes.map(d => <path key={d.slice(0, 24)} d={d} fill={paint.color} opacity={0.85} />)}
          </g>
        );
      })}
      {[...(car ? [car] : []), ...cars].map((mark, i, all) => (
        <Car key={i} track={track} car={mark} project={project} gradient={`${id}-trail${i}`} tagShift={all.length > 1 ? (i % 2 ? 54 : -54) : 0} />
      ))}
      {labels.map(label => <Label key={`${label.distance}-${label.text}`} label={label} track={track} width={width} project={project} />)}
    </svg>
  );
}
