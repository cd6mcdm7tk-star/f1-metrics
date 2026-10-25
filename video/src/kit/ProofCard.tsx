import '../../../frontend/src/index.css';
import type { Duel } from '../duel/data';
import { CHARTS, plotX, ROWS, type RowName } from '../site/geometry';
import { zoomDomain } from '../site/laps';
import { useChartsMeasured } from '../site/SiteWindow';
import ZoomedCharts from '../site/ZoomedCharts';
import { DISPLAY, MONO, SITE } from '../theme';
import { INK } from './ink';

const BAR = 54;

/** A stretch of the lap picked out on the charts, with what it shows */
export interface ProofMark {
  from: number;
  to: number;
  label: string;
  /** 0 to 1, as it comes in */
  shown: number;
  /** Where its label sits, down from the top of the charts (px) */
  labelTop?: number;
}

/** The site's own telemetry charts on a stretch of the lap, from speed down
 * to `until`, in a browser card: where the animation's figures come from */
export default function ProofCard({ duel, window, top, left, width, until = 'brake', marks = [] }: {
  duel: Duel; window: [number, number]; top: number; left: number; width: number; until?: RowName; marks?: ProofMark[];
}) {
  useChartsMeasured();
  const scale = width / CHARTS.w;
  const shown = (ROWS[until].y + ROWS[until].h - ROWS.speed.y) * scale;
  const domain = zoomDomain(duel, window);
  const x = (distance: number) => (plotX(distance, domain) - CHARTS.x) * scale;
  return (
    <div style={{
      position: 'absolute', top, left, width, height: BAR + shown, overflow: 'hidden',
      borderRadius: 14, border: '1px solid rgba(242,230,216,0.16)', boxShadow: '0 30px 80px rgba(10,0,2,0.6)', background: 'var(--surface)',
    }}>
      <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 10, padding: '0 22px', background: INK.deep, borderBottom: '1px solid rgba(242,230,216,0.12)' }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 13, height: 13, borderRadius: '50%', background: 'rgba(242,230,216,0.22)' }} />)}
        <span style={{ marginLeft: 18, fontFamily: MONO, fontSize: 21, letterSpacing: '0.04em', color: INK.textSub }}>{SITE}/app</span>
      </div>
      <div className="site-capture" style={{ transformOrigin: '0 0', transform: `scale(${scale})` }}>
        <ZoomedCharts duel={duel} window={window} />
      </div>
      {marks.map(mark => mark.shown > 0 && (
        <div key={mark.label} style={{ position: 'absolute', top: BAR, height: shown, left: x(mark.from), width: x(mark.to) - x(mark.from), opacity: mark.shown }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(94,16,24,0.12)', borderLeft: `2px solid ${INK.bg}`, borderRight: `2px solid ${INK.bg}` }} />
          <div style={{
            position: 'absolute', top: mark.labelTop ?? 14, left: '50%', transform: `translateX(-50%) scale(${0.8 + 0.2 * mark.shown})`, whiteSpace: 'nowrap',
            background: INK.bg, color: INK.text, padding: '8px 16px', fontFamily: DISPLAY, fontWeight: 700, fontSize: 34, letterSpacing: '0.04em',
          }}>
            {mark.label}
          </div>
        </div>
      ))}
    </div>
  );
}
