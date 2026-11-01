import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { getCached, getSessionLapsKey, setCached } from '../utils/lapsCache';
import { useIsMobile } from '../hooks/useIsMobile';
import { getApiBase } from '../config';
import { CURRENT_SEASON_YEAR } from '../utils/season';
import type { GrandPrix, LapData, LapSelection, SessionDriver } from '../types/session';
import { compoundColor } from '../utils/compoundColors';
import { formatLapTime, lapChartDomain, lapChartRows } from './lapChart';
import LapTimesChart from './LapTimesChart';
import { inSession } from './sessionDrivers';
import { useLineColors, useLineTransitions } from './lineTransitions';
import Watermark from './Watermark';
import { TELEMETRY_SINCE } from '../seo/pages';

// ── Constants ─────────────────────────────────────────────────────────────────

// Telemetry exists from 2018 (FastF1)
const YEARS = Array.from({ length: CURRENT_SEASON_YEAR - TELEMETRY_SINCE + 1 }, (_, i) => CURRENT_SEASON_YEAR - i);
const SESSIONS = ['Q', 'R', 'FP1', 'FP2', 'FP3'];
const SPRINT_SESSIONS = ['SQ', 'S'];
const SESSION_LABELS: Record<string, string> = {
  Q: 'Qualifying', R: 'Race', S: 'Sprint', SQ: 'Sprint Qualifying',
};

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
        fontSize: 'var(--fs-7)', letterSpacing: '0.22em', textTransform: 'uppercase',
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
          fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-10)',
          outline: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          appearance: 'none',
          backgroundImage: 'none',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          WebkitAppearance: 'none',
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

interface SessionExplorerProps {
  year: number;
  onYearChange: (y: number) => void;
  selectedGP: number | null;
  onGPChange: (gp: number) => void;
  grandsPrix: GrandPrix[];
  sessionType: string | null;
  onSessionChange: (s: string) => void;
  drivers: SessionDriver[];
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
  // Laps over 5s off the best (pit, safety car, red flag) are hidden from the
  // chart by default so they don't flatten it; the table always lists them.
  const [showOutliers, setShowOutliers] = useState(false);
  const API = getApiBase();

  // ── Reset on a real session change (not on mount: that would drop the laps
  //    restored with the page; compared by value for StrictMode) ─────────────
  const sessionKey = `${year}|${selectedGP}|${sessionType}`;
  const prevSessionKeyRef = useRef(sessionKey);
  useEffect(() => {
    if (prevSessionKeyRef.current === sessionKey) return;
    prevSessionKeyRef.current = sessionKey;
    setLapDataMap(new Map());
    setSelectedDrivers(initialDrivers);
    setSelectedLapRefs([]);
  }, [sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // The session's drivers, once loaded: a driver carried from the previous
  // session who wasn't in this one leaves the selection
  useEffect(() => {
    if (!drivers.length) return;
    setSelectedDrivers(prev => {
      const kept = inSession(prev, drivers);
      return kept.length === prev.length ? prev : kept;
    });
    setSelectedLapRefs(prev => {
      const codes = inSession(prev.map(l => l.driver), drivers);
      return codes.length === prev.length ? prev : prev.filter(l => codes.includes(l.driver));
    });
  }, [drivers]);

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
  }, [year, selectedGP, sessionType, API]);

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

  // The chart keeps a deselected line while it fades; legend, grid and table don't.
  // The scale follows the selection, so the other lines move as one fades.
  const chartKey = `${year}-${selectedGP}-${sessionType}`;
  const loadedDrivers = useMemo(() => selectedDrivers.filter(d => lapDataMap.has(d)), [selectedDrivers, lapDataMap]);
  const { lines, entering, leaving } = useLineTransitions(selectedDrivers, loadedDrivers, chartKey);

  // Over the lines drawn, a fading one keeping its colour: two lines never share one
  const teammateColorByCode = useLineColors(lines, leaving, areTeammates);

