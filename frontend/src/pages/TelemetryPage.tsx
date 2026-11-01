import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Link, Download, Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { CURRENT_SEASON_YEAR, LATEST_SEASON_YEAR } from '../utils/season';
import SEO from '../components/SEO';
import { sitePages } from '../seo/pages';
import PageHeader from '../components/PageHeader';
import SessionExplorer from '../components/SessionExplorer';
import { pairInSession } from '../components/sessionDrivers';
import TelemetryViewMulti from '../components/TelemetryViewMulti';
import LegalLinks from '../components/LegalLinks';
import { useIsMobile } from '../hooks/useIsMobile';
import { useRememberPageUrl } from '../hooks/usePageMemory';
import { getDrivers, getGrandsPrix, getTelemetryMulti, getCachedTelemetryMulti } from '../services/backend.service';
import type { TelemetryDataMulti, LapRef } from '../types/telemetry';
import type { GrandPrix, LapSelection, SessionDriver } from '../types/session';
import { teamColor } from '../utils/teamColors';

type ViewType = 'trace' | 'laps';

const MONO = 'JetBrains Mono, monospace';

function EmptyState({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, opacity: 0.45 }}>
      {loading
        ? <Loader2 size={26} className="animate-spin" style={{ color: 'var(--accent)' }} />
        : <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid var(--border-hi)' }} />}
      <p style={{ fontFamily: MONO, fontSize: 'var(--fs-11)', color: 'var(--text-2)', letterSpacing: '0.08em' }}>{message}</p>
    </div>
  );
}

const iconButton = (active: boolean, disabled = false) => ({
  padding: 6, border: 'none', background: 'transparent', outline: 'none',
  cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
  color: active ? 'var(--accent)' : 'var(--text-2)',
});

/** The comparison in the URL: `cmp` drivers and `cl` laps (DRIVER.lap), or
 * the older `v=trace&d1&d2[&la&lb]` links, which open as the same comparison. */
function comparisonFromUrl(params: URLSearchParams): { drivers: string[]; laps: LapSelection[] } {
  const cmp = (params.get('cmp') || '').split(',').filter(Boolean);
  const laps = (params.get('cl') || '').split(',').filter(Boolean).map(pair => {
    const [driver, lap] = pair.split('.');
    return { driver, lapNumber: parseInt(lap) };
  }).filter(l => l.driver && !Number.isNaN(l.lapNumber));
  if (cmp.length || params.get('v') !== 'trace') return { drivers: cmp, laps };

  const d1 = params.get('d1'), d2 = params.get('d2');
  if (!d1 || !d2) return { drivers: [], laps: [] };
  const la = parseInt(params.get('la') || ''), lb = parseInt(params.get('lb') || '');
  return {
    drivers: [d1, d2],
    laps: Number.isNaN(la) || Number.isNaN(lb) ? [] : [{ driver: d1, lapNumber: la }, { driver: d2, lapNumber: lb }],
  };
}

