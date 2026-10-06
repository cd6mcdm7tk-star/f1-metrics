import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Link, Zap, Download } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSubscription, CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { useTelemetryCache } from '../hooks/useTelemetryCache';
import { useAuth } from '../contexts/AuthContext';
import { getBackendUrl } from '../config';
import { supabase } from '../lib/supabase';
import UpgradeModal from '../components/UpgradeModal';
import AuthModal from '../components/AuthModal';
import SEO from '../components/SEO';
import SessionExplorer from '../components/SessionExplorer';
import LegalLinks from '../components/LegalLinks';
import { useIsMobile } from '../hooks/useIsMobile';
import { useRememberPageUrl, rememberedUrl } from '../hooks/usePageMemory';
import type { LapSelection } from '../components/SessionExplorer';
import TelemetryView from '../components/TelemetryView';
import TelemetryViewMulti from '../components/TelemetryViewMulti';
import {
  getDrivers,
  getGrandsPrix,
  getTelemetryComparison,
  getTelemetryMulti,
  getCachedTelemetryMulti,
} from '../services/backend.service';
import type { TelemetryData, TelemetryDataMulti, LapRef } from '../types/telemetry';
type ViewType = 'trace' | 'laps';
import { Loader2 } from 'lucide-react';

// ── Team colour map ────────────────────────────────────────────────────────────

// Recalibrated for the cream data-zone background, staying as close as
// possible to each team's real livery color — validated against WCAG
// contrast (all 12 pass >=3:1) with the original hue preserved throughout;
// only lightness/chroma shift where the official color was too washed-out
// to read on a light background (see dataviz skill / validate_palette.js).
// Haas is deliberately a near-neutral dark grey (their real livery color is
// grey, not a hue) — this fails the categorical "chroma floor" check by
// design; it reads fine in practice since it's the only achromatic entry
// among 11 saturated hues. Colorblind-safety is best-effort, not fully
// solved: Kick Sauber green vs Audi red, Aston Martin vs Ferrari, and
// Williams vs Red Bull (both blues) sit below the ideal separation floor.
// Every color is always paired with the driver-code text elsewhere in the
// UI, which is the required fallback for pairs this close — never rely on
// color alone to tell drivers apart in a printed/screenshotted view.
const TEAM_COLORS: Record<string, string> = {
  'red bull': '#3671C6', 'ferrari': '#E8002D', 'mercedes': '#008E87',
  'mclaren': '#EA4E00', 'alpine': '#CE5C91', 'aston martin': '#006A3D',
  'racing bulls': '#527AFF', 'rb': '#527AFF', 'alphatauri': '#527AFF',
  'haas': '#555555', 'kick sauber': '#008D00', 'sauber': '#008D00',
  'alfa romeo': '#C92D4B', 'williams': '#0088DE',
  'cadillac': '#0E49B1', 'audi': '#BB0A30',
};

// Readable session names for the exported image's context line.
const SESSION_NAMES: Record<string, string> = {
  Q: 'Qualifying', R: 'Race', S: 'Sprint', SQ: 'Sprint Qualifying',
};

const TEAMS_2026: Record<string, string> = {
  VER: 'Red Bull Racing', HAD: 'Red Bull Racing',
  LEC: 'Ferrari',         HAM: 'Ferrari',
  RUS: 'Mercedes',        ANT: 'Mercedes',
  NOR: 'McLaren',         PIA: 'McLaren',
  ALO: 'Aston Martin',    STR: 'Aston Martin',
  GAS: 'Alpine',          COL: 'Alpine',
  ALB: 'Williams',        SAI: 'Williams',
  OCO: 'Haas',            BEA: 'Haas',
  LAW: 'Racing Bulls',    LIN: 'Racing Bulls',
  HUL: 'Audi',            BOR: 'Audi',
  PER: 'Cadillac',        BOT: 'Cadillac',
};