  const resolveColor = useCallback((code: string) => {
    return teammateColorByCode[code] ?? getDriverColor(code);
  }, [teammateColorByCode, getDriverColor]);

  // ── Chart data ─────────────────────────────────────────────────────────────
  const chartData = useMemo(
    () => lapChartRows(code => lapDataMap.get(code)?.laps, lines, showOutliers),
    [lines, lapDataMap, showOutliers],
  );

  const yDomain = useMemo(
    () => lapChartDomain(chartData, selectedDrivers.length ? selectedDrivers : lines),
    [chartData, selectedDrivers, lines],
  );
  const reducedMotion = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);

  // ── All lap numbers for table ──────────────────────────────────────────────
  const allLapNums = useMemo(() => {
    const nums = new Set<number>();
    lapDataMap.forEach(ld => ld.laps.forEach(l => nums.add(l.LapNumber)));
    return Array.from(nums).sort((a, b) => a - b);
  }, [lapDataMap]);

  const canCompare = selectedDrivers.length >= 1;
  const sessionReady = selectedGP != null && !!sessionType;

  // Sprint sessions only on sprint weekends
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
              fontSize: 'var(--fs-7)', letterSpacing: '0.22em', textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              Drivers
            </span>
            {selectedDrivers.length > 0 && (
              <span style={{
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 'var(--fs-7)', letterSpacing: '0.10em',
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
                      fontSize: 'var(--fs-9)', fontWeight: 600,
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
              fontSize: 'var(--fs-8)', letterSpacing: '0.18em', textTransform: 'uppercase',
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
            fontSize: 'var(--fs-10)', lineHeight: 1.6,
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
              fontSize: 'var(--fs-7)', letterSpacing: '0.22em', textTransform: 'uppercase',
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
                      fontSize: 'var(--fs-9)', fontWeight: 700, color: c,
                    }}>
                      {driver} L{String(lapNumber).padStart(2, '0')}
                    </span>
                    <button
                      onClick={() => toggleLapRef(driver, lapNumber)}
                      style={{
                        background: 'none', border: 'none', padding: 0,
                        cursor: 'pointer', color: c, opacity: 0.6,
                        fontSize: 'var(--fs-10)', lineHeight: 1, fontFamily: 'monospace',
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
                fontSize: 'var(--fs-8)', letterSpacing: '0.18em', textTransform: 'uppercase',
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
          {lines.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-10)',
                color: 'var(--text-3)', letterSpacing: '0.12em',
              }}>
                Select drivers to visualise
              </span>
            </div>
          ) : (
            <>
              {/* Outlier toggle (see showOutliers) */}
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

              <LapTimesChart
                rows={chartData} drivers={selectedDrivers} lines={lines} entering={entering} leaving={leaving}
                colorOf={resolveColor} yDomain={yDomain}
                selectedLapRefs={selectedLapRefs} onToggle={toggleLapRef} animate={!reducedMotion}
                chartKey={chartKey}
              />
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
                    fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-7)',
                    color: 'var(--text-3)', letterSpacing: '0.18em', textTransform: 'uppercase',
                  }}>
                    Driver
                  </th>
                  {allLapNums.map(n => (
                    <th key={n} style={{
                      minWidth: 76, padding: '8px 4px', textAlign: 'center',
                      borderBottom: '1px solid var(--border-hi)',
                      borderRight: '1px solid var(--border)',
                      fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-8)',
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
                            fontSize: 'var(--fs-10)', fontWeight: 700, color,
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
                                  fontFamily: 'JetBrains Mono, monospace', fontSize: 'var(--fs-10)',
                                  color: isPersonalBest ? color : 'var(--text)',
                                  fontWeight: isPersonalBest ? 700 : 400,
                                }}>
                                  {formatLapTime(t)}
                                </span>
                                {dot && (
                                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: dot, border: '1px solid var(--border-hi)' }} />
                                )}
                              </div>
                            ) : (
                              <span style={{
                                fontFamily: 'JetBrains Mono, monospace',
                                fontSize: 'var(--fs-9)', color: 'var(--text-3)',
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
