import type { ReactNode } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { compoundColor } from '../utils/compoundColors';
import { dotDrawDelay, DRAW_MS, formatLapTime, type LapChartRow } from './lapChart';
import type { LapSelection } from '../types/session';

/** A line drawing in, or fading out after it was deselected */
type Phase = 'in' | 'out';
/** A line's points, as Recharts hands them to each dot */
type LinePoints = readonly { x?: number | null; value?: unknown }[];

// ── Chart dot: clickable, filled with the tyre colour, larger when selected ──

function ChartDot({ cx, cy, stroke, payload, points, dataKey, phase, selectedLapRefs, onToggle }: {
  cx?: number; cy?: number; stroke?: string; payload?: LapChartRow;
  /** The line's points, to know when it reaches this one as it draws in */
  points?: LinePoints;
  dataKey: string; phase?: Phase; selectedLapRefs: LapSelection[]; onToggle?: (driver: string, lapNumber: number) => void;
}) {
  const lapNumber = Number(payload?.lapNumber);
  const value = payload?.[dataKey];
  if (value == null || cx == null || cy == null) return null;
  // Rendered apart from the line (Recharts draws dots on a layer of their own), so each fades itself
  const xs = phase === 'in' ? (points ?? []).filter(p => p.value != null && p.x != null).map(p => p.x as number) : [];
  const fade = phase === 'in' ? { className: 'chart-dot-in', style: { animationDelay: `${Math.round(dotDrawDelay(xs, cx))}ms` } }
    : phase === 'out' ? { className: 'chart-fade-out' } : {};
  const isSelected = selectedLapRefs.some(l => l.driver === dataKey && l.lapNumber === lapNumber);
  const compound = payload?.[`${dataKey}__compound`] as string | null | undefined;
  const fillColor = isSelected ? stroke : (compoundColor(compound) || 'var(--bg)');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle?.(dataKey, lapNumber);
  };

  return (
    <g {...fade}>
      {/* Generous invisible hit area around the 4px dot */}
      {phase !== 'out' && <circle cx={cx} cy={cy} r={14} fill="transparent" style={{ cursor: 'pointer', pointerEvents: 'all' }} onClick={handleClick} />}
      <circle
        data-visible-dot="true"
        cx={cx} cy={cy}
        r={isSelected ? 6.5 : 4}
        fill={fillColor}
        stroke={stroke}
        strokeWidth={isSelected ? 2 : 1.5}
      />
    </g>
  );
}

export interface LapTimesChartProps {
  rows: LapChartRow[];
  /** In the legend */
  drivers: string[];
  /** Drawn: the legend's drivers, and any line still fading out */
  lines?: string[];
  /** Lines drawing in, their dots showing as the line reaches them */
  entering?: string[];
  /** Deselected lines fading out */
  leaving?: string[];
  colorOf: (code: string) => string;
  yDomain: [number, number];
  selectedLapRefs?: LapSelection[];
  onToggle?: (driver: string, lapNumber: number) => void;
  /** Lines drawing in, and moving to a new scale (Recharts' own animation) */
  animate?: boolean;
  /** A new key draws the chart afresh */
  chartKey?: string;
  /** More of Recharts' elements on the chart: reference areas and lines */
  children?: ReactNode;
}

/** Each lap's time for the drivers chosen, dots in the tyre's colour */
export default function LapTimesChart({
  rows, drivers, lines = drivers, entering = [], leaving = [], colorOf, yDomain, selectedLapRefs = [], onToggle, animate = false, chartKey, children,
}: LapTimesChartProps) {
  const phaseOf = (code: string): Phase | undefined => (leaving.includes(code) ? 'out' : entering.includes(code) ? 'in' : undefined);
  return (
    <>
      {/* Legend */}
      <div style={{
        position: 'absolute', top: 10, left: 56, zIndex: 10,
        display: 'flex', gap: 14, flexWrap: 'wrap',
      }}>
        {drivers.map(code => (
          <span key={code} style={{
            fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700,
            color: colorOf(code),
          }}>
            ● {code}
          </span>
        ))}
      </div>

      <div key={chartKey} style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 34, right: 20, left: 4, bottom: 18 }}
        >
          <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
          <XAxis dataKey="lapNumber" stroke="transparent"
            tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            padding={{ left: 12, right: 12 }}
            label={{ value: 'LAP', position: 'insideBottom', offset: -6, fill: 'var(--text-3)', style: { fontSize: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.15em' } }}
          />
          <YAxis stroke="transparent" width={46} allowDecimals={false}
            tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
            tickFormatter={v => {
              const m = Math.floor(v / 60);
              return `${m}:${Math.floor(v % 60).toString().padStart(2, '0')}`;
            }}
            domain={yDomain}
          />
          <Tooltip
            cursor={false}
            contentStyle={{ background: 'var(--panel)', border: '1px solid var(--border-hi)', borderRadius: 'var(--r2)', padding: '6px 10px' }}
            labelStyle={{ color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontSize: 9, marginBottom: 4 }}
            itemStyle={{ fontFamily: 'JetBrains Mono', fontSize: 10 }}
            formatter={(v, name) => [formatLapTime(Number(v)), name]}
            labelFormatter={l => `Lap ${l}`}
          />
          {lines.map((code) => (
            <Line
              key={code}
              className={phaseOf(code) === 'out' ? 'chart-fade-out' : undefined}
              tooltipType={phaseOf(code) === 'out' ? 'none' : undefined}
              type="monotone"
              dataKey={code}
              stroke={colorOf(code)}
              strokeWidth={1.5}
              dot={(p: { cx?: number; cy?: number; stroke?: string; payload?: LapChartRow; points?: LinePoints }) => (
                <ChartDot
                  {...p}
                  dataKey={code}
                  phase={phaseOf(code)}
                  selectedLapRefs={selectedLapRefs}
                  onToggle={onToggle}
                />
              )}
              activeDot={false}
              connectNulls
              isAnimationActive={animate}
              animationDuration={DRAW_MS}
              animationEasing="ease-in-out"
            />
          ))}
          {children}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </>
  );
}
