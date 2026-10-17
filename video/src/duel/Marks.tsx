import type { ReactNode } from 'react';
import { spring, useCurrentFrame } from 'remotion';
import { entrance } from '../components';
import type { Camera } from '../camera';
import { VIDEO } from '../format';
import { FIXED_DOMAINS, plotX, rowPlot, valueY, type RowName } from '../site/geometry';
import { lapColors, lapSpeedDomain, zoomDomain, zoomSpeedDomain } from '../site/laps';
import { BRAND, MONO } from '../theme';
import type { Finding, Side } from './analysis';
import type { Duel } from './data';
import type { Beat, Mark } from './story';

const CHIP = { size: 26, padX: 14, height: 46 };
const LINE = 4;

/** Page → screen through the camera */
const project = (cam: Camera, x: number, y: number) => ({
  x: VIDEO.width / 2 + (x - cam.x) * cam.scale,
  y: VIDEO.height / 2 + (y - cam.y) * cam.scale,
});

/** Label width in the monospace font */
const chipWidth = (text: string) => text.length * CHIP.size * 0.6 + 2 * CHIP.padX;

/** Pops in from its centre as the mark comes in */
function Chip({ v, x, y, text, fill, anchor = 'middle' }: { v: View; x: number; y: number; text: string; fill: string; anchor?: 'start' | 'middle' | 'end' }) {
  const w = chipWidth(text);
  const left = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  const [cx, cy] = [left + w / 2, y];
  return (
    <g transform={`translate(${cx} ${cy}) scale(${v.pop}) translate(${-cx} ${-cy})`}>
      <rect x={left} y={y - CHIP.height / 2} width={w} height={CHIP.height} rx={6} fill={fill} />
      <text x={left + w / 2} y={y + 1} textAnchor="middle" dominantBaseline="middle" fontFamily={MONO} fontWeight={700} fontSize={CHIP.size} fill={BRAND.text}>
        {text}
      </text>
    </g>
  );
}

/** The charts as they are on screen: where a distance and a value fall */
interface View {
  cam: Camera;
  /** Since the mark came in: a springy 0 → 1, and frames */
  pop: number;
  age: number;
  /** On a zoomed stretch rather than the whole lap */
  zoomed: boolean;
  domain: [number, number];
  speedDomain: [number, number];
  colors: [string, string];
  codes: [string, string];
  speeds: [number[], number[]];
  distance: number[];
}

const at = (v: View, distance: number, row: RowName, value: number) => {
  const domain = row === 'speed' ? v.speedDomain : FIXED_DOMAINS[row] ?? [0, 1];
  return project(v.cam, plotX(distance, v.domain), valueY(row, value, domain));
};
const xAt = (v: View, distance: number) => project(v.cam, plotX(distance, v.domain), 0).x;
const rowEdges = (v: View, from: RowName, to: RowName) => ({
  top: project(v.cam, 0, rowPlot(from).top).y,
  bottom: project(v.cam, 0, rowPlot(to).bottom).y,
});
/** A line drawing itself from `from` to `to` as the mark comes in */
const grow = (v: View, from: number, to: number) => from + (to - from) * Math.min(1, v.age / 16);
const speedAt = (v: View, side: Side, distance: number) => {
  const i = v.distance.findIndex(d => d >= distance);
  return v.speeds[side][i < 0 ? v.distance.length - 1 : i];
};

/** The area between the two speed traces over a stretch, in the quicker lap's colour */
function SpeedGap({ v, from, to, side, label }: { v: View; from: number; to: number; side: Side; label: string }) {
  const a = Math.max(from, v.domain[0]), b = Math.min(to, v.domain[1]);
  const idx = v.distance.map((d, i) => (d >= a && d <= b ? i : -1)).filter(i => i >= 0);
  if (idx.length < 2) return null;
  const line = (s: Side) => idx.map(i => at(v, v.distance[i], 'speed', v.speeds[s][i]));
  const upper = line(side), lower = line((1 - side) as Side);
  const points = [...upper, ...[...lower].reverse()].map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // Under the slower trace, clear of the labels above the charts
  const mid = lower[Math.floor(lower.length / 2)];
  return (
    <g>
      <polygon points={points} fill={v.colors[side]} opacity={0.3 * Math.min(1, v.age / 12)} />
      <Chip v={v} x={mid.x} y={mid.y + 50} text={label} fill={v.colors[side]} />
    </g>
  );
}