export default function TelemetryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
  useRememberPageUrl();

  const [activeView, setActiveView] = useState<ViewType>(() => (searchParams.get('v') as ViewType) || 'laps');
  const [urlCopied, setUrlCopied] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  // Drivers plotted in the explorer's lap-time chart (`ex` in the URL), kept
  // up here for the export button and across view or page switches
  const [explorerDrivers, setExplorerDrivers] = useState<string[]>(() => (searchParams.get('ex') || '').split(',').filter(Boolean));

  const [year, setYearRaw] = useState(() => parseInt(searchParams.get('y') || String(LATEST_SEASON_YEAR)));
  const [selectedGP, setGPRaw] = useState<number | null>(() => {
    const gp = searchParams.get('gp'); return gp ? parseInt(gp) : null;
  });
  const [sessionType, setSessionRaw] = useState<string | null>(() => searchParams.get('s') || null);
  const [driver1, setD1Raw] = useState(() => searchParams.get('d1') || '');
  const [driver2, setD2Raw] = useState(() => searchParams.get('d2') || '');

  const [drivers, setDrivers] = useState<SessionDriver[]>([]);
  const [grandsPrix, setGrandsPrix] = useState<GrandPrix[]>([]);
  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});

  const [multiTelemetryData, setMultiTelemetryData] = useState<TelemetryDataMulti | null>(null);
  const [comparedDrivers, setComparedDrivers] = useState<string[]>(() => comparisonFromUrl(searchParams).drivers);
  const [comparedLaps, setComparedLaps] = useState<LapSelection[]>(() => comparisonFromUrl(searchParams).laps);
  const [multiLoading, setMultiLoading] = useState(false);

  const getDriverColor = useCallback((code: string) => teamColor(driverTeams[code] || ''), [driverTeams]);
  const areTeammates = useCallback((a: string, b: string) => {
    const t1 = driverTeams[a], t2 = driverTeams[b];
    return !!(t1 && t2 && t1.toLowerCase() === t2.toLowerCase());
  }, [driverTeams]);

  const urlSyncReady = useRef(false);
  useEffect(() => {
    if (!urlSyncReady.current) { urlSyncReady.current = true; return; }
    const p: Record<string, string> = { y: String(year), v: activeView };
    if (selectedGP != null) p.gp = String(selectedGP);
    if (sessionType) p.s = sessionType;
    if (driver1) p.d1 = driver1;
    if (driver2) p.d2 = driver2;
    if (comparedDrivers.length > 0) p.cmp = comparedDrivers.join(',');
    if (comparedLaps.length > 0) p.cl = comparedLaps.map(l => `${l.driver}.${l.lapNumber}`).join(',');
    // Only when it says more than d1/d2 already do (the explorer's default)
    if (explorerDrivers.length && explorerDrivers.join(',') !== [driver1, driver2].filter(Boolean).join(',')) p.ex = explorerDrivers.join(',');
    setSearchParams(p, { replace: true });
  }, [year, selectedGP, sessionType, driver1, driver2, activeView, comparedDrivers, comparedLaps, explorerDrivers]); // eslint-disable-line react-hooks/exhaustive-deps

  // Bumped by every comparison started and every reset, so a slower URL
  // restore finishing afterwards can't overwrite them
  const multiGenRef = useRef(0);

  const resetComparison = useCallback(() => {
    multiGenRef.current++;
    setMultiTelemetryData(null);
    setComparedDrivers([]);
    setComparedLaps([]);
  }, []);

  // A year change resets the session and drivers. Compared with the previous
  // value rather than a first-run flag, which StrictMode's double effect run
  // would flip and wipe a deep link's selection.
  const prevYearRef = useRef(year);
  useEffect(() => {
    if (prevYearRef.current === year) return;
    prevYearRef.current = year;
    setGPRaw(null); setSessionRaw(null); setD1Raw(''); setD2Raw('');
    resetComparison();
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    getGrandsPrix(year).then(d => setGrandsPrix(d.grands_prix || [])).catch(() => {});
  }, [year]);

  // The session's drivers. A real session change resets the comparison; the
  // URL's own restored session (and comparison) doesn't.
  const prevGpSessionRef = useRef(`${year}|${selectedGP}|${sessionType}`);
  useEffect(() => {
    if (selectedGP == null || !sessionType) { setDrivers([]); return; }
    const key = `${year}|${selectedGP}|${sessionType}`;
    if (prevGpSessionRef.current !== key) { prevGpSessionRef.current = key; resetComparison(); }
    let cancelled = false;
    getDrivers(year, selectedGP, sessionType).then(data => {
      if (cancelled) return;
      setDrivers(data);
      setDriverTeams(Object.fromEntries(data.filter(d => d.abbreviation && d.team).map(d => [d.abbreviation, d.team])));
      // The default pair: kept for drivers who took part, filled in for the others
      if (data.length >= 2) {
        const [d1, d2] = pairInSession([driver1, driver2], data);
        if (d1 !== driver1) setD1Raw(d1);
        if (d2 !== driver2) setD2Raw(d2);
      }
    }).catch(e => console.error('loadDrivers:', e));
    return () => { cancelled = true; };
  }, [year, selectedGP, sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // The comparison restored from the URL, once
  const restoredMultiRef = useRef(false);
  useEffect(() => {
    if (restoredMultiRef.current) return;
    if (!comparedDrivers.length || selectedGP == null || !sessionType) return;
    restoredMultiRef.current = true;
    const gp = selectedGP, st = sessionType;
    // The exact laps that were compared, else each driver's fastest lap
    const laps: LapRef[] = comparedLaps.length
      ? comparedLaps.map(l => ({ year, gp, session: st, driver: l.driver, lap: l.lapNumber }))
      : comparedDrivers.map(d => ({ year, gp, session: st, driver: d }));
    const cachedMulti = getCachedTelemetryMulti(laps);
    if (cachedMulti) { setMultiTelemetryData(cachedMulti); return; }
    // Not cancelled on cleanup (that threw the result away mid-flight and left
    // the page stuck on "Loading telemetry…"): a newer comparison or a session
    // change supersedes it instead, through multiGenRef.
    const gen = multiGenRef.current;
    setMultiLoading(true);
    getTelemetryMulti(laps)
      .then(data => { if (multiGenRef.current === gen) setMultiTelemetryData(data); })
      .catch(e => console.error('restoreMultiTelemetry:', e))
      .finally(() => { if (multiGenRef.current === gen) setMultiLoading(false); });
  }, [comparedDrivers, selectedGP, sessionType, year]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Opens the trace view on these laps (or each driver's fastest when `laps` is empty). */
  const startComparison = useCallback(async (driversToCompare: string[], laps: LapSelection[]) => {
    if (!driversToCompare.length || selectedGP == null || !sessionType) return;
    const gp = selectedGP, st = sessionType;
    // Supersedes the one-time URL restore, which would fetch it a second time
    restoredMultiRef.current = true;
    multiGenRef.current++;
    setComparedDrivers(driversToCompare);
    setComparedLaps(laps);
    setD1Raw(driversToCompare[0]);
    setD2Raw(driversToCompare[1] || '');
    setActiveView('trace');

    const lapRefs: LapRef[] = laps.length
      ? laps.map(l => ({ year, gp, session: st, driver: l.driver, lap: l.lapNumber }))
      : driversToCompare.map(d => ({ year, gp, session: st, driver: d }));
    const cachedMulti = getCachedTelemetryMulti(lapRefs);
    if (cachedMulti) { setMultiTelemetryData(cachedMulti); return; }
    setMultiLoading(true);
    setMultiTelemetryData(null);
    try {
      setMultiTelemetryData(await getTelemetryMulti(lapRefs));
    } catch (e) {
      console.error('multiTelemetry:', e);
    } finally {
      setMultiLoading(false);
    }
  }, [year, selectedGP, sessionType]);

  const handleCompare = useCallback((driversToCompare: string[]) => startComparison(driversToCompare, []), [startComparison]);
  const handleCompareLaps = useCallback(
    (laps: LapSelection[]) => startComparison([...new Set(laps.map(l => l.driver))], laps),
    [startComparison],
  );

  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000);
    });
  }, []);

  // The lap-time chart in 16:9, or the telemetry stack at a fixed desktop
  // width (see utils/exportBrandedPng)
  const handleExportPng = useCallback(async () => {
    const isLaps = activeView === 'laps';
    const target = document.getElementById(isLaps ? 'laps-export-target' : 'telemetry-export-target');
    if (!target || exportingPng) return;
    setExportingPng(true);
    try {
      const metas = multiTelemetryData?.drivers ?? [];
      const driverLabels = isLaps
        ? explorerDrivers
        : metas.map(d => (metas.filter(x => x.driver === d.driver).length > 1 ? `${d.driver} L${d.lap}` : d.driver));
      const gpName = grandsPrix.find(g => g.round === selectedGP)?.name;
      const slug = [year, gpName, sessionType, ...driverLabels].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');

      const { exportBrandedPng } = await import('../utils/exportBrandedPng');
      await exportBrandedPng(target, {
        filename: `metrikdelta-${isLaps ? 'laptimes' : 'telemetry'}-${slug}.png`,
        layout: isLaps ? { width: 960, height: 540 } : { width: 1440 },
      });
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2000);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setExportingPng(false);
    }
  }, [activeView, exportingPng, explorerDrivers, multiTelemetryData, grandsPrix, selectedGP, sessionType, year]);

  const canExport = activeView === 'trace' ? !!multiTelemetryData : explorerDrivers.length > 0;

  return (
    <>
    <SEO page={sitePages(CURRENT_SEASON_YEAR).telemetry} />
    <div className="data-zone" style={{
      ...(isMobile ? { minHeight: '100vh', height: 'auto' } : { height: '100vh', overflow: 'hidden' }),
      display: 'grid',
      gridTemplateRows: isMobile ? 'auto 1fr' : '44px 1fr',
      gridTemplateColumns: 'minmax(0, 1fr)',
    }}>
      <PageHeader
        page="telemetry"
        leading={activeView === 'trace' && (
          <button
            onClick={() => setActiveView('laps')}
            aria-label="Back to the lap times"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', marginRight: 2,
              fontFamily: MONO, fontSize: 'var(--fs-9)', letterSpacing: '0.1em',
              color: 'var(--text-2)', background: 'transparent',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hi)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            ←
          </button>
        )}
        actions={<>
          <button
            onClick={handleShare}
            style={iconButton(urlCopied)}
            title="Copy link"
            onMouseEnter={e => { if (!urlCopied) e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { if (!urlCopied) e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            {urlCopied ? <Check size={14} /> : <Link size={14} />}
          </button>
          {canExport && (
            <button
              onClick={handleExportPng}
              disabled={exportingPng}
              style={iconButton(exportDone, exportingPng)}
              title="Download charts as PNG"
              onMouseEnter={e => { if (!exportDone) e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { if (!exportDone) e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              {exportDone ? <Check size={14} /> : <Download size={14} />}
            </button>
          )}
        </>}
      />

      <main style={{ overflow: isMobile ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        {activeView === 'trace' && (
          <div id="telemetry-export-target" style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--bg)' }}>
            {multiTelemetryData ? (
              <TelemetryViewMulti
                telemetryData={multiTelemetryData}
                getDriverColor={getDriverColor}
                areTeammates={areTeammates}
                loading={multiLoading}
              />
            ) : comparedDrivers.length > 0 ? (
              <EmptyState loading={multiLoading} message="Loading telemetry…" />
            ) : (
              <EmptyState message="Select drivers in Explorer first" />
            )}
          </div>
        )}

        {activeView === 'laps' && (
          <SessionExplorer
            year={year}
            onYearChange={setYearRaw}
            selectedGP={selectedGP}
            onGPChange={setGPRaw}
            grandsPrix={grandsPrix}
            sessionType={sessionType}
            onSessionChange={setSessionRaw}
            drivers={drivers}
            getDriverColor={getDriverColor}
            areTeammates={areTeammates}
            initialDrivers={explorerDrivers.length ? explorerDrivers : [driver1, driver2].filter(Boolean)}
            initialLapRefs={comparedLaps}
            onCompare={handleCompare}
            onCompareLaps={handleCompareLaps}
            onSelectedDriversChange={setExplorerDrivers}
          />
        )}
      </main>

      {/* Desktop: fixed in the corner (the page never scrolls). Mobile: at the end of the page. */}
      {isMobile ? (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize="var(--fs-8)" />
        </div>
      ) : (
        <div style={{ position: 'fixed', bottom: 8, left: 12, zIndex: 40 }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize="var(--fs-8)" />
        </div>
      )}
    </div>
    </>
  );
}
