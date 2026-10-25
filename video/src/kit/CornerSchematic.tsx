import { useId } from 'react';
import { Easing } from 'remotion';
import { DISPLAY, MONO } from '../theme';
import { INK } from './ink';
import { alongLine, arcPoints, cornerGeometry, fractionAt, lineAt, partOf, racingLine, type Point } from './schematic';

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** What is drawn so far, each from 0 (not yet) to 1 (fully) */
export interface SchematicState {
  road: number;
  middle: number;
  smallCircle: number;
  racing: number;
  /** Turn-in, apex and exit, popping up one after the other (0 to 3) */
  markers: number;
  bigCircle: number;
  /** The exit lit up, where the throttle goes back down */
  exit: number;
  formula: number;
  /** A car driving one of the lines, `at` 0 to 1 along it */
  car?: { line: 'middle' | 'racing'; at: number; tag?: string };
}

export const SCHEMATIC_DONE: SchematicState = { road: 1, middle: 1, smallCircle: 1, racing: 1, markers: 3, bigCircle: 1, exit: 1, formula: 1 };

// The corner the schematic draws (m): a medium-speed corner
const INNER = 40, WIDTH = 30, MARGIN = 4, REACH = 150;
/** Room on the outside for the labels (m) */
const ROOM = 64;
const pop = Easing.out(Easing.back(2));

const GEOMETRY = cornerGeometry(INNER, WIDTH, MARGIN, REACH);
const RACING = racingLine(GEOMETRY);
/** How far along the racing line (0 to 1) the car turns in, touches the apex and reaches the exit */
export const RACING_MARKS = {
  turnIn: fractionAt(RACING, GEOMETRY.line.turnIn),
  apex: fractionAt(RACING, GEOMETRY.line.apex),
  exit: fractionAt(RACING, GEOMETRY.line.exit),
};
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

const pathOf = (points: Point[], close = false) =>
  `M${points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join('L')}${close ? 'Z' : ''}`;

function Marker({ at, n, text, side, shown, above = false }: { at: Point; n: number; text: string; side: 1 | -1; shown: number; above?: boolean }) {
  if (shown <= 0) return null;
  const s = pop(clamp01(shown));
  return (
    <g transform={`translate(${at.x} ${at.y}) scale(${s})`}>
      <circle r={26} fill={INK.text} />
      <text y={11} textAnchor="middle" fill={INK.bg} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 34 }}>{n}</text>
      <text x={above ? 0 : side * 44} y={above ? -44 : 14} textAnchor={above ? 'middle' : side > 0 ? 'start' : 'end'} fill={INK.text} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 42, letterSpacing: '0.1em' }}>{text}</text>
    </g>
  );
}

/** A corner seen from above: the road, the line through its middle on a
 * small circle, and the racing line on the largest circle that fits, drawn
 * step by step. Drawn to scale, but a diagram: tagged as such. `mirror`
 * makes it a left-hander. */
