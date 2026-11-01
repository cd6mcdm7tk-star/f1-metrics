import { DISPLAY, MONO } from '../theme';
import type { Box } from './CornerSchematic';
import { INK, inkOn } from './ink';

export interface BumpLine {
  code: string;
  color: string;
  /** The place at the end of each lap (index 0: lap 1), null once out */
  places: (number | null)[];
}

/** Places lap by lap, a line per driver, drawn up to lap `upTo` (fractional
 * laps draw part of the next one). One driver can be picked out, and a span
 * of laps lit with a label. */
export default function BumpChart({ lines, upTo, box, places, laps, span = [1, laps], tick = lap => String(lap), ticks, highlight, band }: {
  lines: BumpLine[];
  upTo: number;
  box: Box;
  /** The lowest place shown: lines go off the bottom below it */
  places: number;
  laps: number;
  /** The laps the width shows, to zoom onto part of the race */
  span?: [number, number];
  /** How a lap reads on the axis, and which laps it marks */
  tick?: (lap: number) => string;
  ticks?: number[];
  highlight?: string;
  band?: { from: number; to: number; label: string; shown: number };
}) {
  const x = (lap: number) => box.x + 70 + ((lap - span[0]) / (span[1] - span[0])) * (box.w - 170);
  const y = (place: number) => box.y + ((Math.min(place, places + 0.6) - 1) / (places - 1)) * box.h;
  const drawn = Math.max(1, Math.min(laps, upTo));
  const pointsOf = (line: BumpLine) => {
    const points: { lap: number; place: number }[] = [];
    for (let lap = 1; lap <= Math.floor(drawn); lap++) {
      const place = line.places[lap - 1];
      if (place != null) points.push({ lap, place });
    }
    const next = line.places[Math.floor(drawn)];
    const last = points[points.length - 1];
    if (next != null && last && drawn % 1 > 0) points.push({ lap: drawn, place: last.place + (next - last.place) * (drawn % 1) });
    return points;
  };
  const ordered = [...lines].sort((a, b) => (a.code === highlight ? 1 : 0) - (b.code === highlight ? 1 : 0));
  return (
    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
      {band && band.shown > 0 && (
        <g opacity={band.shown}>
          <rect x={x(band.from) - 6} y={box.y - 30} width={x(band.to) - x(band.from) + 12} height={box.h + 60} fill="rgba(242,230,216,0.08)" />
          <text x={(x(band.from) + x(band.to)) / 2} y={box.y - 44} textAnchor="middle" fill={INK.text} style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.12em' }}>{band.label}</text>
        </g>
      )}
      {Array.from({ length: places }, (_, i) => (
        <text key={i} x={box.x} y={y(i + 1) + 8} fill={INK.textSub} style={{ fontFamily: MONO, fontSize: 22 }}>P{i + 1}</text>
      ))}
      {(ticks ?? [span[0], ...[10, 20, 30, 40, 50].filter(l => l > span[0] && l < span[1]), span[1]]).filter(l => l >= span[0] && l <= span[1]).map(lap => (
        <text key={lap} x={x(lap)} y={box.y + box.h + 50} textAnchor="middle" fill={INK.textGhost} style={{ fontFamily: MONO, fontSize: 20 }}>{tick(lap)}</text>
      ))}
      {ordered.map(line => {
        const points = pointsOf(line);
        if (points.length < 1) return null;
        const picked = line.code === highlight;
        const dim = highlight && !picked ? 0.3 : 1;
        const d = `M${points.map(p => `${x(p.lap).toFixed(1)},${y(p.place).toFixed(1)}`).join('L')}`;
        const end = points[points.length - 1];
        return (
          <g key={line.code} opacity={dim}>
            <path d={d} fill="none" stroke={line.color} strokeWidth={picked ? 10 : 6} strokeLinejoin="round" strokeLinecap="round" />
            <g transform={`translate(${x(end.lap) + 12} ${y(end.place)})`}>
              <rect x={0} y={-20} width={74} height={40} fill={line.color} />
              <text x={37} y={10} textAnchor="middle" fill={inkOn(line.color)} style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 28 }}>{line.code}</text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