function getTeamColor(teamName: string): string {
  const name = teamName.toLowerCase();
  for (const [key, color] of Object.entries(TEAM_COLORS)) {
    if (name.includes(key)) return color;
  }
  return '#f2e6d8';
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ message, loading }: { message: string; loading?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, opacity: 0.45 }}>
      {loading
        ? <Loader2 size={26} className="animate-spin" style={{ color: 'var(--accent)' }} />
        : <div style={{ width: 36, height: 36, borderRadius: '50%', border: '2px solid rgba(242,230,216,0.2)' }} />
      }
      <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.08em' }}>{message}</p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TelemetryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user, signOut } = useAuth();
  const { canAccessYear, isPremium, canMakeRequest, incrementRequest, isReady: subscriptionReady } = useSubscription();
  const { getCached, setCached, getTelemetryKey } = useTelemetryCache();
  useRememberPageUrl();

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeView, setActiveView] = useState<ViewType>(
    () => (searchParams.get('v') as ViewType) || 'laps',
  );
  const [authModalOpen, setAuthModalOpen]     = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [urlCopied, setUrlCopied]             = useState(false);
  const [exportingPng, setExportingPng]       = useState(false);
  const [exportDone, setExportDone]           = useState(false);
  // Drivers currently plotted in the explorer's lap-time chart — needed up
  // here for the export button (visibility + exported image's context), and
  // kept in the URL (`ex`) so they survive switching views or pages.
  const [explorerDrivers, setExplorerDrivers] = useState<string[]>(() => {
    const ex = searchParams.get('ex');
    return ex ? ex.split(',').filter(Boolean) : [];
  });

  // ── Session selectors ───────────────────────────────────────────────────────
  // Defaults to the latest FREE year (not the current season) so a free
  // user landing here fresh sees real data immediately instead of being
  // hit by the upgrade modal before they've done anything — matches
  // StatisticsPage's default, which never had this problem.
  const [year,        setYearRaw]    = useState(() => parseInt(searchParams.get('y')  || String(CURRENT_SEASON_YEAR - 1)));
  const [selectedGP,  setGPRaw]      = useState<number | null>(() => {
    const gp = searchParams.get('gp'); return gp ? parseInt(gp) : null;
  });
  const [sessionType, setSessionRaw] = useState<string | null>(() => searchParams.get('s') || null);
  const [driver1,     setD1Raw]      = useState(() => searchParams.get('d1') || '');
  const [driver2,     setD2Raw]      = useState(() => searchParams.get('d2') || '');

  // ── Data ────────────────────────────────────────────────────────────────────
  const [drivers,     setDrivers]    = useState<any[]>([]);
  const [grandsPrix,  setGrandsPrix] = useState<any[]>([]);
  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});
  const [loading,     setLoading]    = useState(false);

  // ── Session laps ─────────────────────────────────────────────────────────────
  const [selectedLap1, setSelectedLap1] = useState<number | null>(() => {
    const la = searchParams.get('la'); return la ? parseInt(la) : null;
  });
  const [selectedLap2, setSelectedLap2] = useState<number | null>(() => {
    const lb = searchParams.get('lb'); return lb ? parseInt(lb) : null;
  });

  // ── Telemetry ────────────────────────────────────────────────────────────────
  const [telemetryData,      setTelemetryData]      = useState<TelemetryData | null>(null);
  const [multiTelemetryData, setMultiTelemetryData] = useState<TelemetryDataMulti | null>(null);
  const [comparedDrivers,    setComparedDrivers]    = useState<string[]>(() => {
    const cmp = searchParams.get('cmp');
    return cmp ? cmp.split(',').filter(Boolean) : [];
  });
  // Specific laps being compared (picked in the explorer) — `cl` in the URL
  // as DRIVER.lap pairs, so the same laps come back rather than fastest laps.
  const [comparedLaps,       setComparedLaps]       = useState<LapSelection[]>(() =>
    (searchParams.get('cl') || '').split(',').filter(Boolean).map(pair => {
      const [driver, lap] = pair.split('.');
      return { driver, lapNumber: parseInt(lap) };
    }).filter(l => l.driver && !Number.isNaN(l.lapNumber)),
  );
  const [multiLoading,       setMultiLoading]       = useState(false);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const getDriverColor = useCallback(
    (code: string) => getTeamColor(driverTeams[code] || ''),
    [driverTeams],
  );
  const areTeammates = useCallback((a: string, b: string) => {
    const t1 = driverTeams[a], t2 = driverTeams[b];
    return !!(t1 && t2 && t1.toLowerCase() === t2.toLowerCase());
  }, [driverTeams]);

  // ── URL sync ─────────────────────────────────────────────────────────────────
  const urlSyncReady = useRef(false);
  useEffect(() => {
    if (!urlSyncReady.current) { urlSyncReady.current = true; return; }
    const p: Record<string, string> = { y: String(year), v: activeView };
    if (selectedGP != null) p.gp = String(selectedGP);
    if (sessionType) p.s = sessionType;
    if (driver1) p.d1 = driver1;
    if (driver2) p.d2 = driver2;
    if (selectedLap1) p.la = String(selectedLap1);
    if (selectedLap2) p.lb = String(selectedLap2);
    if (comparedDrivers.length > 0) p.cmp = comparedDrivers.join(',');
    if (comparedLaps.length > 0) p.cl = comparedLaps.map(l => `${l.driver}.${l.lapNumber}`).join(',');
    // Only when it says more than d1/d2 already do (the explorer's default)
    if (explorerDrivers.join(',') !== [driver1, driver2].filter(Boolean).join(',')) p.ex = explorerDrivers.join(',');
    setSearchParams(p, { replace: true });
  }, [year, selectedGP, sessionType, driver1, driver2, selectedLap1, selectedLap2, activeView, comparedDrivers, comparedLaps, explorerDrivers]);

  // Bumped by every comparison the user starts and by every reset, so a
  // slower URL restore finishing afterwards can't overwrite them.
  const multiGenRef = useRef(0);

  // ── Reset helpers ─────────────────────────────────────────────────────────────
  const resetData = useCallback(() => {
    multiGenRef.current++;
    setTelemetryData(null);
    setMultiTelemetryData(null);
    setComparedDrivers([]);
    setComparedLaps([]);
  }, []);

  // ── Year → reset GP + session + drivers ──────────────────────────────────────
  // Skip on mount — this would otherwise wipe out everything just restored
  // from the URL (gp/session/drivers/comparison) before it's ever shown.
  // Compares the actual year value rather than a "first run" boolean flipped
  // inside the effect: StrictMode's dev-only double invocation would flip
  // the flag on the first (throwaway) run and make the second look like a
  // real year change, wiping a deep link's selection (same fix as
  // StatisticsPage).
  const prevYearRef = useRef(year);
  useEffect(() => {
    if (prevYearRef.current === year) return;
    prevYearRef.current = year;
    setGPRaw(null); setSessionRaw(null); setD1Raw(''); setD2Raw('');
    setSelectedLap1(null); setSelectedLap2(null);
    resetData();
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── GP list ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    getGrandsPrix(year).then(d => setGrandsPrix(d.grands_prix || [])).catch(() => {});
  }, [year]);

  // ── Load drivers + pre-fetch telemetry ─────────────────────────────────────────
  const prevGpSessionRef = useRef(`${year}|${selectedGP}|${sessionType}`);
  useEffect(() => {
    if (selectedGP == null || !sessionType) { setDrivers([]); return; }
    const gp = selectedGP, st = sessionType;
    let cancelled = false;
    // Don't reset when this is just the URL's own restored gp+session
    // (including a possibly-restored multi-driver comparison) — only on a
    // real change. Value comparison, not a first-run flag, for the same
    // StrictMode reason as the year effect above.
    const key = `${year}|${gp}|${st}`;
    if (prevGpSessionRef.current !== key) { prevGpSessionRef.current = key; resetData(); }
    async function run() {
      try {
        const data = await getDrivers(year, gp, st);
        if (cancelled) return;
        setDrivers(data);
        const teamsMap: Record<string, string> = {};
        data.forEach((d: any) => { if (d.abbreviation && d.team) teamsMap[d.abbreviation] = d.team; });
        if (year === 2026) {
          Object.entries(TEAMS_2026).forEach(([code, team]) => { if (!teamsMap[code]) teamsMap[code] = team; });
        }
        setDriverTeams(teamsMap);
        if (data.length >= 2) {
          const d1 = driver1 || data[0].abbreviation;
          const d2 = driver2 || data[1].abbreviation;
          if (!driver1) setD1Raw(d1);
          if (!driver2) setD2Raw(d2);
          // Pre-fetch fastest laps into cache (no request counter increment)
          const key = getTelemetryKey(year, gp, st, d1, undefined, d2, undefined);
          if (!getCached(key)) {
            getTelemetryComparison(year, gp, st, d1, d2)
              .then(pre => { if (!cancelled) setCached(key, pre); })
              .catch(() => {});
          }
        }
      } catch (e) { console.error('loadDrivers:', e); }
    }
    run();
    return () => { cancelled = true; };
  }, [year, selectedGP, sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load telemetry (legacy 2-driver path) ─────────────────────────────────────
  useEffect(() => {
    if (!driver1 || !driver2) return;
    if (selectedGP == null || !sessionType) return;
    // A multi-driver comparison is active (or being restored) — d1/d2 are just
    // its first two drivers, not a real 2-driver comparison, so don't waste a
    // request fetching legacy data that will never be shown.
    if (comparedDrivers.length > 0) return;
    const gp = selectedGP, st = sessionType;
    let cancelled = false;
    const key = getTelemetryKey(year, gp, st, driver1, selectedLap1 ?? undefined, driver2, selectedLap2 ?? undefined);
    const cached = getCached<TelemetryData>(key);
    if (cached) { setTelemetryData(cached); return; }
    if (!canMakeRequest) { setShowUpgradeModal(true); return; }
    setLoading(true);
    getTelemetryComparison(
      year, gp, st,
      driver1, driver2,
      selectedLap1 ?? undefined, selectedLap2 ?? undefined,
    ).then(data => {
      if (cancelled) return;
      setTelemetryData(data);
      setCached(key, data);
      incrementRequest();
    }).catch(e => console.error('loadTelemetry:', e))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; setLoading(false); };
  }, [driver1, driver2, selectedLap1, selectedLap2, year, selectedGP, sessionType, comparedDrivers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Restore a multi-driver comparison from the URL on load ───────────────────
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
    // Already loaded during this visit (e.g. back from Statistics): shown
    // straight away, and not counted as a new request.
    const cachedMulti = getCachedTelemetryMulti(laps);
    if (cachedMulti) { setMultiTelemetryData(cachedMulti); return; }
    if (!canMakeRequest) { setShowUpgradeModal(true); return; }
    // Deliberately not cancelled on cleanup: this effect's deps
    // (canMakeRequest, incrementRequest…) change identity while the request
    // is in flight — e.g. once the subscription status loads — and
    // cancelling then threw the result away, leaving the page stuck on
    // "Loading telemetry…". What supersedes it is a newer comparison or a
    // session change (multiGenRef).
    const gen = multiGenRef.current;
    setMultiLoading(true);
    getTelemetryMulti(laps)
      .then(data => {
        if (multiGenRef.current !== gen) return;
        setMultiTelemetryData(data);
        incrementRequest();
      })
      .catch(e => console.error('restoreMultiTelemetry:', e))
      .finally(() => { if (multiGenRef.current === gen) setMultiLoading(false); });
  }, [comparedDrivers, selectedGP, sessionType, year, canMakeRequest, incrementRequest]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Year guard ────────────────────────────────────────────────────────────────
  // Was `y !== 2026 && !canAccessYear(y)` — that exempted exactly the one
  // year (2026, the current season) this guard exists to gate, so free
  // users could switch straight into it with no paywall at all.
  const handleYearChange = useCallback((y: number) => {
    if (y >= CURRENT_SEASON_YEAR && !canAccessYear(y)) { setShowUpgradeModal(true); return; }
    setYearRaw(y);
  }, [canAccessYear]);

  // A `y=<current season>` URL (or the default year itself, which is the
  // current season) restores straight into state before any paywall check
  // — once subscription status is actually known, bounce back to the
  // latest free year if this viewer isn't entitled (same pattern as
  // StatisticsPage).
  useEffect(() => {
    if (subscriptionReady && year >= CURRENT_SEASON_YEAR && !canAccessYear(year)) {
      setYearRaw(CURRENT_SEASON_YEAR - 1);
      setShowUpgradeModal(true);
    }
  }, [subscriptionReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Compare specific laps (from SessionExplorer lap selection) ──────────────
  const handleCompareLaps = useCallback(async (laps: LapSelection[]) => {
    if (!laps.length || selectedGP == null || !sessionType) return;
    const gp = selectedGP, st = sessionType;
    const uniqueDrivers = [...new Set(laps.map(l => l.driver))];
    // Supersedes the one-time URL restore, which would otherwise fire on
    // this same comparedDrivers change and fetch (and count) it a second time
    restoredMultiRef.current = true;
    multiGenRef.current++;
    setComparedDrivers(uniqueDrivers);
    setComparedLaps(laps);
    setD1Raw(uniqueDrivers[0]);
    setD2Raw(uniqueDrivers[1] || '');
    setSelectedLap1(null);
    setSelectedLap2(null);
    setActiveView('trace');

    const lapRefs: LapRef[] = laps.map(l => ({
      year, gp, session: st, driver: l.driver, lap: l.lapNumber,
    }));
    const cachedMulti = getCachedTelemetryMulti(lapRefs);
    if (cachedMulti) { setMultiTelemetryData(cachedMulti); return; }
    if (!canMakeRequest) { setShowUpgradeModal(true); return; }
    setMultiLoading(true);
    setMultiTelemetryData(null);
    try {
      const data = await getTelemetryMulti(lapRefs);
      setMultiTelemetryData(data);
      incrementRequest();
    } catch (e) {
      console.error('compareLaps:', e);
    } finally {
      setMultiLoading(false);
    }
  }, [year, selectedGP, sessionType, canMakeRequest, incrementRequest]);

  // ── Compare N drivers (from SessionExplorer) ─────────────────────────────────
  const handleCompare = useCallback(async (driversToCompare: string[]) => {
    if (!driversToCompare.length || selectedGP == null || !sessionType) return;
    const gp = selectedGP, st = sessionType;
    restoredMultiRef.current = true; // see handleCompareLaps
    multiGenRef.current++;
    setComparedDrivers(driversToCompare);
    setComparedLaps([]);
    setD1Raw(driversToCompare[0]);
    setD2Raw(driversToCompare[1] || '');
    setSelectedLap1(null);
    setSelectedLap2(null);
    setActiveView('trace');

    const laps: LapRef[] = driversToCompare.map(d => ({
      year, gp, session: st, driver: d,
    }));
    const cachedMulti = getCachedTelemetryMulti(laps);
    if (cachedMulti) { setMultiTelemetryData(cachedMulti); return; }
    if (!canMakeRequest) { setShowUpgradeModal(true); return; }
    setMultiLoading(true);
    setMultiTelemetryData(null);
    try {
      const data = await getTelemetryMulti(laps);
      setMultiTelemetryData(data);
      incrementRequest();
    } catch (e) {
      console.error('multiTelemetry:', e);
    } finally {
      setMultiLoading(false);
    }
  }, [year, selectedGP, sessionType, canMakeRequest, incrementRequest]);

  // ── Share ─────────────────────────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true); setTimeout(() => setUrlCopied(false), 2000);
    });
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const effectiveD1 = telemetryData?.driver1 || driver1;
  const effectiveD2 = telemetryData?.driver2 || driver2;

  // ── PNG export ───────────────────────────────────────────────────────────────
  // Works from both views: the full telemetry trace stack, or the lap-time
  // chart in the explorer. The exported image gets a branded footer with
  // this session's context (see utils/exportBrandedPng).
  const handleExportPng = useCallback(async () => {
    const isLaps = activeView === 'laps';
    const target = document.getElementById(isLaps ? 'laps-export-target' : 'telemetry-export-target');
    if (!target || exportingPng) return;
    setExportingPng(true);
    try {
      let driverLabels: string[];
      if (isLaps) {
        driverLabels = explorerDrivers;
      } else if (multiTelemetryData) {
        const metas = multiTelemetryData.drivers;
        driverLabels = metas.map(d => (metas.filter(x => x.driver === d.driver).length > 1 ? `${d.driver} L${d.lap}` : d.driver));
      } else {
        driverLabels = [effectiveD1, effectiveD2].filter(Boolean);
      }
      const gpName = grandsPrix.find(g => g.round === selectedGP)?.name;
      const sessionName = sessionType ? (SESSION_NAMES[sessionType] ?? sessionType) : null;
      const context = [
        String(year), gpName, sessionName, isLaps ? 'Lap times' : null, driverLabels.join(' vs '),
      ].filter(Boolean).join(' · ');
      const slug = [year, gpName, sessionType, ...driverLabels].filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]+/g, '');

      const { exportBrandedPng } = await import('../utils/exportBrandedPng');
      await exportBrandedPng(target, {
        filename: `metrikdelta-${isLaps ? 'laptimes' : 'telemetry'}-${slug}.png`,
        context,
      });
      setExportDone(true);
      setTimeout(() => setExportDone(false), 2000);
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setExportingPng(false);
    }
  }, [activeView, exportingPng, explorerDrivers, multiTelemetryData, effectiveD1, effectiveD2, grandsPrix, selectedGP, sessionType, year]);

  // ── Customer portal ───────────────────────────────────────────────────────────
  const handleManageSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const res = await fetch(`${getBackendUrl()}/api/customer-portal/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.portal_url) window.location.href = data.portal_url;
    } catch (e) { console.error('portal:', e); }
  }, [user]);
  void handleManageSubscription; // used by future account menu

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  const isExplorer = activeView === 'laps';

  return (
    <>
    <SEO
      path="/app"
      title="F1 Telemetry Comparison — Speed, Throttle & Brake Charts | METRIK DELTA"
      description={`Compare any two Formula 1 drivers' telemetry lap by lap: speed, throttle, braking, gear shifts, sector times and tire strategy for every session from 2018 to ${CURRENT_SEASON_YEAR}.`}
      keywords="f1 telemetry comparison, formula 1 speed trace, f1 throttle brake data, f1 lap comparison, f1 sector times, f1 tire strategy, télémétrie f1"
      structuredData={{
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": "F1 Telemetry Comparison",
        "description": "Compare Formula 1 drivers' telemetry lap by lap — speed, throttle, braking, gear and tire strategy.",
        "url": "https://metrikdelta.com/app",
        "breadcrumb": {
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://metrikdelta.com" },
            { "@type": "ListItem", "position": 2, "name": "Telemetry", "item": "https://metrikdelta.com/app" }
          ]
        }
      }}
    />
    <div className="data-zone" style={{
      ...(isMobile ? { minHeight: '100vh', height: 'auto' } : { height: '100vh', overflow: 'hidden' }),
      display: 'grid',
      gridTemplateRows: isMobile ? 'auto 1fr' : '44px 1fr',
      gridTemplateColumns: 'minmax(0, 1fr)',
    }}>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10,
        flexWrap: isMobile ? 'wrap' : 'nowrap',
        paddingLeft: 12, paddingRight: 10,
        paddingTop: isMobile ? 8 : 0, paddingBottom: isMobile ? 8 : 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--bg)', flexShrink: 0,
        position: 'relative',
      }}>
        {!isExplorer && (
          <button
            onClick={() => setActiveView('laps')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '3px 8px', marginRight: 2,
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 9, letterSpacing: '0.1em',
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

        <span className="font-rajdhani font-black text-sm tracking-[0.12em]">
          <span style={{ color: 'var(--text)' }}>METRIK</span>
          <span style={{ color: 'var(--accent)' }}> DELTA</span>
        </span>

        {/* Telemetry / Statistics — top-level feature switch, distinct from
            the trace/laps view tabs within Telemetry itself. Absolutely
            centered so it stays put regardless of what's in the side slots. */}
        <div style={{
          display: 'flex',
          order: isMobile ? 3 : undefined,
          flexBasis: isMobile ? '100%' : undefined,
          justifyContent: isMobile ? 'center' : undefined,
          position: isMobile ? 'static' : 'absolute',
          left: isMobile ? undefined : '50%', transform: isMobile ? undefined : 'translateX(-50%)',
          border: '1px solid var(--border)', borderRadius: 'var(--r)', overflow: 'hidden',
        }}>
          <span style={{
            padding: '3px 9px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
            background: 'var(--accent-10)', color: 'var(--accent)',
          }}>
            Telemetry
          </span>
          <button
            onClick={() => navigate(rememberedUrl('/stats'))}
            style={{
              padding: '3px 9px',
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.1em',
              background: 'transparent', color: 'var(--text-2)',
              border: 'none', borderLeft: '1px solid var(--border)',
              cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            Statistics
          </button>
        </div>

        {!isMobile && <div style={{ flex: 1 }} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 2 : 0, marginLeft: isMobile ? 'auto' : 0 }}>
        {isPremium && (
          <span style={{
            display: 'flex', alignItems: 'center', gap: 3,
            padding: '1px 6px', borderRadius: 'var(--r)',
            fontSize: 9, fontFamily: 'Rajdhani, sans-serif', fontWeight: 900,
            background: 'var(--accent-10)', color: 'var(--accent)',
            border: '1px solid var(--accent-20)', marginRight: isMobile ? 0 : 4,
          }}>
            <Zap size={9} />PRO
          </span>
        )}

        <button
          onClick={handleShare}
          style={{ padding: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: urlCopied ? 'var(--accent)' : 'var(--text-2)', outline: 'none' }}
          title="Copy link"
          onMouseEnter={e => { if (!urlCopied) e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { if (!urlCopied) e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          {urlCopied ? <Check size={14} /> : <Link size={14} />}
        </button>

        {((activeView === 'trace' && (multiTelemetryData || telemetryData)) || (activeView === 'laps' && explorerDrivers.length > 0)) && (
          <button
            onClick={handleExportPng}
            disabled={exportingPng}
            style={{ padding: 6, border: 'none', background: 'transparent', cursor: exportingPng ? 'not-allowed' : 'pointer', color: exportDone ? 'var(--accent)' : 'var(--text-2)', outline: 'none', opacity: exportingPng ? 0.5 : 1 }}
            title="Download charts as PNG"
            onMouseEnter={e => { if (!exportDone) e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { if (!exportDone) e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            {exportDone ? <Check size={14} /> : <Download size={14} />}
          </button>
        )}

        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: 'var(--text-2)' }}>
              {user.email?.split('@')[0]}
            </span>
            <button
              onClick={() => signOut()}
              style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
                border: '1px solid var(--border)', borderRadius: 'var(--r)',
                padding: '2px 7px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
              }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: 9,
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              padding: '3px 8px', background: 'transparent', color: 'var(--text-2)', cursor: 'pointer', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.borderColor = 'var(--border-hi)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            Sign in
          </button>
        )}
        </div>
      </header>


      {/* ── BODY ────────────────────────────────────────────────────────────── */}
      <main style={{ overflow: isMobile ? 'visible' : 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>

        {/* TRACE — chart stack */}
        {activeView === 'trace' && (
          <div id="telemetry-export-target" style={{ flex: 1, overflowY: 'auto', padding: 12, background: 'var(--bg)' }}>
            {/* Multi path: used whenever the compare button was clicked */}
            {comparedDrivers.length > 0 ? (
              multiTelemetryData ? (
                <TelemetryViewMulti
                  telemetryData={multiTelemetryData}
                  getDriverColor={getDriverColor}
                  areTeammates={areTeammates}
                  loading={multiLoading}
                />
              ) : (
                <EmptyState loading={multiLoading} message="Loading telemetry…" />
              )
            ) : telemetryData ? (
              /* Legacy 2-driver path (direct controlbar selectors) */
              <TelemetryView
                telemetryData={telemetryData}
                driver1={effectiveD1}
                driver2={effectiveD2}
                sessionType={sessionType}
                lapNumber={selectedLap1}
                getDriverColor={getDriverColor}
                areTeammates={areTeammates}
                loading={loading}
              />
            ) : (
              <EmptyState
                loading={loading}
                message="Select drivers in Explorer first"
              />
            )}
          </div>
        )}

        {/* LAPS — session explorer (GP Tempo layout) */}
        {activeView === 'laps' && (
          <SessionExplorer
            year={year}
            onYearChange={handleYearChange}
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

      {/* ── Legal links ──────────────────────────────────────────────────────
          Fixed to the corner on desktop (page never scrolls, so it can't
          overlap anything); on mobile the page does scroll, so a fixed
          position would sit on top of content forever — render it inline
          at the end of the scrollable flow instead. */}
      {isMobile ? (
        <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'center' }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize={8} />
        </div>
      ) : (
        <div style={{ position: 'fixed', bottom: 8, left: 12, zIndex: 40 }}>
          <LegalLinks color="var(--text-3)" hoverColor="var(--text)" fontSize={8} />
        </div>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="current_season" />
    </div>
    </>
  );
}