export default function CornerSchematic({ box, state, mirror = false }: { box: Box; state: SchematicState; mirror?: boolean }) {
  const id = useId().replace(/:/g, '');
  const g = GEOMETRY;
  const view = { x0: -INNER - WIDTH - ROOM, x1: REACH, y0: -REACH, y1: INNER + WIDTH + 40 };
  const k = Math.min(box.w / (view.x1 - view.x0), box.h / (view.y1 - view.y0));
  const flip = mirror ? -1 : 1;
  // Mirrored, the drawing hangs from the box's right edge
  const map = (p: Point): Point => {
    const x = (p.x - view.x0) * k;
    return { x: mirror ? box.x + box.w - x : box.x + x, y: box.y + (view.y1 - p.y) * k };
  };
  const screen = (points: Point[]) => points.map(map);
  const O = { x: 0, y: 0 };

  const road = [...lineAt(g.outer, REACH), ...lineAt(g.inner, REACH).reverse()];
  const middle = lineAt(g.middle, REACH);
  const racing = RACING;
  const small = arcPoints(O, g.middle, 90, 450, 120);
  const big = arcPoints(g.line.centre, g.line.radius, 90, 450, 160);
  const exitStretch = racing.slice(racing.findIndex(p => Math.hypot(p.x - g.line.apex.x, p.y - g.line.apex.y) < 1));
  const kerb = arcPoints(O, g.inner - 3, 112, 158, 24);
  const car = state.car && alongLine(state.car.line === 'middle' ? middle : racing, state.car.at);
  const carShape = car && [[3.2, 0], [-2.8, 1.4], [-1.8, 0], [-2.8, -1.4]].map(([a, l]) => map({
    x: car.x + (a * Math.cos(car.heading) - l * Math.sin(car.heading)) * 2.2,
    y: car.y + (a * Math.sin(car.heading) + l * Math.cos(car.heading)) * 2.2,
  }));
  const label = { fontFamily: MONO, fontSize: 22, letterSpacing: '0.16em' };
  const smallLabel = map({ x: -g.middle * 0.3, y: -g.middle * 0.55 });
  const bigLabel = map({ x: g.line.centre.x + 10, y: g.line.centre.y - 20 });
  const exitLabel = map({ x: g.line.exit.x + 75, y: g.outer + 16 });

  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      <defs>
        <clipPath id={`${id}-clip`}><rect x={box.x} y={box.y} width={box.w} height={box.h} /></clipPath>
        <filter id={`${id}-glow`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        {state.smallCircle > 0 && <path d={pathOf(screen(partOf(small, state.smallCircle)))} fill="none" stroke={INK.textSub} strokeWidth={2.5} strokeDasharray="8 10" opacity={1 - state.bigCircle * 0.5} />}
        {state.bigCircle > 0 && <path d={pathOf(screen(partOf(big, state.bigCircle)))} fill="none" stroke={INK.text} strokeOpacity={0.5} strokeWidth={2.5} />}
        <g opacity={state.road} transform={`translate(0 ${(1 - state.road) * 40})`}>
          <path d={pathOf(screen(road), true)} fill={INK.asphalt} />
          <path d={pathOf(screen(lineAt(g.outer, REACH)))} fill="none" stroke={INK.edge} strokeWidth={3} />
          <path d={pathOf(screen(lineAt(g.inner, REACH)))} fill="none" stroke={INK.edge} strokeWidth={3} />
          <path d={pathOf(screen(kerb))} fill="none" stroke={INK.text} strokeWidth={14} />
          <path d={pathOf(screen(kerb))} fill="none" stroke={INK.brake} strokeWidth={14} strokeDasharray="14 14" />
        </g>
        {state.middle > 0 && <path d={pathOf(screen(partOf(middle, state.middle)))} fill="none" stroke={INK.textSub} strokeWidth={5} strokeDasharray="14 14" opacity={1 - state.racing * 0.4} />}
        {state.exit > 0 && <path d={pathOf(screen(exitStretch))} fill="none" stroke={INK.text} strokeWidth={34} strokeLinecap="round" opacity={0.5 * state.exit} filter={`url(#${id}-glow)`} />}
        {state.racing > 0 && (
          <>
            <path d={pathOf(screen(partOf(racing, state.racing)))} fill="none" stroke={INK.text} strokeWidth={12} opacity={0.7} filter={`url(#${id}-glow)`} />
            <path d={pathOf(screen(partOf(racing, state.racing)))} fill="none" stroke={INK.text} strokeWidth={9} strokeLinecap="round" />
          </>
        )}
        {carShape && (
          <g>
            <circle cx={carShape[0].x} cy={carShape[0].y} r={34} fill={INK.text} opacity={0.35} filter={`url(#${id}-glow)`} />
            <path d={pathOf(carShape, true)} fill={INK.text} stroke={INK.bg} strokeWidth={3} strokeLinejoin="round" />
          </g>
        )}
      </g>
      {state.smallCircle > 0.9 && <text x={smallLabel.x} y={smallLabel.y} textAnchor="middle" fill={INK.textSub} opacity={(state.smallCircle - 0.9) * 10 * (1 - state.bigCircle * 0.6)} style={label}>PETIT CERCLE</text>}
      {state.bigCircle > 0.9 && <text x={bigLabel.x} y={bigLabel.y} textAnchor="middle" fill={INK.text} opacity={(state.bigCircle - 0.9) * 10} style={label}>GRAND CERCLE</text>}
      {state.exit > 0 && <text x={exitLabel.x} y={exitLabel.y} textAnchor="middle" fill={INK.text} opacity={state.exit} style={{ ...label, fontSize: 26 }}>PLEINS GAZ</text>}
      <Marker at={map(g.line.turnIn)} n={1} text="BRAQUAGE" side={flip === 1 ? -1 : 1} shown={state.markers} />
      <Marker at={map(g.line.apex)} n={2} text="CORDE" side={flip === 1 ? 1 : -1} shown={state.markers - 1} />
      <Marker at={map(g.line.exit)} n={3} text="SORTIE" side={flip === 1 ? 1 : -1} shown={state.markers - 2} above />
      {state.car?.tag && carShape && (
        <text x={Math.min(box.x + box.w - 90, Math.max(box.x + 90, carShape[0].x))} y={carShape[0].y - 52} textAnchor="middle" fill={INK.text} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, letterSpacing: '0.1em' }}>{state.car.tag}</text>
      )}
      <g opacity={state.road}>
        <rect x={box.x} y={box.y} width={138} height={44} fill="none" stroke={INK.textSub} strokeWidth={1.5} />
        <text x={box.x + 69} y={box.y + 30} textAnchor="middle" fill={INK.textSub} style={{ fontFamily: MONO, fontSize: 20, letterSpacing: '0.24em' }}>SCHÉMA</text>
      </g>
      {state.formula > 0 && (
        <g opacity={state.formula}>
          <text x={mirror ? box.x : box.x + box.w} y={box.y + box.h - 40} textAnchor={mirror ? 'start' : 'end'} fill={INK.text} style={{ fontFamily: MONO, fontSize: 30, letterSpacing: '0.04em' }}>v max = √(μ · g · r)</text>
          <text x={mirror ? box.x : box.x + box.w} y={box.y + box.h - 6} textAnchor={mirror ? 'start' : 'end'} fill={INK.textSub} style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.14em' }}>SANS APPUI AÉRO</text>
        </g>
      )}
    </svg>
  );
}
