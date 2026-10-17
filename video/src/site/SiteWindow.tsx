import '../../../frontend/src/index.css';
import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { Download, Link, Lock } from 'lucide-react';
import { continueRender, delayRender } from 'remotion';
import type { ReactNode } from 'react';
import LapTimesChart, { type LapTimesChartProps } from '../../../frontend/src/components/LapTimesChart';
import PageHeaderView, { SignInButton } from '../../../frontend/src/components/PageHeaderView';
import TelemetryViewMulti from '../../../frontend/src/components/TelemetryViewMulti';
import type { TelemetryDataMulti } from '../../../frontend/src/types/telemetry';
import { MONO } from '../theme';
import { LAPS_PAGE, LAPS_PANEL, PAGE, TOOLBAR } from './geometry';
import { teamLookups } from './laps';

// Re-renders only when the replayed distance moves
const Telemetry = memo(TelemetryViewMulti);

// A frame can be captured halfway through one of the site's hover transitions
const NO_TRANSITIONS = '.site-capture *, .site-capture *::before, .site-capture *::after { transition: none !important; }';

/** Holds the first frame until the charts have measured their size, which
 * Recharts' ResponsiveContainer does after the first paint. */
function useChartsMeasured() {
  const [handle] = useState(() => delayRender('Charts measuring their size'));
  useEffect(() => {
    let id = requestAnimationFrame(() => { id = requestAnimationFrame(() => continueRender(handle)); });
    return () => cancelAnimationFrame(id);
  }, [handle]);
}

// The header's controls as TelemetryPage draws them on the trace view
const control: CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
  padding: '3px 8px', marginRight: 2, color: 'var(--text-2)', background: 'transparent',
  border: '1px solid var(--border)', borderRadius: 'var(--r)',
};
const icon: CSSProperties = { padding: 6, display: 'flex', color: 'var(--text-2)' };

/** The site's page, its header as TelemetryPage draws it above `children` */
function Page({ height, children }: { height: number; children: ReactNode }) {
  useChartsMeasured();
  return (
    <MemoryRouter>
      <style>{NO_TRANSITIONS}</style>
      <div className="data-zone site-capture" style={{ width: PAGE.width, height, display: 'grid', gridTemplateRows: '44px 1fr' }}>
        <PageHeaderView
          page="telemetry"
          leading={<span style={control}>←</span>}
          actions={<><span style={icon}><Link size={14} /></span><span style={icon}><Download size={14} /></span></>}
          account={<SignInButton />}
        />
        <main style={{ padding: 12, background: 'var(--bg)' }}>{children}</main>
      </div>
    </MemoryRouter>
  );
}

/** The site's telemetry page on a comparison, replayed up to `replayDistance` */
function TelemetryPage({ telemetry, teams, replayDistance }: {
  telemetry: TelemetryDataMulti;
  teams: Record<string, string>;
  replayDistance?: number;
}) {
  const { getDriverColor, areTeammates } = useMemo(() => teamLookups(teams), [teams]);
  return (
    <Page height={PAGE.height}>
      <Telemetry telemetryData={telemetry} getDriverColor={getDriverColor} areTeammates={areTeammates} replayDistance={replayDistance} />
    </Page>
  );
}

/** The site's lap chart of a session, in its panel as the session explorer shows it */
function LapsPage(props: LapTimesChartProps) {
  return (
    <Page height={LAPS_PAGE.height}>
      <div style={{ position: 'relative', height: LAPS_PANEL.h, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)' }}>
        <LapTimesChart {...props} />
      </div>
    </Page>
  );
}

/** A page in a browser window, its toolbar above the page's origin */
function BrowserWindow({ children }: { children: ReactNode }) {
  return (
    <div style={{
      position: 'absolute', left: 0, top: -TOOLBAR, width: PAGE.width,
      borderRadius: 12, overflow: 'hidden', boxShadow: '0 40px 120px rgba(20,2,4,0.55), 0 0 0 1px rgba(20,2,4,0.35)',
    }}>
      <div style={{
        height: TOOLBAR, display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px',
        background: '#e2d9c6', borderBottom: '1px solid rgba(94,16,24,0.18)',
      }}>
        {[0, 1, 2].map(i => <span key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: 'rgba(28,4,7,0.16)' }} />)}
        <div style={{
          margin: '0 auto', transform: 'translateX(-24px)', display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 64px', borderRadius: 7, background: '#ede5d5',
          fontFamily: MONO, fontSize: 11, letterSpacing: '0.02em', color: 'rgba(28,4,7,0.62)',
        }}>
          <Lock size={10} />metrikdelta.com/app
        </div>
      </div>
      {children}
    </div>
  );
}

/** The telemetry page in its browser window */
export default function SiteWindow(props: Parameters<typeof TelemetryPage>[0]) {
  return <BrowserWindow><TelemetryPage {...props} /></BrowserWindow>;
}

/** The lap chart's page in its browser window */
export function LapsWindow(props: LapTimesChartProps) {
  return <BrowserWindow><LapsPage {...props} /></BrowserWindow>;
}
