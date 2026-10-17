import { Easing, interpolate, useCurrentFrame } from 'remotion';
import { CHARTS } from '../site/geometry';
import { zoomDomain } from '../site/laps';
import ZoomedCharts, { ZOOM_ORIGIN } from '../site/ZoomedCharts';
import type { Duel } from './data';
import type { Zoom } from './story';

// The charts' plot area within their column (TelemetryChartStack's margins)
const PLOT_LEFT = 52 + 48;
const PLOT_WIDTH = CHARTS.w - 52 - 48 - 20;
const EASE = Easing.inOut(Easing.cubic);

// Stretched mid-zoom, the charts' text would smear over the page's own: it
// shows once the zoom is in
const TEXT = '.zoom-layer .label-section, .zoom-layer .recharts-text, .zoom-layer .chart-watermark { opacity: var(--zoom-text); }';

/** How far the zoom is in at a frame, 0 to 1 */
function zoomProgress(zoom: Zoom, frame: number): number {
  if (frame < zoom.out) return interpolate(frame, [zoom.from, zoom.in], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
  return interpolate(frame, [zoom.out, zoom.to], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: EASE });
}

/** The charts zooming from the whole lap onto a stretch, and back: the
 * stretch's charts are stretched so they always sit where the stretch is in
 * the view, from its place on the whole lap to the full width */
export default function ZoomLayer({ duel, zoom }: { duel: Duel; zoom: Zoom }) {
  const frame = useCurrentFrame();
  const p = zoomProgress(zoom, frame);
  const lap = duel.distance[duel.distance.length - 1];
  const [w0, w1] = zoomDomain(duel, zoom.window);
  // The view narrows geometrically from the lap to the stretch
  const width = lap * ((w1 - w0) / lap) ** p;
  const start = (w0 / (lap - (w1 - w0))) * (lap - width);
  const scale = (w1 - w0) / width;
  const shift = PLOT_LEFT + ((w0 - start) / width) * PLOT_WIDTH - scale * PLOT_LEFT;

  return (
    <div className="zoom-layer" style={{
      // Above the page's crosshair and loupe button
      position: 'absolute', zIndex: 50, left: ZOOM_ORIGIN.x, top: ZOOM_ORIGIN.y, transformOrigin: '0 0',
      transform: `translateX(${shift}px) scaleX(${scale})`,
      opacity: Math.min(1, p * 2.5), visibility: p > 0 ? 'visible' : 'hidden',
      ['--zoom-text' as string]: Math.max(0, (p - 0.94) / 0.06),
    }}>
      <style>{TEXT}</style>
      <ZoomedCharts duel={duel} window={zoom.window} />
    </div>
  );
}
