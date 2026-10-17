import { memo, useMemo, useRef } from 'react';
import TelemetryChartStack from '../../../frontend/src/components/TelemetryChartStack';
import { buildColors, buildLabel, fastestLapIndex, MARGIN, Y_AXIS_WIDTH } from '../../../frontend/src/components/telemetryChart';
import type { Duel } from '../duel/data';
import { CHARTS, ROWS } from './geometry';
import { teamLookups, windowRows, zoomDomain, zoomSpeedDomain } from './laps';

/** The site's charts on a stretch of the lap, laid exactly over its own */
function ZoomedCharts({ duel, window }: { duel: Duel; window: [number, number] }) {
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const zoomWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const charts = useMemo(() => {
    const drivers = duel.telemetry.drivers;
    const { getDriverColor, areTeammates } = teamLookups(duel.teams);
    const [from, to] = zoomDomain(duel, window);
    return {
      chartData: windowRows(duel, window),
      colors: buildColors(drivers, getDriverColor, areTeammates),
      labels: drivers.map(d => buildLabel(d, drivers)),
      dashed: drivers.map((d, i) => i > 0 && d.driver === drivers[0].driver),
      fastestIdx: fastestLapIndex(drivers),
      corners: duel.telemetry.corners
        .filter(c => c.distance >= from && c.distance <= to)
        .map(c => ({ label: `T${c.number}${c.letter ?? ''}`, distance: c.distance })),
      xDomain: [from, to] as [number, number],
      speedYDomain: zoomSpeedDomain(duel, window),
    };
  }, [duel, window]);

  return (
    <div className="data-zone" style={{ width: CHARTS.w, background: 'var(--surface)' }}>
      <TelemetryChartStack
        {...charts} margin={MARGIN} yAxisWidth={Y_AXIS_WIDTH}
        zoomChartIdx={null} rowRefs={rowRefs} zoomWrapRefs={zoomWrapRefs}
      />
    </div>
  );
}

export default memo(ZoomedCharts);

/** Where the zoomed charts sit on the page */
export const ZOOM_ORIGIN = { x: CHARTS.x, y: ROWS.speed.y };
