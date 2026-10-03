import { Zap, Gauge, MapPin, Target, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import type { TelemetryData, TelemetryPoint } from '../types/telemetry';
import { useMemo, useRef, useEffect } from 'react';
import Watermark from './Watermark';

interface TelemetryViewProps {
  telemetryData: TelemetryData;
  driver1: string;
  driver2: string;
  sessionType: string;
  lapNumber: number | null;
  getDriverColor: (driverCode: string) => string;
  areTeammates: (driver1: string, driver2: string) => boolean;
  loading?: boolean;
  onCursorChange?: (cursor: number) => void;
}

function nearestByDistance(arr: TelemetryPoint[], dist: number): TelemetryPoint {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].distance <= dist) lo = mid;
    else hi = mid;
  }
  return Math.abs(arr[lo].distance - dist) <= Math.abs(arr[hi].distance - dist) ? arr[lo] : arr[hi];
}

// ── Shared chart style helpers ─────────────────────────────────────────────────

const CHART_GRID  = 'rgba(255,255,255,0.04)';
const CHART_TICK  = { fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' };
const TOOLTIP_STYLE = {
  contentStyle: { background: 'var(--panel)', border: '1px solid var(--border-hi)', borderRadius: 'var(--r2)', padding: '6px 10px', fontSize: 10 },
  labelStyle: { color: 'var(--accent)', fontFamily: 'JetBrains Mono', fontSize: 9, marginBottom: 2 },
  itemStyle: { fontFamily: 'JetBrains Mono', fontSize: 10 },
};

// ── Panel styles ───────────────────────────────────────────────────────────────

const panelStyle = (borderColor?: string): React.CSSProperties => ({
  background: 'var(--surface)',
  border: `1px solid ${borderColor ?? 'var(--border)'}`,
  borderRadius: 'var(--r2)',
  overflow: 'hidden',
});

const innerPanelStyle = (borderColor?: string): React.CSSProperties => ({
  background: 'var(--panel)',
  border: `1px solid ${borderColor ?? 'var(--border)'}`,
  borderRadius: 'var(--r)',
  padding: '10px 12px',
});

// ── Sector labels ──────────────────────────────────────────────────────────────

interface SectorLabelsProps { sector1Percent: number; sector2Percent: number; sector3Percent: number; }
const SectorLabels = ({ sector1Percent, sector2Percent, sector3Percent }: SectorLabelsProps) => (
  <div className="hidden sm:flex absolute top-1 right-0 left-12 h-full pointer-events-none z-10" style={{ paddingRight: '20px' }}>
    <div className="flex items-start justify-center pt-0.5 label-section" style={{ width: `${sector1Percent}%`, opacity: 0.4 }}>S1</div>
    <div className="h-full w-px" style={{ background: 'var(--border)' }} />
    <div className="flex items-start justify-center pt-0.5 label-section" style={{ width: `${sector2Percent - sector1Percent}%`, opacity: 0.4 }}>S2</div>
    <div className="h-full w-px" style={{ background: 'var(--border)' }} />
    <div className="flex items-start justify-center pt-0.5 label-section" style={{ width: `${sector3Percent}%`, opacity: 0.4 }}>S3</div>
  </div>
);

// ── Chart section header ───────────────────────────────────────────────────────

const ChartHeader = ({ label, color }: { label: string; color: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
    <div style={{ width: 3, height: 12, background: color, borderRadius: 1 }} />
    <span className="label-section" style={{ color: 'var(--text-2)' }}>{label}</span>
  </div>
);

// ── Main component ─────────────────────────────────────────────────────────────

export default function TelemetryView({
  telemetryData, driver1, driver2,
  sessionType: _sessionType, lapNumber,
  getDriverColor, areTeammates, loading = false,
  onCursorChange,
}: TelemetryViewProps) {

  const driver1Color = getDriverColor(driver1);
  const driver2Color = areTeammates(driver1, driver2) ? '#000000' : getDriverColor(driver2);

  const hoverMarkerRef       = useRef<SVGGElement>(null);
  const chartsContainerRef   = useRef<HTMLDivElement>(null);
  const transformedPointsRef = useRef<{ x: number; y: number; distance: number }[]>([]);
  const crosshairLineRef     = useRef<HTMLDivElement>(null);
  const livePanelRef         = useRef<HTMLDivElement>(null);
  const liveDataRef          = useRef<Record<string, HTMLElement | null>>({
    dist: null, sector: null,
    d1Speed: null, d1Throttle: null, d1Brake: null, d1Gear: null,
    d2Speed: null, d2Throttle: null, d2Brake: null, d2Gear: null,
    delta: null, ahead: null,
  });

  const fmtLapTime = (s: number | null): string => {
    if (!s) return '--:--.---';
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toFixed(3).padStart(6, '0')}`;
  };

  const telemetryChartData = useMemo(() => {
    const full = telemetryData.telemetry;
    const step = Math.max(1, Math.ceil(full.length / 300));
    const result = [];
    for (let i = 0; i < full.length; i += step) {
      const p = full[i] as any;
      result.push({
        distance: p.distance,
        speed1: p.speed1, speed2: p.speed2,
        throttle1: p.throttle1, throttle2: p.throttle2,
        brake1: p.brake1 ? 100 : 0, brake2: p.brake2 ? 100 : 0,
        gear1: p.gear1, gear2: p.gear2,
        rpm1: p.rpm1 || 0, rpm2: p.rpm2 || 0,
        delta: p.delta,
      });
    }
    return result;
  }, [telemetryData]);

  const { maxSpeed1, maxSpeed2, avgSpeed1, avgSpeed2, delta, maxDistance, speedMin } = useMemo(() => {
    const tel = telemetryData.telemetry;
    let ms1 = -Infinity, ms2 = -Infinity, mn = Infinity, sum1 = 0, sum2 = 0, md = -Infinity;
    for (const p of tel) {
      if (p.speed1 > ms1) ms1 = p.speed1;
      if (p.speed2 > ms2) ms2 = p.speed2;
      if (p.speed1 < mn) mn = p.speed1;
      if (p.speed2 < mn) mn = p.speed2;
      sum1 += p.speed1; sum2 += p.speed2;
      if (p.distance > md) md = p.distance;
    }
    return {
      maxSpeed1: ms1, maxSpeed2: ms2,
      avgSpeed1: sum1 / tel.length, avgSpeed2: sum2 / tel.length,
      delta: (telemetryData.lapTime2 || 0) - (telemetryData.lapTime1 || 0),
      maxDistance: md,
      speedMin: Math.floor(mn / 10) * 10,
    };
  }, [telemetryData]);

  const { sector1Percent, sector2Percent, sector3Percent } = useMemo(() => {
    let s1d = maxDistance * 0.33, s2d = maxDistance * 0.66;
    if (telemetryData.sectors1 && telemetryData.lapTime1) {
      const t = telemetryData.lapTime1;
      s1d = maxDistance * ((telemetryData.sectors1.sector1 || 0) / t);
      s2d = maxDistance * (((telemetryData.sectors1.sector1 || 0) + (telemetryData.sectors1.sector2 || 0)) / t);
    }
    const s1p = (s1d / maxDistance) * 100;
    const s2p = (s2d / maxDistance) * 100;
    return { sector1Percent: s1p, sector2Percent: s2p, sector3Percent: 100 - s2p };
  }, [telemetryData, maxDistance]);

  const sectorGains = useMemo(() => {
    if (!telemetryData.sectors1 || !telemetryData.sectors2) return null;
    return {
      s1: (telemetryData.sectors2.sector1 || 0) - (telemetryData.sectors1.sector1 || 0),
      s2: (telemetryData.sectors2.sector2 || 0) - (telemetryData.sectors1.sector2 || 0),
      s3: (telemetryData.sectors2.sector3 || 0) - (telemetryData.sectors1.sector3 || 0),
    };
  }, [telemetryData]);

  const rawGpsPoints = useMemo(() => telemetryData.telemetry
    .filter(p => p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y) && Math.abs(p.x) > 0.001 && Math.abs(p.y) > 0.001)
    .map(p => ({ x: p.x, y: p.y, distance: p.distance || 0 })),
  [telemetryData]);

  const hasGpsData = rawGpsPoints.length >= 10;

  const trackDominanceData = useMemo(() => {
    if (!hasGpsData) return null;
    const segSize = 20;
    const maxDist = rawGpsPoints[rawGpsPoints.length - 1]?.distance || 0;
    const segments: { startDistance: number; endDistance: number; dominant: 'driver1' | 'driver2'; advantage: number }[] = [];
    for (let i = 0; i < Math.ceil(maxDist / segSize); i++) {
      const s = i * segSize, e = Math.min((i + 1) * segSize, maxDist);
      const pts = telemetryData.telemetry.filter(p => p.distance >= s && p.distance < e);
      if (pts.length > 0) {
        const a1 = pts.reduce((sum, p) => sum + p.speed1, 0) / pts.length;
        const a2 = pts.reduce((sum, p) => sum + p.speed2, 0) / pts.length;
        segments.push({ startDistance: s, endDistance: e, dominant: a1 >= a2 ? 'driver1' : 'driver2', advantage: Math.abs(a1 - a2) });
      }
    }
    const d1n = segments.filter(s => s.dominant === 'driver1').length;
    return { segments, stats: { driver1Dominant: d1n, driver2Dominant: segments.length - d1n, totalSegments: segments.length } };
  }, [hasGpsData, rawGpsPoints, telemetryData.telemetry]);

  const trackMapBase = useMemo(() => {
    if (!hasGpsData) return null;
    const xv = rawGpsPoints.map(p => p.x), yv = rawGpsPoints.map(p => p.y);
    const minX = Math.min(...xv), maxX = Math.max(...xv);
    const minY = Math.min(...yv), maxY = Math.max(...yv);
    const rX = maxX - minX, rY = maxY - minY;
    if (!rX || !rY) return null;

    const rot = rX / rY < 1;
    const tx = (p: { x: number; y: number; distance: number }) => {
      let x = p.x - minX, y = p.y - minY;
      if (rot) { const t = x; x = rY - y; y = t; }
      x = (rot ? rY : rX) - x;
      return { x, y, distance: p.distance };
    };

    const tp = rawGpsPoints.map(tx);
    transformedPointsRef.current = tp;

    const eRX = rot ? rY : rX, eRY = rot ? rX : rY;
    const pp = 0.04;
    const pRX = eRX * (1 + 2 * pp), pRY = eRY * (1 + 2 * pp);
    const cAR = 1000 / 350;
    const tAR = pRX / pRY;
    let vbW = tAR > cAR ? pRX : pRY * cAR;
    let vbH = tAR > cAR ? pRX / cAR : pRY;
    const viewBox = `${(eRX / 2 - vbW / 2).toFixed(0)} ${(eRY / 2 - vbH / 2).toFixed(0)} ${vbW.toFixed(0)} ${vbH.toFixed(0)}`;
    const bsw = Math.max(eRX, eRY) * 0.015;

    let fullPath = `M ${tp[0].x},${tp[0].y}`;
    for (let i = 1; i < tp.length; i++) fullPath += ` L ${tp[i].x},${tp[i].y}`;

    const coloredPaths: { path: string; color: string }[] = [];
    if (trackDominanceData?.segments.length) {
      const segs = trackDominanceData.segments;
      const getColor = (d: number) => {
        let lo = 0, hi = segs.length - 1;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          if (d < segs[mid].startDistance) hi = mid - 1;
          else if (d >= segs[mid].endDistance) lo = mid + 1;
          else return segs[mid].dominant === 'driver1' ? driver1Color : driver2Color;
        }
        return driver1Color;
      };
      let cc = '', cp = '';
      for (const pt of tp) {
        const c = getColor(pt.distance);
        if (c !== cc) { if (cp) coloredPaths.push({ path: cp, color: cc }); cc = c; cp = `M ${pt.x},${pt.y}`; }
        else cp += ` L ${pt.x},${pt.y}`;
      }
      if (cp) coloredPaths.push({ path: cp, color: cc });
    }

    return { viewBox, fullPath, coloredPaths, transformedPoints: tp, baseStrokeWidth: bsw };
  }, [hasGpsData, rawGpsPoints, trackDominanceData, driver1Color, driver2Color]);

  // Crosshair + track marker + live panel
  useEffect(() => {
    if (!chartsContainerRef.current) return;
    const container = chartsContainerRef.current;
    const full = telemetryData.telemetry;
    const marker = hoverMarkerRef.current;
    let raf: number;

    const onMove = (e: MouseEvent) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const surface = container.querySelector('.recharts-surface');
        if (!surface || !full.length) return;
        const sr = surface.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - sr.left) / sr.width));
        const dist = ratio * maxDistance;
        onCursorChange?.(ratio);

        if (crosshairLineRef.current) {
          const cr = container.getBoundingClientRect();
          crosshairLineRef.current.style.left = `${e.clientX - cr.left}px`;
          crosshairLineRef.current.style.opacity = '1';
        }

        if (marker && trackMapBase && transformedPointsRef.current.length > 0) {
          const hp = nearestByDistance(transformedPointsRef.current as any, dist) as any;
          if (hp) { marker.style.transform = `translate(${hp.x}px, ${hp.y}px)`; marker.style.opacity = '1'; }
        }

        if (livePanelRef.current && full.length > 0) {
          const pt = nearestByDistance(full, dist);
          const s1d = maxDistance * (sector1Percent / 100);
          const s2d = maxDistance * (sector2Percent / 100);
          const sector = dist < s1d ? 'S1' : dist < s2d ? 'S2' : 'S3';
          const dv = pt.delta || 0;
          livePanelRef.current.style.opacity = '1';
          const d = liveDataRef.current;
          if (d.dist) d.dist.textContent = `${Math.round(dist)}m`;
          if (d.sector) d.sector.textContent = sector;
          if (d.d1Speed) d.d1Speed.textContent = `${Math.round(pt.speed1)}`;
          if (d.d1Throttle) d.d1Throttle.textContent = `${Math.round(pt.throttle1)}%`;
          if (d.d1Gear) d.d1Gear.textContent = `G${pt.gear1}`;
          if (d.d1Brake) { d.d1Brake.textContent = pt.brake1 ? 'BRAKE' : 'OFF'; (d.d1Brake as HTMLElement).style.color = pt.brake1 ? '#f87171' : 'var(--text-2)'; }
          if (d.d2Speed) d.d2Speed.textContent = `${Math.round(pt.speed2)}`;
          if (d.d2Throttle) d.d2Throttle.textContent = `${Math.round(pt.throttle2)}%`;
          if (d.d2Gear) d.d2Gear.textContent = `G${pt.gear2}`;
          if (d.d2Brake) { d.d2Brake.textContent = pt.brake2 ? 'BRAKE' : 'OFF'; (d.d2Brake as HTMLElement).style.color = pt.brake2 ? '#f87171' : 'var(--text-2)'; }
          if (d.delta) {
            const abs = Math.abs(dv);
            d.delta.textContent = abs < 0.001 ? '0.000s' : `${dv > 0 ? '+' : ''}${dv.toFixed(3)}s`;
            (d.delta as HTMLElement).style.color = abs < 0.001 ? 'var(--text-2)' : dv > 0 ? '#f87171' : '#4ade80';
          }
          if (d.ahead) {
            const abs = Math.abs(dv);
            d.ahead.textContent = abs < 0.001 ? 'EQUAL' : dv > 0 ? `${driver1} AHEAD` : `${driver2} AHEAD`;
          }
        }
      });
    };

    const onLeave = () => {
      if (raf) cancelAnimationFrame(raf);
      if (marker) marker.style.opacity = '0';
      if (crosshairLineRef.current) crosshairLineRef.current.style.opacity = '0';
      if (livePanelRef.current) livePanelRef.current.style.opacity = '0';
    };

    container.addEventListener('mousemove', onMove);
    container.addEventListener('mouseleave', onLeave);
    return () => { if (raf) cancelAnimationFrame(raf); container.removeEventListener('mousemove', onMove); container.removeEventListener('mouseleave', onLeave); };
  }, [trackMapBase, maxDistance, sector1Percent, sector2Percent, telemetryData, driver1, driver2]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Driver cards + Track map ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* Driver cards */}
        <div className="lg:col-span-1 space-y-2">

          {([
            { d: driver1, color: driver1Color, lapTime: telemetryData.lapTime1, sectors: telemetryData.sectors1, maxSpd: maxSpeed1, avgSpd: avgSpeed1 },
            { d: driver2, color: driver2Color, lapTime: telemetryData.lapTime2, sectors: telemetryData.sectors2, maxSpd: maxSpeed2, avgSpd: avgSpeed2 },
          ] as const).map(({ d, color, lapTime, sectors, maxSpd, avgSpd }) => (
            <div
              key={d}
              style={{ ...panelStyle(`${color}30`), borderLeft: `2px solid ${color}`, opacity: loading ? 0.4 : 1, padding: '12px 14px', transition: 'opacity 0.3s' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="font-rajdhani font-black text-2xl" style={{ color }}>{d}</div>
                  <div className="label-section mt-0.5">{lapNumber ? `LAP ${lapNumber}` : 'FASTEST LAP'}</div>
                </div>
                <div className="text-right">
                  <div className="label-section mb-1">LAP TIME</div>
                  <div className="data-value font-bold text-white text-lg">{fmtLapTime(lapTime || 0)}</div>
                </div>
              </div>

              {sectors && (
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {(['sector1', 'sector2', 'sector3'] as const).map((s, i) => (
                    <div key={s} style={innerPanelStyle()}>
                      <div className="label-section mb-1">S{i + 1}</div>
                      <div className="data-value text-white text-xs">{sectors[s]?.toFixed(3)}s</div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                {[
                  { icon: <Gauge size={12} style={{ color: 'var(--accent)' }} />, label: 'Max', value: `${maxSpd.toFixed(0)} km/h` },
                  { icon: <Zap size={12} style={{ color: 'var(--accent)' }} />, label: 'Avg', value: `${avgSpd.toFixed(0)} km/h` },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="flex items-center gap-2">
                    {icon}
                    <div>
                      <div className="label-section">{label} Speed</div>
                      <div className="data-value text-white text-xs">{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Track map */}
        <div className="lg:col-span-2">
          <div style={{ ...panelStyle(), height: '100%', minHeight: 280, display: 'flex', flexDirection: 'column', opacity: loading ? 0.4 : 1, transition: 'opacity 0.3s' }}>

            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <MapPin size={13} style={{ color: 'var(--accent)' }} />
                <span className="label-section" style={{ color: 'var(--text-2)' }}>TRACK MAP</span>
                <div style={innerPanelStyle()}>
                  <span className="label-section">GAP</span>{' '}
                  <span className="data-value text-sm font-bold" style={{ color: delta > 0 ? '#f87171' : delta < 0 ? '#4ade80' : 'var(--text-2)' }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
                  </span>
                  {Math.abs(delta) > 0.001 && (
                    <span className="label-section ml-2">{delta > 0 ? driver1 : driver2} FASTER</span>
                  )}
                </div>
              </div>

              {trackDominanceData && (
                <div className="flex gap-3 text-[10px] font-rajdhani font-bold">
                  {[
                    { code: driver1, color: driver1Color, pct: (trackDominanceData.stats.driver1Dominant / trackDominanceData.stats.totalSegments) * 100 },
                    { code: driver2, color: driver2Color, pct: (trackDominanceData.stats.driver2Dominant / trackDominanceData.stats.totalSegments) * 100 },
                  ].map(({ code, color, pct }) => (
                    <div key={code} className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <span style={{ color }}>{code} {pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center" style={{ background: '#07070e', minHeight: 220 }}>
              {hasGpsData && trackMapBase ? (
                <svg className="w-full h-full" viewBox={trackMapBase.viewBox} preserveAspectRatio="xMidYMid meet" style={{ shapeRendering: 'geometricPrecision' }}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="6" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>
                  <path d={trackMapBase.fullPath} fill="none" stroke="#000" strokeWidth={trackMapBase.baseStrokeWidth * 2.8} strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                  <path d={trackMapBase.fullPath} fill="none" stroke="#fff" strokeWidth={trackMapBase.baseStrokeWidth * 2.2} strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  {trackMapBase.coloredPaths.map((seg, i) => (
                    <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth={trackMapBase.baseStrokeWidth * 1.6} strokeLinecap="round" strokeLinejoin="round" opacity="0.95"
                      style={{ filter: `drop-shadow(0 0 ${trackMapBase.baseStrokeWidth * 0.6}px ${seg.color})` }} />
                  ))}
                  {/* Start marker */}
                  <circle cx={trackMapBase.transformedPoints[0].x} cy={trackMapBase.transformedPoints[0].y} r={trackMapBase.baseStrokeWidth * 2} fill="var(--accent)" opacity="0.95" />
                  <circle cx={trackMapBase.transformedPoints[0].x} cy={trackMapBase.transformedPoints[0].y} r={trackMapBase.baseStrokeWidth * 0.8} fill="#fff" opacity="1" />
                  {/* Hover marker */}
                  <g ref={hoverMarkerRef} style={{ opacity: 0, transition: 'opacity 0.08s', willChange: 'transform' }}>
                    <circle cx={0} cy={0} r={trackMapBase.baseStrokeWidth * 2.5} fill="var(--accent)" opacity="0.55" />
                    <circle cx={0} cy={0} r={trackMapBase.baseStrokeWidth * 1} fill="#fff" opacity="1" />
                  </g>
                </svg>
              ) : (
                <div className="text-center">
                  <Target size={28} style={{ color: 'var(--text-3)', margin: '0 auto 8px' }} />
                  <p className="label-section">GPS data not available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Sector analysis ───────────────────────────────────────────────────── */}
      {sectorGains && (
        <div style={{ ...panelStyle(), opacity: loading ? 0.4 : 1, transition: 'opacity 0.3s' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <Target size={12} style={{ color: 'var(--accent)' }} />
            <span className="label-section" style={{ color: 'var(--accent)' }}>SECTOR ANALYSIS</span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-3">
            {([
              { label: 'S1', gain: sectorGains.s1 },
              { label: 'S2', gain: sectorGains.s2 },
              { label: 'S3', gain: sectorGains.s3 },
            ] as const).map(({ label, gain }) => {
              const gc = gain > 0.001 ? driver1Color : gain < -0.001 ? driver2Color : 'var(--text-2)';
              const gd = gain > 0.001 ? driver1 : gain < -0.001 ? driver2 : null;
              const bw = Math.min(80, Math.abs(gain) * 300);
              return (
                <div key={label} style={innerPanelStyle()}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="label-section">{label}</span>
                    {gd && <span className="font-rajdhani font-black text-[10px] px-1.5 py-0.5" style={{ borderRadius: 'var(--r)', background: `${gc}18`, color: gc }}>{gd}</span>}
                  </div>
                  <div className="data-value font-bold text-lg" style={{ color: gc }}>
                    {Math.abs(gain) < 0.001 ? 'EQUAL' : `${gain > 0 ? '+' : ''}${gain.toFixed(3)}s`}
                  </div>
                  <div className="flex items-center gap-1 mt-2 h-1">
                    <div className="flex-1 flex justify-end">
                      {gain > 0.001 && <div style={{ height: '100%', width: `${bw}%`, background: driver1Color, minWidth: 2, borderRadius: 1 }} />}
                    </div>
                    <div style={{ width: 1, height: '100%', background: 'var(--border-hi)' }} />
                    <div className="flex-1">
                      {gain < -0.001 && <div style={{ height: '100%', width: `${bw}%`, background: driver2Color, minWidth: 2, borderRadius: 1 }} />}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live analysis panel ─────────────────────────────────────────────── */}
      <div ref={livePanelRef} style={{ ...panelStyle(`var(--accent-30)`), opacity: 0, transition: 'opacity 0.12s ease' }}>
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <Activity size={12} style={{ color: 'var(--accent)' }} />
          <span className="label-section" style={{ color: 'var(--accent)' }}>LIVE ANALYSIS</span>
          <span style={{ color: 'var(--border-hi)', fontFamily: 'JetBrains Mono', fontSize: 10 }}>—</span>
          <span className="data-value text-xs" style={{ color: 'var(--text-2)' }}>
            <span ref={el => { liveDataRef.current.dist = el; }} style={{ color: 'var(--text)' }}>--</span>m
          </span>
          <span ref={el => { liveDataRef.current.sector = el; }}
            className="data-value text-[10px] px-2 py-0.5"
            style={{ background: 'var(--accent-10)', color: 'var(--accent)', borderRadius: 'var(--r)' }}>--</span>
        </div>

        <div className="grid grid-cols-3 gap-3 p-3">
          {[
            {
              d: driver1, color: driver1Color,
              speedRef: 'd1Speed', thrRef: 'd1Throttle', brakeRef: 'd1Brake', gearRef: 'd1Gear',
            },
            {
              d: driver2, color: driver2Color,
              speedRef: 'd2Speed', thrRef: 'd2Throttle', brakeRef: 'd2Brake', gearRef: 'd2Gear',
            },
          ].map(({ d, color, speedRef, thrRef, brakeRef, gearRef }) => (
            <div key={d} style={{ ...innerPanelStyle(`${color}25`), borderLeft: `2px solid ${color}` }}>
              <div className="flex items-center gap-1.5 mb-2">
                <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                <span className="font-rajdhani font-black text-[11px]" style={{ color }}>{d}</span>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span ref={el => { liveDataRef.current[speedRef] = el; }} className="data-value font-bold text-2xl text-white">--</span>
                <span className="label-section">km/h</span>
              </div>
              <div className="flex items-center gap-2 data-value text-[10px]">
                <span ref={el => { liveDataRef.current[thrRef] = el; }} style={{ color: '#4ade80' }}>--%</span>
                <span style={{ color: 'var(--border-hi)' }}>·</span>
                <span ref={el => { liveDataRef.current[brakeRef] = el; }} style={{ color: 'var(--text-2)' }}>OFF</span>
                <span style={{ color: 'var(--border-hi)' }}>·</span>
                <span ref={el => { liveDataRef.current[gearRef] = el; }} style={{ color: 'var(--text-2)' }}>G-</span>
              </div>
            </div>
          ))}

          <div style={innerPanelStyle()}>
            <div className="label-section mb-2">GAP AT CURSOR</div>
            <div ref={el => { liveDataRef.current.delta = el; }} className="data-value font-bold text-2xl" style={{ color: 'var(--text-2)' }}>--</div>
            <div ref={el => { liveDataRef.current.ahead = el; }} className="label-section mt-1.5">--</div>
          </div>
        </div>
      </div>

      {/* ── Telemetry charts ─────────────────────────────────────────────────── */}
      <div ref={chartsContainerRef} style={{ ...panelStyle(), position: 'relative' }}>

        {/* Synchronized crosshair */}
        <div ref={crosshairLineRef} style={{
          position: 'absolute', top: 0, bottom: 0, width: 1, pointerEvents: 'none', zIndex: 30,
          opacity: 0, left: 0, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.25) 5%, rgba(255,255,255,0.25) 95%, transparent)',
        }} />

        <div style={{ opacity: loading ? 0.3 : 1, transition: 'opacity 0.3s' }}>

          {/* Speed */}
          <div className="relative" style={{ borderBottom: '1px solid var(--border)' }}>
            <ChartHeader label="SPEED  km/h" color="#3b82f6" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 4 }}>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={false} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44}
                  domain={[speedMin, (v: number) => Math.ceil(v / 10) * 10]}
                  tickFormatter={v => Math.round(v).toString()} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`} formatter={(v: any, n: string) => [`${Math.round(v)} km/h`, n]} />
                <Line type="monotone" dataKey="speed1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="monotone" dataKey="speed2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
            <Watermark bottom={4} right={24} />
          </div>

          {/* Delta */}
          <div className="relative" style={{ borderBottom: '1px solid var(--border)' }}>
            <ChartHeader label="DELTA  s" color="#eab308" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={90}>
              <AreaChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 4 }}>
                <defs>
                  <linearGradient id="deltaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={false} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44} tickFormatter={v => `${v >= 0 ? '+' : ''}${v.toFixed(1)}s`} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`}
                  formatter={(v: any) => { const n = parseFloat(v); return [`${n >= 0 ? '+' : ''}${n.toFixed(3)}s`, n > 0 ? `${driver1} ahead` : n < 0 ? `${driver2} ahead` : 'Equal']; }} />
                <ReferenceLine y={0} stroke="var(--accent)" strokeWidth={1} strokeDasharray="4 2" />
                <Area type="monotone" dataKey="delta" stroke="var(--accent)" strokeWidth={1.5} fill="url(#deltaG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Throttle */}
          <div className="relative" style={{ borderBottom: '1px solid var(--border)' }}>
            <ChartHeader label="THROTTLE  %" color="#22c55e" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 4 }}>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={false} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44} domain={[0, 100]} tickFormatter={v => `${Math.round(v)}`} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`} formatter={(v: any, n: string) => [`${Math.round(v)}%`, n]} />
                <Line type="stepAfter" dataKey="throttle1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="throttle2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Brake */}
          <div className="relative" style={{ borderBottom: '1px solid var(--border)' }}>
            <ChartHeader label="BRAKE  %" color="#ef4444" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={65}>
              <LineChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 4 }}>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={false} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44} domain={[0, 100]} ticks={[0, 100]} tickFormatter={v => v > 0 ? 'ON' : 'OFF'} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`} formatter={(v: any, n: string) => [v > 0 ? 'ON' : 'OFF', n]} />
                <Line type="stepAfter" dataKey="brake1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="brake2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* RPM */}
          <div className="relative" style={{ borderBottom: '1px solid var(--border)' }}>
            <ChartHeader label="RPM" color="#f97316" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 4 }}>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={false} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44} domain={[8000, 12000]} tickFormatter={v => `${Math.round(v / 1000)}k`} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`} formatter={(v: any, n: string) => [`${Math.round(v)} rpm`, n]} />
                <Line type="monotone" dataKey="rpm1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="monotone" dataKey="rpm2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Gear */}
          <div className="relative">
            <ChartHeader label="GEAR" color="#a855f7" />
            <SectorLabels sector1Percent={sector1Percent} sector2Percent={sector2Percent} sector3Percent={sector3Percent} />
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={telemetryChartData} syncId="telem" margin={{ top: 8, right: 20, left: 52, bottom: 20 }}>
                <CartesianGrid strokeDasharray="1 6" stroke={CHART_GRID} vertical={false} />
                <XAxis dataKey="distance" stroke="transparent" tick={CHART_TICK} tickLine={false}
                  tickFormatter={v => `${Math.round(v)}m`}
                  label={{ value: 'DISTANCE  m', position: 'insideBottom', offset: -8, style: { fontSize: 9, fontFamily: 'JetBrains Mono', fill: 'var(--text-3)', letterSpacing: '0.1em' } }} />
                <YAxis stroke="transparent" tick={CHART_TICK} tickLine={false} width={44} domain={[1, 8]} ticks={[1, 2, 3, 4, 5, 6, 7, 8]} tickFormatter={v => String(v)} />
                <Tooltip {...TOOLTIP_STYLE} labelFormatter={(l: string | number) => `${Math.round(parseFloat(String(l)))}m`} formatter={(v: any, n: string) => [`G${Math.round(v)}`, n]} />
                <Line type="stepAfter" dataKey="gear1" stroke={driver1Color} strokeWidth={1.5} dot={false} name={driver1} />
                <Line type="stepAfter" dataKey="gear2" stroke={driver2Color} strokeWidth={1.5} dot={false} name={driver2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
}