/** Two positions along the lap, one per driver, with the distance between them */
function Positions({ v, at: [d0, d1], rows, label }: { v: View; at: [number, number]; rows: [RowName, RowName]; label: string }) {
  const { top, bottom } = rowEdges(v, rows[0], rows[1]);
  const xs = [xAt(v, d0), xAt(v, d1)];
  const arrowY = bottom - 40;
  return (
    <g>
      {xs.map((x, side) => {
        // Labels either side of the pair of lines, so close lines keep both readable
        const first = x <= xs[1 - side];
        return (
          <g key={side}>
            <line x1={x} x2={x} y1={top} y2={grow(v, top, bottom)} stroke={v.colors[side]} strokeWidth={LINE} strokeDasharray="12 8" />
            <Chip v={v} x={x + (first ? 6 : -6)} y={top - 30} text={v.codes[side]} fill={v.colors[side]} anchor={first ? 'end' : 'start'} />
          </g>
        );
      })}
      <line x1={Math.min(...xs)} x2={Math.max(...xs)} y1={arrowY} y2={arrowY} stroke={BRAND.bg} strokeWidth={LINE} />
      <Chip v={v} x={(xs[0] + xs[1]) / 2} y={arrowY - 34} text={label} fill={BRAND.bg} />
    </g>
  );
}

function Dots({ v, row, points, labels }: { v: View; row: RowName; points: [[number, number], [number, number]]; labels: [string, string] }) {
  const p = points.map(([d, value]) => at(v, d, row, value));
  // The higher value's label above, the other's below
  const higher = p[0].y <= p[1].y ? 0 : 1;
  // A ring spreading out as they land
  const ring = Math.min(1, v.age / 24);
  return (
    <g>
      {p.map((pt, side) => (
        <g key={side}>
          {ring < 1 && <circle cx={pt.x} cy={pt.y} r={13 + 50 * ring} fill="none" stroke={v.colors[side]} strokeWidth={4} opacity={1 - ring} />}
          <circle cx={pt.x} cy={pt.y} r={13 * v.pop} fill={v.colors[side]} stroke={BRAND.text} strokeWidth={4} />
          <Chip v={v} x={pt.x + (side === 0 ? -22 : 22)} y={pt.y + (side === higher ? -46 : 46)} text={labels[side]} fill={v.colors[side]} anchor={side === 0 ? 'end' : 'start'} />
        </g>
      ))}
    </g>
  );
}

function FindingMark({ v, f }: { v: View; f: Finding }) {
  switch (f.kind) {
    case 'braking':
      return <Positions v={v} at={f.at} rows={['speed', 'brake']} label={`${f.by} m`} />;
    case 'throttle':
      return <Positions v={v} at={f.at} rows={['speed', 'throttle']} label={`${f.by} m`} />;
    case 'liftOnly': {
      const braker = (1 - f.side) as Side;
      const { top, bottom } = rowEdges(v, 'speed', 'brake');
      const x = xAt(v, f.at);
      return (
        <g>
          <line x1={x} x2={x} y1={top} y2={bottom} stroke={v.colors[braker]} strokeWidth={LINE} strokeDasharray="12 8" />
          <Chip v={v} x={x} y={top - 30} text={v.codes[braker]} fill={v.colors[braker]} />
        </g>
      );
    }
    case 'entrySpeed':
    case 'cornerSpeed':
    case 'exitSpeed':
    case 'straightSpeed':
      return <SpeedGap v={v} from={f.from} to={f.to} side={f.side} label={`+${f.by} km/h`} />;
    case 'apexSpeed':
      return <Dots v={v} row="speed" points={[[f.at[0], speedAt(v, 0, f.at[0])], [f.at[1], speedAt(v, 1, f.at[1])]]} labels={[`${f.speeds[0]}`, `${f.speeds[1]}`]} />;
    case 'gear':
      return <Dots v={v} row="gear" points={[[f.at[0], f.gears[0]], [f.at[1], f.gears[1]]]} labels={[`${f.gears[0]}`, `${f.gears[1]}`]} />;
    case 'lift': {
      const lifter = (1 - f.side) as Side;
      const x0 = xAt(v, Math.max(f.from, v.domain[0])), x1 = xAt(v, Math.min(f.to, v.domain[1]));
      const speed = rowEdges(v, 'speed', 'speed'), throttle = rowEdges(v, 'throttle', 'throttle');
      const box = (top: number, bottom: number) => (
        <rect x={x0 - 8} y={top - 8} width={x1 - x0 + 16} height={bottom - top + 16} rx={8} fill={v.colors[lifter]} fillOpacity={0.1} stroke={v.colors[lifter]} strokeWidth={LINE} strokeDasharray="12 8" />
      );
      return (
        <g>
          {box(speed.top, speed.bottom)}
          {box(throttle.top, throttle.bottom)}
          <line x1={(x0 + x1) / 2} x2={(x0 + x1) / 2} y1={speed.bottom + 8} y2={throttle.top - 8} stroke={v.colors[lifter]} strokeWidth={LINE} />
          <Chip v={v} x={(x0 + x1) / 2} y={throttle.bottom + 44} text={`-${f.depth} %`} fill={v.colors[lifter]} />
        </g>
      );
    }
  }
}

