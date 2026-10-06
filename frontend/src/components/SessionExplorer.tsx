import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useTelemetryCache } from '../hooks/useTelemetryCache';
import { useIsMobile } from '../hooks/useIsMobile';
import { getApiBase } from '../config';
import type { LapData } from '../types/session';
import { compoundColor } from '../utils/compoundColors';
import Watermark from './Watermark';

// ── Constants ─────────────────────────────────────────────────────────────────

const YEARS    = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
const SESSIONS = ['Q', 'R', 'FP1', 'FP2', 'FP3'];
const SPRINT_SESSIONS = ['SQ', 'S'];
const SESSION_LABELS: Record<string, string> = {
  Q: 'Qualifying', R: 'Race', S: 'Sprint', SQ: 'Sprint Qualifying',
};

// A later teammate doesn't reuse the team colour (indistinguishable from
// their teammate's line), but every later teammate used to fall back to
// the SAME black — so with 2+ teammate pairs selected at once, drivers
// from DIFFERENT teams all rendered as identical black lines. Each team
// needing a differentiator now gets its own colour from this palette
// instead (first team to need one → black, second → purple, etc.), picked
// to not collide with any real team's own color.
const TEAMMATE_PALETTE = ['#000000', '#6B2D8E', '#7B4B27', '#B8860B', '#4A5568', '#8B3A62'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(s: number | null | undefined): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toFixed(3).padStart(6, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, placeholder, disabled }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <span style={{
        display: 'block', marginBottom: 5,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase',
        color: 'var(--text-3)',
      }}>
        {label}
      </span>
      <select
        value={value}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        style={{
          width: '100%', padding: '7px 28px 7px 10px',
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r)',
          color: disabled ? 'var(--text-3)' : 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
          outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          appearance: 'none' as any,
          backgroundImage: 'none',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          WebkitAppearance: 'none' as any,
          transition: 'opacity 0.15s',
        }}
      >
        {placeholder && (
          <option value="" disabled>{placeholder}</option>
        )}
        {options.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface LapSelection { driver: string; lapNumber: number; }

interface SessionExplorerProps {
  year: number;
  onYearChange: (y: number) => void;
  selectedGP: number | null;
  onGPChange: (gp: number) => void;
  grandsPrix: any[];
  sessionType: string | null;
  onSessionChange: (s: string) => void;
  drivers: any[];
  getDriverColor: (code: string) => string;
  areTeammates: (a: string, b: string) => boolean;
  /** Drivers plotted when the explorer opens or the session changes. */
  initialDrivers: string[];
  /** Laps already picked (restored with the page), highlighted on open. */
  initialLapRefs?: LapSelection[];
  onCompare: (drivers: string[]) => void;
  onCompareLaps: (laps: LapSelection[]) => void;
  /** Lets the parent know which drivers are plotted (drives its PNG export button). */
  onSelectedDriversChange?: (drivers: string[]) => void;
}

// ── Custom chart dot (clickable, colored by tire compound, highlights selection) ─

function ChartDot(props: any) {
  const { cx, cy, stroke, payload, dataKey, selectedLapRefs, onToggle } = props;
  const lapNumber: number = payload?.lapNumber;
  const value = payload?.[dataKey];
  if (value == null || cx == null || cy == null) return null;
  const isSelected = selectedLapRefs?.some(
    (l: LapSelection) => l.driver === dataKey && l.lapNumber === lapNumber,
  );
  const compound = payload?.[`${dataKey}__compound`];
  const fillColor = isSelected ? stroke : (compoundColor(compound) || 'var(--bg)');

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // don't also trigger the chart-level onClick below
    onToggle?.(dataKey, lapNumber);
  };

  return (
    <g>
      {/* Bigger invisible hit-area — this is the sole click mechanism now, so
          make it generous (14px radius vs a 3-4px visible dot) */}
      <circle cx={cx} cy={cy} r={14} fill="transparent" style={{ cursor: 'pointer', pointerEvents: 'all' }} onClick={handleClick} />
      {/* No `style` prop here on purpose: the draw-in/retract animation sets
          this circle's opacity/transition by writing directly to its style
          attribute, and if React also controlled `style` on this element it
          would reset those inline writes back to whatever's declared here on
          every unrelated re-render (hover, tooltip...), wiping the fade
          mid-flight. `pointer-events: none` is a plain CSS rule instead —
          see [data-visible-dot] in index.css. */}
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

// ── Component ─────────────────────────────────────────────────────────────────

export default function SessionExplorer({
  year, onYearChange,
  selectedGP, onGPChange, grandsPrix,
  sessionType, onSessionChange,
  drivers, getDriverColor, areTeammates,
  initialDrivers, initialLapRefs,
  onCompare,
  onCompareLaps,
  onSelectedDriversChange,
}: SessionExplorerProps) {
  const isMobile = useIsMobile();

  const [selectedDrivers,  setSelectedDrivers]  = useState<string[]>(() =>
    initialDrivers,
  );
  useEffect(() => { onSelectedDriversChange?.(selectedDrivers); }, [selectedDrivers]); // eslint-disable-line react-hooks/exhaustive-deps
  const [lapDataMap,   setLapDataMap]   = useState<Map<string, LapData>>(new Map());
  const [loadingSet,   setLoadingSet]   = useState<Set<string>>(new Set());
  const [selectedLapRefs, setSelectedLapRefs] = useState<LapSelection[]>(() => initialLapRefs ?? []);
  // Drivers mid-retract-animation after being deselected — kept rendered in
  // the chart (not the legend/table) just long enough to play the reverse
  // draw animation, then dropped.
  const [retractingDrivers, setRetractingDrivers] = useState<string[]>([]);
  // Laps more than 5s off the comparison's best are hidden from the chart by
  // default (pit laps, safety car, red flag...) so they don't blow out the
  // y-scale — this reveals them without touching the table below, which
  // already shows every lap regardless.
  const [showOutliers, setShowOutliers] = useState(false);
  // Briefly flips the lines' own isAnimationActive on so Recharts morphs the
  // curve between its old and new shape (values changing, not points being
  // added/removed) — separate from the custom draw-in/retract stroke system,
  // which needs isAnimationActive off to keep control of the path style.
  const [outlierAnimActive, setOutlierAnimActive] = useState(false);
  const outlierMountedRef = useRef(false);
  useEffect(() => {
    if (!outlierMountedRef.current) { outlierMountedRef.current = true; return; }
    setOutlierAnimActive(true);
    const t = setTimeout(() => setOutlierAnimActive(false), 550);
    return () => clearTimeout(t);
  }, [showOutliers]);

  const { getCached, setCached, getSessionLapsKey } = useTelemetryCache();
  const API = getApiBase();

  // ── Reset on session change ────────────────────────────────────────────────
  // Only on a real change, not on mount — that would drop the laps restored
  // with the page. Value comparison rather than a first-run flag, which
  // StrictMode's dev-only double effect run would flip (same fix as
  // TelemetryPage).
  const sessionKey = `${year}|${selectedGP}|${sessionType}`;
  const prevSessionKeyRef = useRef(sessionKey);
  useEffect(() => {
    if (prevSessionKeyRef.current === sessionKey) return;
    prevSessionKeyRef.current = sessionKey;
    setLapDataMap(new Map());
    setSelectedDrivers(initialDrivers);
    setSelectedLapRefs([]);
    setRetractingDrivers([]);
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle specific lap ref ────────────────────────────────────────────────
  const toggleLapRef = useCallback((driver: string, lapNumber: number) => {
    setSelectedLapRefs(prev => {
      const exists = prev.some(l => l.driver === driver && l.lapNumber === lapNumber);
      return exists
        ? prev.filter(l => !(l.driver === driver && l.lapNumber === lapNumber))
        : [...prev, { driver, lapNumber }];
    });
  }, []);

  // ── Load driver laps ───────────────────────────────────────────────────────
  const loadDriver = useCallback(async (code: string) => {
    if (selectedGP == null || !sessionType) return;
    const gp = selectedGP, st = sessionType;
    const key = getSessionLapsKey(year, gp, st, code);
    const cached = getCached<LapData>(key);
    if (cached) {
      setLapDataMap(prev => prev.has(code) ? prev : new Map(prev).set(code, cached));
      return;
    }
    setLoadingSet(prev => new Set(prev).add(code));
    try {
      const r = await fetch(`${API}/session-laps/${year}/${gp}/${st}/${code}`);
      if (!r.ok) return;
      const d: LapData = await r.json();
      setCached(key, d);
      setLapDataMap(prev => new Map(prev).set(code, d));
    } catch { /* ignore */ } finally {
      setLoadingSet(prev => { const s = new Set(prev); s.delete(code); return s; });
    }
  }, [year, selectedGP, sessionType, API, getCached, setCached, getSessionLapsKey]);

  // Load initial drivers on mount / session change
  useEffect(() => {
    initialDrivers.forEach(loadDriver);
  }, [year, selectedGP, sessionType]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toggle driver ──────────────────────────────────────────────────────────
  const toggleDriver = useCallback((code: string) => {
    setSelectedDrivers(prev => {
      if (prev.includes(code)) return prev.filter(d => d !== code);
      loadDriver(code);
      return [...prev, code];
    });
  }, [loadDriver]);

  // ── Resolve a plotted driver's color — a later teammate gets a distinct
  //    neutral marker instead of the identical team color, with each team
  //    needing one getting its own color from TEAMMATE_PALETTE instead of
  //    every team's extra driver colliding on the same black ─────────────────
  const teammateColorByCode = useMemo(() => {
    const map: Record<string, string> = {};
    const colorByAnchor = new Map<string, string>();
    selectedDrivers.forEach((code, idx) => {
      const anchor = selectedDrivers.slice(0, idx).find(prev => prev !== code && areTeammates(prev, code));
      if (!anchor) return;
      let color = colorByAnchor.get(anchor);
      if (!color) {
        color = TEAMMATE_PALETTE[colorByAnchor.size % TEAMMATE_PALETTE.length];
        colorByAnchor.set(anchor, color);
      }
      map[code] = color;
    });
    return map;
  }, [selectedDrivers, areTeammates]);

  const resolveColor = useCallback((code: string) => {
    return teammateColorByCode[code] ?? getDriverColor(code);
  }, [teammateColorByCode, getDriverColor]);

  // Chart-only superset: keeps a just-deselected driver's line + data around
  // for the length of its retract animation, without it lingering in the
  // legend/driver-picker/table (those go straight off `selectedDrivers`).
  const renderedDrivers = useMemo(
    () => [...selectedDrivers, ...retractingDrivers.filter(d => !selectedDrivers.includes(d))],
    [selectedDrivers, retractingDrivers],
  );

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(() => {
    const allNums = new Set<number>();
    renderedDrivers.forEach(code => {
      lapDataMap.get(code)?.laps.forEach(l => { if (l.LapTime) allNums.add(l.LapNumber); });
    });
    const allTimes = renderedDrivers.flatMap(code =>
      lapDataMap.get(code)?.laps.map(l => l.LapTime).filter(Boolean) ?? [],
    ) as number[];
    const best = allTimes.length ? Math.min(...allTimes) : Infinity;

    return Array.from(allNums).sort((a, b) => a - b).map(lapNumber => {
      const row: Record<string, any> = { lapNumber };
      renderedDrivers.forEach(code => {
        const lap = lapDataMap.get(code)?.laps.find(l => l.LapNumber === lapNumber);
        const t = lap?.LapTime ?? null;
        row[code] = t && (showOutliers || t <= best + 5) ? t : null;
        row[`${code}__compound`] = lap?.Compound ?? null;
      });
      return row;
    });
  }, [renderedDrivers, lapDataMap, showOutliers]);

  const yDomain = useMemo((): [number, number] => {
    const times = chartData.flatMap(d =>
      renderedDrivers.map(c => d[c]).filter(Boolean),
    ) as number[];
    if (!times.length) return [60, 120];
    return [Math.floor(Math.min(...times) - 0.5), Math.ceil(Math.max(...times) + 0.5)];
  }, [chartData, renderedDrivers]);

  // ── Draw-in / retract animation, with dots synced to the line ─────────────
  // A line traces itself in when genuinely new (session change, or a driver
  // added to an existing comparison) and reverse-traces out when deselected.
  // Dots fade in/out in step with the line reaching their x-position instead
  // of popping in ahead of it. Never replays on hover, lap-click, tooltip,
  // zoom, or lap-time selection.
  //
  // A per-driver "generation" counter guards a fast re-toggle of the same
  // driver: starting any animation for a code bumps its generation, and a
  // completion callback checks its own captured generation against the
  // current one before touching shared state — a stale callback from an
  // animation that got superseded mid-flight just no-ops instead of leaving
  // `retractingDrivers`/`startedRetractRef` permanently stuck (which is what
  // was silently breaking the animation after a fast select/deselect).
  const chartWrapRef = useRef<HTMLDivElement>(null);
  const chartKey = `${year}-${selectedGP}-${sessionType}`;
  const driversSignature = selectedDrivers.join(',');
  const prevChartKeyRef = useRef(chartKey);
  const prevDriversRef = useRef<string[]>([]);
  const prevSelectedRef = useRef<string[]>(selectedDrivers);
  const startedRetractRef = useRef<Set<string>>(new Set());
  const animGenRef = useRef<Map<string, number>>(new Map());

  const LINE_MS = 1050;
  const DOT_MS = 150;
  const STAGGER_MS = 150;

  const animateLine = useCallback((
    container: HTMLDivElement, code: string,
    direction: 'in' | 'out', delayMs: number,
  ) => {
    // Found by the driver's own class scope, not array position — an index
    // captured when the animation was scheduled can point at the wrong line
    // by the time it actually runs a couple of frames later, if another
    // toggle reordered `renderedDrivers` in between.
    const scope = container.querySelector<SVGGElement>(`.chart-line-${code}`);
    const path = scope?.querySelector<SVGPathElement>('.recharts-line-curve') ?? null;
    const len = path?.getTotalLength();
    if (!path || !len) {
      if (direction === 'out') setRetractingDrivers(prev => prev.filter(d => d !== code));
      return;
    }
    const gen = (animGenRef.current.get(code) ?? 0) + 1;
    animGenRef.current.set(code, gen);

    const bbox = path.getBBox();
    const dots = scope?.querySelectorAll<SVGCircleElement>('[data-visible-dot]') ?? [];

    path.style.transition = 'none';
    path.style.strokeDasharray = `${len}`;
    path.style.strokeDashoffset = direction === 'in' ? `${len}` : '0';
    dots.forEach(dot => { dot.style.transition = 'none'; dot.style.opacity = direction === 'in' ? '0' : '1'; });
    path.getBoundingClientRect(); // force reflow before re-enabling the transitions

    path.style.transition = `stroke-dashoffset ${LINE_MS}ms ease-${direction === 'in' ? 'out' : 'in'} ${delayMs}ms`;
    path.style.strokeDashoffset = direction === 'in' ? '0' : `${len}`;

    dots.forEach(dot => {
      const cx = parseFloat(dot.getAttribute('cx') ?? '0');
      const frac = bbox.width > 0 ? Math.min(1, Math.max(0, (cx - bbox.x) / bbox.width)) : 0;
      const dotDelay = delayMs + (direction === 'in' ? frac : 1 - frac) * LINE_MS;
      dot.style.transition = `opacity ${DOT_MS}ms ease ${dotDelay}ms`;
      dot.style.opacity = direction === 'in' ? '1' : '0';
      const clearDot = () => {
        dot.removeEventListener('transitionend', clearDot);
        if (animGenRef.current.get(code) !== gen) return; // superseded — leave it alone
        dot.style.transition = '';
      };
      dot.addEventListener('transitionend', clearDot);
    });

    const finish = () => {
      path.removeEventListener('transitionend', finish);
      if (animGenRef.current.get(code) !== gen) return; // superseded — leave it alone
      path.style.transition = '';
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      if (direction === 'out') {
        startedRetractRef.current.delete(code);
        setRetractingDrivers(prev => prev.filter(d => d !== code));
      }
    };
    path.addEventListener('transitionend', finish);
  }, []);

  // Draw-in
  useEffect(() => {
    const container = chartWrapRef.current;
    if (!container) return;

    const sessionChanged = prevChartKeyRef.current !== chartKey;
    const prevDrivers = sessionChanged ? [] : prevDriversRef.current;
    const toAnimate = sessionChanged ? selectedDrivers : selectedDrivers.filter(d => !prevDrivers.includes(d));
    prevChartKeyRef.current = chartKey;
    prevDriversRef.current = selectedDrivers;

    // Re-added before its retract finished — it's not retracting anymore,
    // and clear its "started" flag so a future retract of the same driver
    // isn't blocked by this cancelled one.
    const reclaimed = toAnimate.filter(d => retractingDrivers.includes(d));
    if (reclaimed.length) {
      reclaimed.forEach(d => startedRetractRef.current.delete(d));
      setRetractingDrivers(prev => prev.filter(d => !reclaimed.includes(d)));
    }

    if (!toAnimate.length) return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        toAnimate.forEach((code, i) => animateLine(container, code, 'in', i * STAGGER_MS));
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [chartKey, driversSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retract — detect a deselection
  useEffect(() => {
    const removed = prevSelectedRef.current.filter(
      d => !selectedDrivers.includes(d) && !retractingDrivers.includes(d),
    );
    prevSelectedRef.current = selectedDrivers;
    if (removed.length) setRetractingDrivers(prev => [...prev, ...removed]);
  }, [driversSignature]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retract — play it
  useEffect(() => {
    const container = chartWrapRef.current;
    if (!container) return;
    const toStart = retractingDrivers.filter(d => !startedRetractRef.current.has(d));
    if (!toStart.length) return;

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        toStart.forEach((code, i) => {
          startedRetractRef.current.add(code);
          animateLine(container, code, 'out', i * STAGGER_MS);
        });
      });
    });
    return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
  }, [retractingDrivers]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── All lap numbers for table ──────────────────────────────────────────────
  const allLapNums = useMemo(() => {
    const nums = new Set<number>();
    lapDataMap.forEach(ld => ld.laps.forEach(l => nums.add(l.LapNumber)));
    return Array.from(nums).sort((a, b) => a - b);
  }, [lapDataMap]);

  const canCompare = selectedDrivers.length >= 1;
  const sessionReady = selectedGP != null && !!sessionType;

  // Sprint (S) and Sprint Qualifying (SQ) only exist on sprint-format
  // weekends — offering them for every GP was misleading since they simply
  // don't exist for a conventional weekend.
  const isSprintWeekend = grandsPrix.find(g => g.round === selectedGP)?.is_sprint ?? false;
  const availableSessions = isSprintWeekend ? [...SESSIONS, ...SPRINT_SESSIONS] : SESSIONS;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      display: 'flex', flexDirection: isMobile ? 'column' : 'row',
      height: isMobile ? 'auto' : '100%',
      overflow: isMobile ? 'visible' : 'hidden',
    }}>

      {/* ── LEFT PANEL ────────────────────────────────────────────────────── */}
      <div style={{
        width: isMobile ? '100%' : 256, flexShrink: 0,
        borderRight: isMobile ? 'none' : '1px solid var(--border)',
        borderBottom: isMobile ? '1px solid var(--border)' : 'none',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column',
        overflowY: isMobile ? 'visible' : 'auto',
      }}>

        {/* Selectors */}
        <div style={{ padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <SelectField
            label="Season"
            value={String(year)}
            onChange={v => onYearChange(Number(v))}
            options={YEARS.map(y => ({ value: String(y), label: String(y) }))}
          />
          <SelectField
            label="Grand Prix"
            value={selectedGP != null ? String(selectedGP) : ''}
            onChange={v => onGPChange(Number(v))}
            options={grandsPrix.map(g => ({
              value: String(g.round),
              label: g.name || `Round ${g.round}`,
            }))}
            placeholder="Pick an event"
          />
          <SelectField
            label="Session"
            value={sessionType ?? ''}
            onChange={onSessionChange}
            options={availableSessions.map(s => ({ value: s, label: SESSION_LABELS[s] ?? s }))}
            placeholder="Pick a session"
            disabled={selectedGP == null}
          />
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '0 14px' }} />

        {/* Driver grid */}
        <div style={{ padding: '14px 14px 10px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              Drivers
            </span>
            {selectedDrivers.length > 0 && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 7, letterSpacing: '0.10em',
                color: 'var(--accent)', opacity: 0.7,
              }}>
                {selectedDrivers.length} selected
              </span>
            )}
          </div>

          {!sessionReady ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {Array.from({ length: 20 }, (_, i) => (
                <div key={i} style={{
                  height: 25, borderRadius: 'var(--r)',
                  border: '1px solid var(--border)',
                  background: 'var(--panel)', opacity: 0.4,
                }} />
              ))}
            </div>
          ) : drivers.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20 }}>
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-3)' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
              {drivers.map(d => {
                const code: string = d.abbreviation;
                const color = getDriverColor(code);
                const isSelected = selectedDrivers.includes(code);
                const isLoading  = loadingSet.has(code);
                return (
                  <button
                    key={code}
                    onClick={() => toggleDriver(code)}
                    style={{
                      padding: '6px 2px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, fontWeight: 600,
                      textAlign: 'center',
                      border: `1px solid ${isSelected ? color : 'var(--border)'}`,
                      borderRadius: 'var(--r)',
                      background: isSelected ? `${color}22` : 'transparent',
                      color: isSelected ? color : 'var(--text-2)',
                      cursor: 'pointer', outline: 'none',
                      opacity: isLoading ? 0.5 : 1,
                      transition: 'all 0.12s',
                    }}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Compare button — right below driver grid */}
        <div style={{ padding: '10px 14px 14px' }}>
          <button
            disabled={!canCompare}
            onClick={() => canCompare && onCompare(selectedDrivers)}
            style={{
              width: '100%', padding: '10px 0',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase',
              background: canCompare ? 'var(--accent-10)' : 'transparent',
              border: `1px solid ${canCompare ? 'var(--accent)' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              color: canCompare ? 'var(--accent)' : 'var(--text-3)',
              cursor: canCompare ? 'pointer' : 'not-allowed',
              outline: 'none', transition: 'all 0.2s',
            }}
          >
            Compare Fastest Laps
          </button>
        </div>

        {/* Hint */}
        <div style={{
          margin: '0 14px',
          padding: '12px 0',
          borderTop: '1px solid var(--border)',
        }}>
          <p style={{
            margin: 0,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: 10, lineHeight: 1.6,
            color: 'var(--text-3)', letterSpacing: '0.02em',
          }}>
            To view full telemetry, click Compare Fastest Laps or select individual laps from the chart and table.
          </p>
        </div>

        {/* Selected laps panel */}
        {selectedLapRefs.length > 0 && (
          <div style={{
            margin: '0 14px',
            padding: '12px 0',
            borderTop: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 7, letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              Selected laps ({selectedLapRefs.length})
            </span>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {selectedLapRefs.map(({ driver, lapNumber }) => {
                const c = resolveColor(driver);
                return (
                  <div
                    key={`${driver}-${lapNumber}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 7px',
                      background: `${c}22`,
                      border: `1px solid ${c}88`,
                      borderRadius: 'var(--r)',
                    }}
                  >
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: 9, fontWeight: 700, color: c,
                    }}>
                      {driver} L{String(lapNumber).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => toggleLapRef(driver, lapNumber)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', color: c, opacity: 0.6,
                        fontSize: 10, lineHeight: 1, fontFamily: 'monospace',
                        display: 'flex', alignItems: 'center',
                      }}
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => onCompareLaps(selectedLapRefs)}
              style={{
                width: '100%', padding: '10px 0',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase',
                background: 'var(--accent)',
                border: '1px solid var(--accent)',
                borderRadius: 'var(--r)',
                color: '#ede5d5',
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              Compare Telemetry →
            </button>
          </div>
        )}

      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
        overflow: isMobile ? 'visible' : 'hidden', background: 'var(--bg)',
      }}>

        {/* Chart — also the PNG export target (TelemetryPage's export button) */}
        <div id="laps-export-target" style={{
          flexShrink: 0, height: isMobile ? 280 : 420,
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)', position: 'relative',
        }}>
          {renderedDrivers.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                color: 'var(--text-3)', letterSpacing: '0.12em',
              }}>
                Select drivers to visualise
              </span>
            </div>
          ) : (
            <>
              {/* Outlier toggle — reveal laps normally hidden for being >5s
                  off the comparison's best (pit/SC/red-flag laps) */}
              <button
                data-export-hide
                onClick={() => setShowOutliers(v => !v)}
                title={showOutliers ? 'Hide outlier laps' : 'Show outlier laps (pit, SC, red flag...)'}
                className="absolute flex items-center justify-center"
                style={{
                  top: 10, right: 12, zIndex: 10,
                  width: 22, height: 22,
                  borderRadius: 'var(--r)',
                  border: `1px solid ${showOutliers ? 'var(--accent)' : 'var(--border)'}`,
                  background: showOutliers ? 'var(--accent-20)' : 'var(--surface)',
                  color: showOutliers ? 'var(--accent)' : 'var(--text-3)',
                  cursor: 'pointer', outline: 'none',
                  transition: 'all 0.15s',
                }}
              >
                {showOutliers ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>

              {/* Legend */}
              <div style={{
                position: 'absolute', top: 10, left: 56, zIndex: 10,
                display: 'flex', gap: 14, flexWrap: 'wrap',
              }}>
                {selectedDrivers.map(code => (
                  <span key={code} style={{
                    fontFamily: 'Rajdhani, sans-serif', fontSize: 11, fontWeight: 700,
                    color: resolveColor(code),
                  }}>
                    ● {code}
                  </span>
                ))}
              </div>

              <div ref={chartWrapRef} key={chartKey} style={{ width: '100%', height: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 34, right: 20, left: 4, bottom: 18 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="var(--chart-grid)" />
                  <XAxis dataKey="lapNumber" stroke="transparent"
                    tick={{ fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                    padding={{ left: 12, right: 12 }}
                    label={{ value: 'LAP', position: 'insideBottom', offset: -6, fill: 'var(--text-3)', style: { fontSize: 8, fontFamily: 'JetBrains Mono', letterSpacing: '0.15em' } }}
                  />
                  <YAxis stroke="transparent" width={46}
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
                    formatter={(v: any, name: string) => [fmtTime(v), name]}
                    labelFormatter={l => `Lap ${l}`}
                  />
                  {renderedDrivers.map((code) => (
                    <Line
                      key={code}
                      className={`chart-line-${code}`}
                      type="monotone"
                      dataKey={code}
                      stroke={resolveColor(code)}
                      strokeWidth={1.5}
                      dot={(p: any) => (
                        <ChartDot
                          {...p}
                          dataKey={code}
                          selectedLapRefs={selectedLapRefs}
                          onToggle={toggleLapRef}
                        />
                      )}
                      activeDot={false}
                      connectNulls
                      isAnimationActive={outlierAnimActive}
                      animationDuration={500}
                      animationEasing="ease-in-out"
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              </div>
              <Watermark />
            </>
          )}
        </div>

        {/* Timing table */}
        <div style={{
          ...(isMobile ? { maxHeight: 320 } : { flex: 1 }),
          minWidth: 0, overflowX: 'auto', overflowY: 'auto',
        }}>
          {selectedDrivers.length > 0 && allLapNums.length > 0 && (
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead>
                <tr style={{ position: 'sticky', top: 0, zIndex: 5, background: 'var(--surface)' }}>
                  <th style={{
                    position: 'sticky', left: 0, zIndex: 6, background: 'var(--surface)',
                    width: 80, padding: '8px 14px', textAlign: 'left',
                    borderBottom: '1px solid var(--border-hi)', borderRight: '1px solid var(--border-hi)',
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 7,
                    color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>
                    Driver
                  </th>
                  {allLapNums.map(n => (
                    <th key={n} style={{
                      minWidth: 76, padding: '8px 4px', textAlign: 'center',
                      borderBottom: '1px solid var(--border-hi)',
                      borderRight: '1px solid var(--border)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 8,
                      color: 'var(--text-3)', letterSpacing: '0.08em',
                      fontWeight: 400,
                    }}>
                      L{String(n).padStart(2, '0')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selectedDrivers.map(code => {
                  const ld = lapDataMap.get(code);
                  const color = resolveColor(code);
                  return (
                    <tr key={code} style={{ borderBottom: '1px solid var(--border-hi)' }}>
                      {/* Driver cell */}
                      <td style={{
                        position: 'sticky', left: 0, zIndex: 2,
                        background: 'var(--bg)', borderRight: '1px solid var(--border-hi)',
                        padding: '10px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 2, height: 14, background: color, borderRadius: 1, flexShrink: 0 }} />
                          <span style={{
                            fontFamily: 'JetBrains Mono, monospace',
                            fontSize: 10, fontWeight: 700, color,
                          }}>
                            {code}
                          </span>
                          {loadingSet.has(code) && (
                            <Loader2 size={10} className="animate-spin" style={{ color: 'var(--text-3)' }} />
                          )}
                        </div>
                      </td>

                      {/* Lap cells */}
                      {allLapNums.map(n => {
                        const lap    = ld?.laps.find(l => l.LapNumber === n);
                        const t      = lap?.LapTime ?? null;
                        const dot    = compoundColor(lap?.Compound);
                        const isPersonalBest = lap?.IsPersonalBest ?? false;
                        const isLapSelected  = selectedLapRefs.some(
                          l => l.driver === code && l.lapNumber === n,
                        );

                        return (
                          <td
                            key={n}
                            onClick={() => { if (!t) return; toggleLapRef(code, n); }}
                            style={{
                              padding: '8px 4px', textAlign: 'center',
                              borderRight: '1px solid var(--border)',
                              cursor: t ? 'pointer' : 'default',
                              transition: 'background 0.1s',
                              background: isLapSelected
                                ? `${color}28`
                                : isPersonalBest ? `${color}18` : 'transparent',
                              boxShadow: isLapSelected
                                ? `inset 0 0 0 2px ${color}88`
                                : undefined,
                            }}
                            onMouseEnter={e => {
                              if (t && !isLapSelected) e.currentTarget.style.background = 'var(--surface)';
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.background = isLapSelected
                                ? `${color}28`
                                : isPersonalBest ? `${color}10` : 'transparent';
                            }}
                          >
                            {t ? (
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{
                                  fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
                                  color: isPersonalBest ? color : 'var(--text)',
                                  fontWeight: isPersonalBest ? 700 : 400,
                                }}>
                                  {fmtTime(t)}
                                </span>
                                {dot && (
                                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: dot, border: '1px solid var(--border-hi)' }} />
                                )}
                              </div>
                            ) : (
                              <span style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 9, color: 'var(--text-3)',
                              }}>
                                —
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
