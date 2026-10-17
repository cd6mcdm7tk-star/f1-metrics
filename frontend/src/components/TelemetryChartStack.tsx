import { memo, type RefObject } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { fmtRpm, RENDER_SCALE, type ChartRow } from './telemetryChart';
import Watermark from './Watermark';

const fmtDist = (v: number) => `${(v / 1000).toFixed(1)}km`;
const fmtSpeed = (v: number) => `${Math.round(v)}`;
const fmtPct = (v: number) => `${Math.round(v)}%`;
const fmtGear = (v: number) => `${Math.round(v)}`;
// As many decimals as the ticks need: 0.05 steps no longer all read 0.1
const fmtDelta = (v: number) => `${+v.toFixed(3)}`;

const GRID  = { strokeDasharray: '3 4', stroke: 'var(--chart-grid)', vertical: false };
const CORNER_LINE = { stroke: 'var(--border-hi)', strokeDasharray: '2 3' };
const TICK  = { fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' };

interface Props {
  chartData: ChartRow[];
  /** One per lap */
  colors: string[];
  labels: string[];
  /** Another lap of the first lap's driver, drawn dashed */
  dashed: boolean[];
  fastestIdx: number;
  corners: { label: string; distance: number }[];
  /** The distances shown: the whole lap, or a stretch of it */
  xDomain: [number, number];
  speedYDomain: [number, number | string];
  margin: { top: number; right: number; left: number; bottom: number };
  yAxisWidth: number;
  /** The row the loupe magnifies */
  zoomChartIdx: number | null;
  rowRefs: RefObject<(HTMLDivElement | null)[]>;
  zoomWrapRefs: RefObject<(HTMLDivElement | null)[]>;
}

/** The six synced charts of a comparison. Memoised: the crosshair, live panel
 * and replays update around it without redrawing them. */
function TelemetryChartStack({
  chartData, colors, labels, dashed, fastestIdx, corners, xDomain, speedYDomain, margin, yAxisWidth, zoomChartIdx, rowRefs, zoomWrapRefs,
}: Props) {
  // The zoomed row hides its ticks, which would stretch with the transform
  const xAxisPropsFor = (rowIdx: number) => ({
    dataKey: 'distance' as const,
    stroke: 'transparent',
    tick: zoomChartIdx === rowIdx ? false : TICK,
    tickLine: false,
    tickFormatter: fmtDist,
    type: 'number' as const,
    domain: xDomain,
  });

  return (
    <>
      {/* Speed */}
      <div ref={(el) => { rowRefs.current[0] = el; }} className="relative h-[220px] sm:h-[300px] overflow-hidden flex flex-col">
        <Watermark bottom={4} right={24} />
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>SPEED km/h</div>
        <div ref={(el) => { zoomWrapRefs.current[0] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 0 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(0)} hide />
              <YAxis stroke="transparent" tick={zoomChartIdx === 0 ? false : TICK} tickLine={false} tickFormatter={fmtSpeed} domain={speedYDomain} width={yAxisWidth} />
              {corners.map((c, i) => (
                <ReferenceLine
                  key={i} x={c.distance} {...CORNER_LINE}
                  label={{ value: c.label, position: 'insideTop', fill: 'var(--text-3)', fontSize: 8, fontFamily: 'JetBrains Mono' }}
                />
              ))}
              {colors.map((color, i) => (
                <Line key={i} type="monotone" dataKey={`spd${i}`} stroke={color} strokeWidth={i === 0 ? 1.5 : 1.2}
                  dot={false} isAnimationActive={false} strokeDasharray={dashed[i] ? '4 2' : undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Throttle */}
      <div ref={(el) => { rowRefs.current[1] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>THROTTLE %</div>
        <div ref={(el) => { zoomWrapRefs.current[1] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 1 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(1)} hide />
              <YAxis stroke="transparent" tick={zoomChartIdx === 1 ? false : TICK} tickLine={false} tickFormatter={fmtPct} domain={[0, 100]} width={yAxisWidth} />
              {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
              {colors.map((color, i) => (
                <Line key={i} type="monotone" dataKey={`thr${i}`} stroke={color} strokeWidth={i === 0 ? 1.5 : 1.2}
                  dot={false} isAnimationActive={false} strokeDasharray={dashed[i] ? '4 2' : undefined} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Brake */}
      <div ref={(el) => { rowRefs.current[2] = el; }} className="h-[60px] sm:h-[75px] overflow-hidden flex flex-col">
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>BRAKE</div>
        <div ref={(el) => { zoomWrapRefs.current[2] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 2 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(2)} hide />
              <YAxis stroke="transparent" tick={false} domain={[0, 1]} width={yAxisWidth} />
              {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
              {colors.map((color, i) => (
                <Line key={i} type="stepAfter" dataKey={`brk${i}`} stroke={color} strokeWidth={i === 0 ? 2 : 1.5}
                  dot={false} isAnimationActive={false} opacity={0.85} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gear */}
      <div ref={(el) => { rowRefs.current[3] = el; }} className="h-[100px] sm:h-[130px] overflow-hidden flex flex-col">
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>GEAR</div>
        <div ref={(el) => { zoomWrapRefs.current[3] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 3 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(3)} hide />
              <YAxis stroke="transparent" tick={zoomChartIdx === 3 ? false : TICK} tickLine={false} tickFormatter={fmtGear} domain={[1, 8]} ticks={[1, 2, 3, 4, 5, 6, 7, 8]} width={yAxisWidth} />
              {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
              {colors.map((color, i) => (
                <Line key={i} type="stepAfter" dataKey={`gear${i}`} stroke={color} strokeWidth={i === 0 ? 1.5 : 1.2}
                  dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Delta vs fastest driver */}
      <div ref={(el) => { rowRefs.current[4] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>
          DELTA vs <span style={{ color: colors[fastestIdx] }}>{labels[fastestIdx]}</span> — s
        </div>
        <div ref={(el) => { zoomWrapRefs.current[4] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 4 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(4)} hide />
              <YAxis stroke="transparent" tick={zoomChartIdx === 4 ? false : TICK} tickLine={false} tickFormatter={fmtDelta} width={yAxisWidth} />
              {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
              <ReferenceLine y={0} stroke={colors[fastestIdx]} strokeWidth={1.5} />
              {colors.map((color, i) => i !== fastestIdx && (
                <Line key={i} type="monotone" dataKey={`dlt${i}`} stroke={color} strokeWidth={1.5}
                  dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RPM */}
      <div ref={(el) => { rowRefs.current[5] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
        <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>RPM</div>
        <div ref={(el) => { zoomWrapRefs.current[5] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 5 ? `${RENDER_SCALE * 100}%` : '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} syncId="multi" margin={margin}>
              <CartesianGrid {...GRID} />
              <XAxis {...xAxisPropsFor(5)} />
              <YAxis stroke="transparent" tick={zoomChartIdx === 5 ? false : TICK} tickLine={false} tickFormatter={fmtRpm} domain={['dataMin - 300', 'dataMax + 300']} width={yAxisWidth} />
              {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
              {colors.map((color, i) => (
                <Line key={i} type="monotone" dataKey={`rpm${i}`} stroke={color} strokeWidth={i === 0 ? 1.5 : 1.2}
                  dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

export default memo(TelemetryChartStack);