function MarkView({ v, mark, row = 0 }: { v: View; mark: Mark; row?: number }): ReactNode {
  if (mark.kind === 'finding') return <FindingMark v={v} f={mark.finding} />;
  if (mark.kind === 'topSpeed') {
    return <Dots v={v} row="speed" points={[[mark.at[0], mark.speeds[0]], [mark.at[1], mark.speeds[1]]]} labels={[`${mark.speeds[0]}`, `${mark.speeds[1]}`]} />;
  }
  // Zoomed: where the delta chart moves; whole lap: the stretch across the charts
  const { top, bottom } = v.zoomed ? rowEdges(v, 'delta', 'delta') : rowEdges(v, 'speed', 'delta');
  const x0 = xAt(v, Math.max(mark.from, v.domain[0])), x1 = xAt(v, Math.min(mark.to, v.domain[1]));
  return (
    <g>
      <rect x={x0} y={top} width={x1 - x0} height={grow(v, 0, bottom - top)} fill={v.colors[mark.side]} fillOpacity={v.zoomed ? 0.14 : 0.1} />
      <line x1={x0} x2={x0} y1={top} y2={bottom} stroke={v.colors[mark.side]} strokeWidth={3} strokeDasharray="10 8" />
      <line x1={x1} x2={x1} y1={top} y2={bottom} stroke={v.colors[mark.side]} strokeWidth={3} strokeDasharray="10 8" />
      <Chip v={v} x={(x0 + x1) / 2} y={top - 30 - row * (CHIP.height + 8)} text={`${v.codes[mark.side]} ${mark.gap}`} fill={v.colors[mark.side]} />
    </g>
  );
}

/** Rows for the gap labels, so that labels of close stretches stack instead of overlapping */
function chipRows(v: View, marks: Mark[]): number[] {
  const placed: { left: number; right: number; row: number }[] = [];
  return marks.map(mark => {
    if (mark.kind !== 'gap') return 0;
    const centre = (xAt(v, Math.max(mark.from, v.domain[0])) + xAt(v, Math.min(mark.to, v.domain[1]))) / 2;
    const w = chipWidth(`${v.codes[mark.side]} ${mark.gap}`);
    const [left, right] = [centre - w / 2 - 6, centre + w / 2 + 6];
    let row = 0;
    while (placed.some(p => p.row === row && p.left < right && left < p.right)) row++;
    placed.push({ left, right, row });
    return row;
  });
}

/** A beat's marks, over the site's charts, each coming in as the voice mentions it */
export default function Marks({ duel, beat, cam }: { duel: Duel; beat: Beat; cam: Camera }) {
  const frame = useCurrentFrame();
  if (!beat.marks.length) return null;
  const lapLength = duel.distance[duel.distance.length - 1];
  const v: View = {
    cam,
    pop: 1,
    age: 0,
    zoomed: beat.window !== null,
    domain: beat.window ? zoomDomain(duel, beat.window) : [0, lapLength],
    speedDomain: beat.window ? zoomSpeedDomain(duel, beat.window) : lapSpeedDomain(duel),
    colors: lapColors(duel),
    codes: [duel.drivers[0].code, duel.drivers[1].code],
    speeds: [0, 1].map(side => duel.telemetry.telemetry.map(p => p.speeds[duel.order[side]])) as [number[], number[]],
    distance: duel.distance,
  };
  const leaving = 1 - entrance(frame, beat.to - 12, 12);
  const rows = chipRows(v, beat.marks);
  return (
    <svg width={VIDEO.width} height={VIDEO.height} style={{ position: 'absolute', left: 0, top: 0, opacity: leaving }}>
      {beat.marks.map((mark, i) => {
        const cue = mark.cue ?? beat.from;
        if (frame < cue) return null;
        const own = { ...v, age: frame - cue, pop: spring({ frame: frame - cue, fps: 60, config: { damping: 11, mass: 0.6 } }) };
        return <g key={i} opacity={entrance(frame, cue, 8)}><MarkView v={own} mark={mark} row={rows[i]} /></g>;
      })}
    </svg>
  );
}
