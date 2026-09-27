import { useMemo, useRef, useEffect, useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { Loader2, ZoomIn } from 'lucide-react';
import type { TelemetryDataMulti, DriverMeta } from '../types/telemetry';
import { useIsMobile } from '../hooks/useIsMobile';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  telemetryData: TelemetryDataMulti;
  getDriverColor: (code: string) => string;
  areTeammates: (d1: string, d2: string) => boolean;
  loading?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(s: number | null): string {
  if (s == null) return '--:--.---';
  const m = Math.floor(s / 60);
  const sec = (s % 60).toFixed(3);
  return `${m}:${sec.padStart(6, '0')}`;
}

function fmtSector(s: number | null): string {
  if (s == null) return '—';
  return s.toFixed(3) + 's';
}

function fmtDelta(d: number, compact = false): string {
  if (d === 0) return 'REF';
  return (d > 0 ? '+' : '') + d.toFixed(compact ? 2 : 3) + (compact ? '' : 's');
}

function fmtRpm(v: number): string {
  return `${(v / 1000).toFixed(1)}k`;
}

function nearestIdx(arr: number[], val: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= val) lo = mid; else hi = mid;
  }
  return Math.abs(arr[lo] - val) <= Math.abs(arr[hi] - val) ? lo : hi;
}

function blendToWhite(hex: string, blend: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const nr = Math.round(r + (255 - r) * blend);
  const ng = Math.round(g + (255 - g) * blend);
  const nb = Math.round(b + (255 - b) * blend);
  return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
}

// Teammates share a team colour, so a later teammate in the list gets a
// distinct neutral colour instead (matches the legacy 2-driver views).
// Same driver appearing twice (different laps) still blends toward white.
function buildColors(
  drivers: DriverMeta[],
  getColor: (c: string) => string,
  areTeammates: (a: string, b: string) => boolean,
): string[] {
  const seen: Record<string, number> = {};
  const colors: string[] = [];

  drivers.forEach((d, i) => {
    const dupeCount = seen[d.driver] ?? 0;
    seen[d.driver] = dupeCount + 1;

    const isTeammateOfEarlier = drivers
      .slice(0, i)
      .some(prev => prev.driver !== d.driver && areTeammates(prev.driver, d.driver));

    const base = isTeammateOfEarlier ? '#000000' : getColor(d.driver);
    colors.push(dupeCount === 0 ? base : blendToWhite(base, Math.min(dupeCount * 0.2, 0.5)));
  });

  return colors;
}

function buildLabel(d: DriverMeta, idx: number, drivers: DriverMeta[]): string {
  const dupes = drivers.filter(x => x.driver === d.driver).length;
  if (dupes > 1) return `${d.driver} L${d.lap}`;
  return d.driver;
}

const SECTOR_KEYS = ['s1', 's2', 's3'] as const;

// ── Chart margin constants (must match JSX below) ────────────────────────────
const MARGIN = { top: 8, right: 20, left: 52, bottom: 12 };

// ── Component ────────────────────────────────────────────────────────────────

export default function TelemetryViewMulti({ telemetryData, getDriverColor, areTeammates, loading }: Props) {
  const isMobile = useIsMobile();
  const n = telemetryData.drivers.length;
  // Beyond 2 drivers the LIVE panel's fixed-width sidebar runs out of room —
  // shrink labels/values and switch delta to a shorter format so nothing
  // overflows the card instead of clipping mid-value.
  const liveCompact = n >= 3;
  const colors = useMemo(
    () => buildColors(telemetryData.drivers, getDriverColor, areTeammates),
    [telemetryData, getDriverColor, areTeammates],
  );
  const labels = useMemo(
    () => telemetryData.drivers.map((d, i) => buildLabel(d, i, telemetryData.drivers)),
    [telemetryData]
  );

  // Fastest driver in the comparison — used as the delta reference instead of
  // whichever driver happened to be selected/clicked first.
  const fastestIdx = useMemo(() => {
    let best = 0;
    telemetryData.drivers.forEach((d, i) => {
      const bestTime = telemetryData.drivers[best].lapTime;
      if (d.lapTime != null && (bestTime == null || d.lapTime < bestTime)) best = i;
    });
    return best;
  }, [telemetryData]);

  // ── Transform to Recharts flat format ──────────────────────────────────────
  const chartData = useMemo(() => {
    return telemetryData.telemetry.map(pt => {
      const row: Record<string, number> = { distance: pt.distance };
      pt.speeds.forEach((v, i) => { row[`spd${i}`] = v; });
      pt.throttles.forEach((v, i) => { row[`thr${i}`] = v; });
      pt.brakes.forEach((v, i) => { row[`brk${i}`] = v ? 1 : 0; });
      pt.gears.forEach((v, i) => { row[`gear${i}`] = v; });
      // Rebase deltas onto the fastest driver (backend gives them vs drivers[0]).
      const refDelta = pt.deltas[fastestIdx] ?? 0;
      pt.deltas.forEach((v, i) => { row[`dlt${i}`] = v - refDelta; });
      pt.rpms.forEach((v, i) => { row[`rpm${i}`] = v; });
      return row;
    });
  }, [telemetryData, fastestIdx]);

  // Distance array for binary search
  const distances = useMemo(
    () => telemetryData.telemetry.map(pt => pt.distance),
    [telemetryData]
  );
  const maxDist = distances[distances.length - 1] ?? 5000;

  // Speed axis floor — round down to the nearest 10 km/h below the actual
  // slowest point on track. A car never sits at 0 km/h mid-lap, so starting
  // the axis there just wastes vertical space and flattens the trace.
  const speedYDomain = useMemo((): [number, string] => {
    let min = Infinity;
    telemetryData.telemetry.forEach(pt => {
      pt.speeds.forEach(s => { if (s < min) min = s; });
    });
    const floor = isFinite(min) ? Math.floor(min / 10) * 10 : 0;
    return [floor, 'dataMax'];
  }, [telemetryData]);

  // ── Track dominance — segment-coloured by whichever driver is fastest ──────
  const trackViz = useMemo(() => {
    const pts = telemetryData.telemetry;
    if (pts.length < 2) return null;

    // Apply FastF1's own circuit rotation so the mini-map matches the
    // orientation used by official track maps, instead of whatever arbitrary
    // angle the raw GPS/local coordinate frame happens to be in.
    const rot = ((telemetryData.rotation ?? 0) * Math.PI) / 180;
    const cosA = Math.cos(rot), sinA = Math.sin(rot);
    const rx = (x: number, y: number) => x * cosA - y * sinA;
    // Negated: FastF1's rotation is designed for matplotlib's Y-up convention;
    // SVG's Y axis increases downward, so without this flip the track renders
    // as a vertical mirror image of the official orientation.
    const ry = (x: number, y: number) => -(x * sinA + y * cosA);

    const rxs = pts.map(p => rx(p.x, p.y)), rys = pts.map(p => ry(p.x, p.y));
    const minX = Math.min(...rxs), maxX = Math.max(...rxs);
    const minY = Math.min(...rys), maxY = Math.max(...rys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const W = 220, H = 195, pad = 12;
    // Uniform scale on both axes — preserves the real track shape instead of
    // stretching it to fill the box (elongated circuits like Baku or Spa would
    // otherwise render as an unrecognisable warped silhouette).
    const scale = Math.min((W - 2 * pad) / rangeX, (H - 2 * pad) / rangeY);
    const offX = pad + ((W - 2 * pad) - rangeX * scale) / 2;
    const offY = pad + ((H - 2 * pad) - rangeY * scale) / 2;
    const nx = (x: number, y: number) => offX + (rx(x, y) - minX) * scale;
    const ny = (x: number, y: number) => offY + (ry(x, y) - minY) * scale;

    const dominant = pts.map(pt => {
      let best = 0, bestV = pt.speeds[0] ?? 0;
      for (let i = 1; i < pt.speeds.length; i++) {
        if (pt.speeds[i] > bestV) { bestV = pt.speeds[i]; best = i; }
      }
      return best;
    });

    const segments: { path: string; color: string }[] = [];
    let curDriver = dominant[0];
    let curPath = `M${nx(pts[0].x, pts[0].y).toFixed(1)},${ny(pts[0].x, pts[0].y).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) {
      const coord = `${nx(pts[i].x, pts[i].y).toFixed(1)},${ny(pts[i].x, pts[i].y).toFixed(1)}`;
      if (dominant[i] !== curDriver) {
        curPath += ` L${coord}`;
        segments.push({ path: curPath, color: colors[curDriver] });
        curDriver = dominant[i];
        curPath = `M${nx(pts[i - 1].x, pts[i - 1].y).toFixed(1)},${ny(pts[i - 1].x, pts[i - 1].y).toFixed(1)} L${coord}`;
      } else {
        curPath += ` L${coord}`;
      }
    }
    segments.push({ path: curPath, color: colors[curDriver] });

    const outline = `M${pts.map(p => `${nx(p.x, p.y).toFixed(1)},${ny(p.x, p.y).toFixed(1)}`).join(' L')}`;

    const counts = new Array(n).fill(0);
    dominant.forEach(d => counts[d]++);
    const pct = counts.map(c => Math.round((c / dominant.length) * 100));

    // Corner number labels — offset outward from track centroid so they sit
    // beside the circuit outline rather than on top of it.
    const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
    const cornerMarkers = (telemetryData.corners ?? []).map(c => {
      const idx = nearestIdx(distances, c.distance);
      const p = pts[idx];
      const px = nx(p.x, p.y), py = ny(p.x, p.y);
      const dx = rx(p.x, p.y) - cx, dy = ry(p.x, p.y) - cy;
      const dlen = Math.hypot(dx, dy) || 1;
      return { lx: px + (dx / dlen) * 11, ly: py + (dy / dlen) * 11, label: `${c.number}${c.letter ?? ''}` };
    });

    const startFinish = { x: nx(pts[0].x, pts[0].y), y: ny(pts[0].x, pts[0].y) };

    return { W, H, nx, ny, pts, segments, outline, pct, cornerMarkers, startFinish };
  }, [telemetryData, colors, n, distances]);

  // ── Corner analysis — official FIA corner numbers from the backend, mapped
  //    onto this comparison's own distance grid (nearest telemetry sample) ────
  const corners = useMemo(() => {
    const tel = telemetryData.telemetry;
    if (!tel.length || !telemetryData.corners?.length) return [];
    return telemetryData.corners.map(c => {
      const idx = nearestIdx(distances, c.distance);
      return {
        label: `T${c.number}${c.letter ?? ''}`,
        distance: tel[idx].distance,
        speeds: tel[idx].speeds,
      };
    });
  }, [telemetryData, distances]);

  // ── Mini-sector dominance strip (24 buckets, N drivers) ────────────────────
  const miniSectors = useMemo(() => {
    const tel = telemetryData.telemetry;
    if (!tel.length) return [];
    const maxD = tel[tel.length - 1].distance || 1;
    const N_SEG = 24;
    const segSize = maxD / N_SEG;
    return Array.from({ length: N_SEG }, (_, i) => {
      const s = i * segSize, e = (i + 1) * segSize;
      const pts = tel.filter(p => p.distance >= s && p.distance < e);
      if (!pts.length) return -1;
      const avgs = Array.from({ length: n }, (_, di) =>
        pts.reduce((sum, p) => sum + p.speeds[di], 0) / pts.length,
      );
      let best = 0;
      for (let di = 1; di < n; di++) if (avgs[di] > avgs[best]) best = di;
      return best;
    });
  }, [telemetryData, n]);

  // ── Refs for DOM manipulation ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackMarkerRef = useRef<SVGCircleElement>(null);

  // Per-driver, per-channel DOM refs for live panel
  const liveRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const rafRef = useRef<number>(0);

  const [trackHover, setTrackHover] = useState(false);

  // ── Loupe zoom — hover-follow magnifier, toggled by the button below ──────
  // A plain CSS scaleX (previous version) is GPU-smooth but blurry: the
  // browser composites the chart as a bitmap layer at its normal pixel size
  // and then stretches that bitmap, so magnifying it upscales past its own
  // resolution. Fix: only the hovered row switches, just for the duration of
  // the hover, to an internal render RENDER_SCALE× wider (same data, more
  // pixels to work with) — then the CSS transform only ever uses ~70% of
  // that budget (ZOOM_TARGET/RENDER_SCALE), so it's always downsampling,
  // never upsampling → crisp. The other 5 rows, and this row once the hover
  // leaves, stay on the original 100%-width render, byte-for-byte unchanged.
  const [loupeMode, setLoupeMode] = useState(false);
  const [zoomChartIdx, setZoomChartIdx] = useState<number | null>(null);
  const chartRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const zoomWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRowRef = useRef<number | null>(null);
  const RENDER_SCALE = 6; // internal pre-render width multiplier (resolution headroom)
  const ZOOM_TARGET = 4.2; // visual magnification actually shown while hovering

  // ── Mousemove → crosshair + live panel + track marker + loupe zoom ───────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const plotW = rect.width - MARGIN.left - MARGIN.right;
        const frac = Math.max(0, Math.min(1, (relX - MARGIN.left) / plotW));
        const dist = frac * maxDist;
        const idx = nearestIdx(distances, dist);
        const pt = telemetryData.telemetry[idx];
        if (!pt) return;

        // Loupe zoom — CSS transform on the hovered row only, updated every
        // frame; no React state involved in the per-frame path (setZoomChartIdx
        // only fires on a row change, which is what mounts/unmounts the wide
        // render for that one row).
        if (loupeMode) {
          let hoveredRow: number | null = null;
          let hoveredRowRect: DOMRect | null = null;
          for (let r = 0; r < chartRowRefs.current.length; r++) {
            const el = chartRowRefs.current[r];
            if (!el) continue;
            const rr = el.getBoundingClientRect();
            if (e.clientY >= rr.top && e.clientY <= rr.bottom) { hoveredRow = r; hoveredRowRect = rr; break; }
          }
          if (hoveredRow !== hoveredRowRef.current) {
            if (hoveredRowRef.current != null) {
              const prevEl = zoomWrapRefs.current[hoveredRowRef.current];
              if (prevEl) prevEl.style.transform = 'none';
            }
            hoveredRowRef.current = hoveredRow;
            setZoomChartIdx(hoveredRow);
          }
          if (hoveredRow != null && hoveredRowRect) {
            const el = zoomWrapRefs.current[hoveredRow];
            if (el) {
              // rowWidth is the row's own (unwidened) box — unaffected by its
              // overflowing child, so it stays the stable reference even while
              // that child is rendered RENDER_SCALE× wider.
              const rowWidth = hoveredRowRect.width;
              const plotWNormal = rowWidth - MARGIN.left - MARGIN.right;
              const plotWWide = RENDER_SCALE * rowWidth - MARGIN.left - MARGIN.right;
              const sZoom = (plotWNormal * ZOOM_TARGET) / plotWWide;
              // Anchor: the point under the cursor (at raw pixel relX) must
              // land back on relX after the wide render is scaled by sZoom.
              const tZoom = relX - sZoom * (MARGIN.left + frac * plotWWide);
              el.style.transformOrigin = '0 0';
              el.style.transform = `translateX(${tZoom}px) scaleX(${sZoom})`;
            }
          }
        }

        // Crosshair
        if (crosshairRef.current) {
          crosshairRef.current.style.left = `${MARGIN.left + frac * plotW}px`;
          crosshairRef.current.style.opacity = '1';
        }

        // Live panel values
        for (let i = 0; i < n; i++) {
          const spd = liveRefs.current[`spd${i}`];
          const thr = liveRefs.current[`thr${i}`];
          const brk = liveRefs.current[`brk${i}`];
          const gear = liveRefs.current[`gear${i}`];
          const rpm = liveRefs.current[`rpm${i}`];
          const dlt = liveRefs.current[`dlt${i}`];
          if (spd) spd.textContent = `${Math.round(pt.speeds[i])}`;
          if (thr) thr.textContent = `${Math.round(pt.throttles[i])}%`;
          if (brk) { brk.textContent = pt.brakes[i] ? 'ON' : 'OFF'; brk.style.color = pt.brakes[i] ? '#ef4444' : '#6b7280'; }
          if (gear) gear.textContent = `${Math.round(pt.gears[i])}`;
          if (rpm) rpm.textContent = fmtRpm(pt.rpms[i]);
          if (dlt) { const d = pt.deltas[i] - pt.deltas[fastestIdx]; dlt.textContent = fmtDelta(d, liveCompact); dlt.style.color = d > 0 ? '#ef4444' : d < 0 ? '#22c55e' : '#6b7280'; }
        }

        if (panelRef.current) panelRef.current.style.opacity = '1';

        // Track marker
        if (trackMarkerRef.current && trackViz) {
          const { nx, ny, pts } = trackViz;
          const p = pts[idx] ?? pts[0];
          trackMarkerRef.current.setAttribute('cx', String(nx(p.x, p.y).toFixed(1)));
          trackMarkerRef.current.setAttribute('cy', String(ny(p.x, p.y).toFixed(1)));
          trackMarkerRef.current.style.opacity = '1';
        }
      });
    };

    const leave = () => {
      if (crosshairRef.current) crosshairRef.current.style.opacity = '0';
      if (panelRef.current) panelRef.current.style.opacity = '0';
      if (trackMarkerRef.current) trackMarkerRef.current.style.opacity = '0';
      // Leaving the chart while the loupe is active drops back to the full lap
      // — the zoom only exists while you're actively pointing at something.
      if (hoveredRowRef.current != null) {
        const el = zoomWrapRefs.current[hoveredRowRef.current];
        if (el) el.style.transform = 'none';
      }
      hoveredRowRef.current = null;
      setZoomChartIdx(null);
    };

    container.addEventListener('mousemove', handler);
    container.addEventListener('mouseleave', leave);
    return () => {
      container.removeEventListener('mousemove', handler);
      container.removeEventListener('mouseleave', leave);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [distances, maxDist, n, telemetryData, trackViz, fastestIdx, liveCompact, loupeMode]);

  // Turning the loupe off should immediately restore the full-lap view.
  useEffect(() => {
    if (!loupeMode) {
      setZoomChartIdx(null);
      if (hoveredRowRef.current != null) {
        const el = zoomWrapRefs.current[hoveredRowRef.current];
        if (el) el.style.transform = 'none';
        hoveredRowRef.current = null;
      }
    }
  }, [loupeMode]);

  // ── Axis formatters ────────────────────────────────────────────────────────
  const fmtDist = (v: number) => `${(v / 1000).toFixed(1)}km`;
  const fmtSpeed = (v: number) => `${Math.round(v)}`;
  const fmtPct = (v: number) => `${Math.round(v)}%`;
  const fmtGear = (v: number) => `${Math.round(v)}`;

  // Recharts always renders the full lap now — the loupe is a CSS transform,
  // not a domain change. The zoomed row's own tick text gets hidden (it would
  // otherwise visually stretch along with the transform); it comes back the
  // instant that row stops being the hovered one.
  const xAxisPropsFor = (rowIdx: number) => ({
    dataKey: 'distance' as const,
    stroke: 'transparent',
    tick: zoomChartIdx === rowIdx ? false : { fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' },
    tickLine: false,
    tickFormatter: fmtDist,
    type: 'number' as const,
    domain: [0, maxDist] as [number, number],
  });

  const GRID  = { strokeDasharray: '3 4', stroke: 'var(--chart-grid)', vertical: false };
  const CORNER_LINE = { stroke: 'var(--border-hi)', strokeDasharray: '2 3' };
  const TICK  = { fill: 'var(--text-2)', fontSize: 9, fontFamily: 'JetBrains Mono' };

  const panel: React.CSSProperties = {
    background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r2)',
  };
  const cardStyle: React.CSSProperties = {
    background: 'var(--panel)', border: '1px solid var(--border-hi)', borderRadius: 'var(--r2)', padding: '12px',
  };

  const hasSectors = telemetryData.drivers.some(d => d.sectors.s1 != null);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-3">

      {/* ── Driver stats header + mini-sector dominance (side by side) ──────── */}
      <div style={{ ...panel, padding: '12px 14px' }}>
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 20, alignItems: isMobile ? 'stretch' : 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: isMobile ? undefined : '0 0 auto', width: isMobile ? '100%' : undefined }}>
            {telemetryData.drivers.map((d, i) => {
              const allBySector = SECTOR_KEYS.map(k =>
                telemetryData.drivers.map(dd => dd.sectors[k]).filter((v): v is number => v != null),
              );
              const ref = telemetryData.drivers[fastestIdx];
              const gapLabel = i === fastestIdx
                ? 'REF'
                : d.lapTime != null && ref.lapTime != null
                  ? fmtDelta(d.lapTime - ref.lapTime)
                  : '—';
              const gapColor = i === fastestIdx ? colors[fastestIdx]
                : d.lapTime != null && ref.lapTime != null
                  ? (d.lapTime - ref.lapTime > 0 ? '#c0392b' : '#1e8449')
                  : 'var(--text-2)';

              return (
                <div key={i} className="flex items-center gap-4" style={isMobile ? { flexWrap: 'wrap', rowGap: 4 } : undefined}>
                  <div className="flex items-center gap-2" style={{ width: 118, flexShrink: 0 }}>
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[i] }} />
                    <span className="font-rajdhani font-black text-sm" style={{ color: colors[i] }}>{labels[i]}</span>
                    <span className="data-value text-xs" style={{ color: 'var(--text-2)' }}>{fmtTime(d.lapTime)}</span>
                  </div>

                  <span className="data-value text-xs" style={{ width: 62, flexShrink: 0, color: gapColor, fontWeight: i === fastestIdx ? 400 : 700 }}>
                    {gapLabel}
                  </span>

                  {hasSectors && SECTOR_KEYS.map((k, si) => {
                    const val = d.sectors[k];
                    const isBest = val != null && allBySector[si].length > 0 && val === Math.min(...allBySector[si]);
                    return (
                      <span key={k} className="data-value text-xs" style={{ color: isBest ? colors[i] : 'var(--text-2)' }}>
                        <span style={{ color: 'var(--text-3)', marginRight: 4 }}>{k.toUpperCase()}</span>
                        <span style={{ fontWeight: isBest ? 700 : 400 }}>{fmtSector(val)}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Mini-sector dominance — fills the remaining width to the right of the sector times */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="label-section mb-1" style={{ color: 'var(--text-3)' }}>MINI-SECTORS</div>
            <div style={{ display: 'flex', gap: 2, height: 14 }}>
              {miniSectors.map((seg, i) => (
                <div
                  key={i}
                  title={seg >= 0 ? `Segment ${i + 1}: ${labels[seg]} fastest` : undefined}
                  style={{ flex: 1, borderRadius: 1, background: seg >= 0 ? colors[seg] : 'var(--border)' }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Charts + Live Panel + Track Dominance ───────────────────────────── */}
      <div style={{ ...panel, padding: '12px' }}>
        <div className="flex gap-3">

          {/* Charts column */}
          <div
            ref={containerRef}
            className="relative flex-1 overflow-hidden"
            style={{ cursor: loupeMode ? 'zoom-in' : 'crosshair' }}
          >
            {/* Loupe toggle — hover-follow zoom on all 6 synced charts */}
            <button
              onClick={() => setLoupeMode(v => !v)}
              title={loupeMode ? 'Zoom loupe on — click to turn off' : 'Turn on hover-zoom loupe'}
              className="absolute z-40 flex items-center justify-center"
              style={{
                top: 0, right: 4, width: 22, height: 22,
                borderRadius: 'var(--r)',
                border: `1px solid ${loupeMode ? 'var(--accent)' : 'var(--border)'}`,
                background: loupeMode ? 'var(--accent-20)' : 'var(--surface)',
                color: loupeMode ? 'var(--accent)' : 'var(--text-3)',
                cursor: 'pointer', outline: 'none',
                transition: 'all 0.15s',
              }}
            >
              <ZoomIn size={12} />
            </button>

            {/* Crosshair */}
            <div
              ref={crosshairRef}
              className="absolute top-0 bottom-0 w-px pointer-events-none z-30"
              style={{
                opacity: 0, left: 0, transition: 'opacity 0.08s',
                background: 'linear-gradient(to bottom, transparent, var(--accent-30) 5%, var(--accent-30) 95%, transparent)',
              }}
            />

            {/* Speed */}
            <div ref={(el) => { chartRowRefs.current[0] = el; }} className="h-[220px] sm:h-[300px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>SPEED km/h</div>
              <div ref={(el) => { zoomWrapRefs.current[0] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 0 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(0)} hide />
                    <YAxis stroke="transparent" tick={zoomChartIdx === 0 ? false : TICK} tickLine={false} tickFormatter={fmtSpeed} domain={speedYDomain} width={48} />
                    {corners.map((c, i) => (
                      <ReferenceLine
                        key={i} x={c.distance} {...CORNER_LINE}
                        label={{ value: c.label, position: 'insideTop', fill: 'var(--text-3)', fontSize: 8, fontFamily: 'JetBrains Mono' }}
                      />
                    ))}
                    {Array.from({ length: n }, (_, i) => (
                      <Line key={i} type="monotone" dataKey={`spd${i}`} stroke={colors[i]} strokeWidth={i === 0 ? 1.5 : 1.2}
                        dot={false} isAnimationActive={false} strokeDasharray={i > 0 && telemetryData.drivers[i].driver === telemetryData.drivers[0].driver ? '4 2' : undefined} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Throttle */}
            <div ref={(el) => { chartRowRefs.current[1] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>THROTTLE %</div>
              <div ref={(el) => { zoomWrapRefs.current[1] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 1 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(1)} hide />
                    <YAxis stroke="transparent" tick={zoomChartIdx === 1 ? false : TICK} tickLine={false} tickFormatter={fmtPct} domain={[0, 100]} width={48} />
                    {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
                    {Array.from({ length: n }, (_, i) => (
                      <Line key={i} type="monotone" dataKey={`thr${i}`} stroke={colors[i]} strokeWidth={i === 0 ? 1.5 : 1.2}
                        dot={false} isAnimationActive={false} strokeDasharray={i > 0 && telemetryData.drivers[i].driver === telemetryData.drivers[0].driver ? '4 2' : undefined} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Brake */}
            <div ref={(el) => { chartRowRefs.current[2] = el; }} className="h-[60px] sm:h-[75px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>BRAKE</div>
              <div ref={(el) => { zoomWrapRefs.current[2] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 2 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(2)} hide />
                    <YAxis stroke="transparent" tick={false} domain={[0, 1]} width={48} />
                    {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
                    {Array.from({ length: n }, (_, i) => (
                      <Line key={i} type="stepAfter" dataKey={`brk${i}`} stroke={colors[i]} strokeWidth={i === 0 ? 2 : 1.5}
                        dot={false} isAnimationActive={false} opacity={0.85} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gear */}
            <div ref={(el) => { chartRowRefs.current[3] = el; }} className="h-[100px] sm:h-[130px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>GEAR</div>
              <div ref={(el) => { zoomWrapRefs.current[3] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 3 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(3)} hide />
                    <YAxis stroke="transparent" tick={zoomChartIdx === 3 ? false : TICK} tickLine={false} tickFormatter={fmtGear} domain={[1, 8]} ticks={[1, 2, 3, 4, 5, 6, 7, 8]} width={48} />
                    {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
                    {Array.from({ length: n }, (_, i) => (
                      <Line key={i} type="stepAfter" dataKey={`gear${i}`} stroke={colors[i]} strokeWidth={i === 0 ? 1.5 : 1.2}
                        dot={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Delta vs fastest driver */}
            <div ref={(el) => { chartRowRefs.current[4] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>
                DELTA vs <span style={{ color: colors[fastestIdx] }}>{labels[fastestIdx]}</span> — s
              </div>
              <div ref={(el) => { zoomWrapRefs.current[4] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 4 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(4)} hide />
                    <YAxis stroke="transparent" tick={zoomChartIdx === 4 ? false : TICK} tickLine={false} tickFormatter={(v: number) => v.toFixed(1)} width={48} />
                    {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
                    <ReferenceLine y={0} stroke={colors[fastestIdx]} strokeWidth={1.5} />
                    {Array.from({ length: n }, (_, i) => i !== fastestIdx && (
                      <Line key={i} type="monotone" dataKey={`dlt${i}`} stroke={colors[i]} strokeWidth={1.5}
                        dot={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* RPM */}
            <div ref={(el) => { chartRowRefs.current[5] = el; }} className="h-[110px] sm:h-[150px] overflow-hidden flex flex-col">
              <div className="label-section ml-1 mb-0.5 flex-shrink-0" style={{ color: 'var(--text-2)' }}>RPM</div>
              <div ref={(el) => { zoomWrapRefs.current[5] = el; }} className="flex-1 min-h-0" style={{ width: zoomChartIdx === 5 ? `${RENDER_SCALE * 100}%` : '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} syncId="multi" margin={MARGIN}>
                    <CartesianGrid {...GRID} />
                    <XAxis {...xAxisPropsFor(5)} />
                    <YAxis stroke="transparent" tick={zoomChartIdx === 5 ? false : TICK} tickLine={false} tickFormatter={fmtRpm} domain={['dataMin - 300', 'dataMax + 300']} width={48} />
                    {corners.map((c, i) => <ReferenceLine key={i} x={c.distance} {...CORNER_LINE} />)}
                    {Array.from({ length: n }, (_, i) => (
                      <Line key={i} type="monotone" dataKey={`rpm${i}`} stroke={colors[i]} strokeWidth={i === 0 ? 1.5 : 1.2}
                        dot={false} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Side column — Live readouts + Track dominance */}
          <div className="hidden sm:flex flex-col gap-3 flex-shrink-0 w-[230px]">

            {/* Live Panel — reveals on chart hover */}
            <div
              ref={panelRef}
              style={{ ...cardStyle, opacity: 0, transition: 'opacity 0.12s' }}
            >
              <p className="label-section mb-2" style={{ color: 'var(--accent)' }}>LIVE</p>

              {/* Header row */}
              <div className={liveCompact ? 'grid gap-x-1 mb-2' : 'grid gap-x-2 mb-2'} style={{ gridTemplateColumns: `${liveCompact ? 32 : 64}px repeat(${n}, 1fr)` }}>
                <span />
                {labels.map((lbl, i) => (
                  <span
                    key={i}
                    className="font-rajdhani font-black text-right truncate"
                    style={{ color: colors[i], fontSize: liveCompact ? 10 : 12 }}
                  >
                    {lbl}
                  </span>
                ))}
              </div>

              {/* Rows */}
              {[
                { label: 'Speed', shortLabel: 'SPD', key: 'spd' },
                { label: 'Throttle', shortLabel: 'THR', key: 'thr' },
                { label: 'Brake', shortLabel: 'BRK', key: 'brk' },
                { label: 'Gear', shortLabel: 'GEAR', key: 'gear' },
                { label: 'RPM', shortLabel: 'RPM', key: 'rpm' },
                { label: 'Delta', shortLabel: 'DLT', key: 'dlt' },
              ].map(({ label, shortLabel, key }) => (
                <div
                  key={key}
                  className={liveCompact ? 'grid gap-x-1 mb-2 items-center' : 'grid gap-x-2 mb-2 items-center'}
                  style={{ gridTemplateColumns: `${liveCompact ? 32 : 64}px repeat(${n}, 1fr)` }}
                >
                  <span className="label-section" style={{ fontSize: liveCompact ? 8 : 9 }}>{liveCompact ? shortLabel : label}</span>
                  {Array.from({ length: n }, (_, i) => (
                    <span
                      key={i}
                      ref={el => { liveRefs.current[`${key}${i}`] = el; }}
                      className="data-value text-right"
                      style={{ color: 'var(--text)', fontSize: liveCompact ? 10 : 13, fontWeight: 400 }}
                    >—</span>
                  ))}
                </div>
              ))}
            </div>

            {/* Track Dominance — always visible; hover reveals corner analysis */}
            <div
              style={{ ...cardStyle, position: 'relative' }}
              onMouseEnter={() => setTrackHover(true)}
              onMouseLeave={() => setTrackHover(false)}
            >
              <p className="label-section mb-2" style={{ color: 'var(--accent)' }}>TRACK DOMINANCE</p>

              {trackViz ? (
                <>
                  <svg viewBox={`0 0 ${trackViz.W} ${trackViz.H}`} className="w-full">
                    <defs>
                      <pattern id="tv-sf-checker" width="3" height="3" patternUnits="userSpaceOnUse">
                        <rect width="3" height="3" fill="#fff" />
                        <rect width="1.5" height="1.5" fill="#000" />
                        <rect x="1.5" y="1.5" width="1.5" height="1.5" fill="#000" />
                      </pattern>
                    </defs>
                    <path d={trackViz.outline} fill="none" stroke="var(--border)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
                    {trackViz.segments.map((seg, i) => (
                      <path key={i} d={seg.path} fill="none" stroke={seg.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity={0.95} />
                    ))}
                    <rect
                      x={trackViz.startFinish.x - 4} y={trackViz.startFinish.y - 4}
                      width="8" height="8" fill="url(#tv-sf-checker)"
                      stroke="var(--text)" strokeWidth="0.5"
                    />
                    {trackViz.cornerMarkers.map((m, i) => (
                      <text
                        key={i} x={m.lx} y={m.ly}
                        fontSize="6" fontFamily="JetBrains Mono, monospace"
                        textAnchor="middle" dominantBaseline="middle"
                        fill="var(--text-2)"
                      >
                        {m.label}
                      </text>
                    ))}
                    <circle ref={trackMarkerRef} cx="0" cy="0" r="5" fill="var(--panel)" stroke="var(--accent)" strokeWidth="1.5" style={{ opacity: 0, transition: 'opacity 0.1s' }} />
                  </svg>

                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1.5">
                    {labels.map((lbl, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: colors[i] }} />
                        <span className="data-value text-[9px]" style={{ color: colors[i] }}>{lbl} {trackViz.pct[i]}%</span>
                      </div>
                    ))}
                  </div>

                  {/* Hover overlay — corner analysis (mirrors the dedicated Track page) */}
                  <div
                    style={{
                      position: 'absolute', inset: 0, padding: 12,
                      background: 'var(--panel)', borderRadius: 'var(--r2)',
                      opacity: trackHover ? 1 : 0,
                      pointerEvents: trackHover ? 'auto' : 'none',
                      transition: 'opacity 0.15s',
                      overflowY: 'auto',
                    }}
                  >
                    <p className="label-section mb-2" style={{ color: 'var(--accent)' }}>
                      CORNER ANALYSIS · {corners.length} · KM/H
                    </p>
                    <div className="flex flex-col gap-1">
                      {corners.length === 0 && (
                        <span className="data-value text-[9px]" style={{ color: 'var(--text-3)' }}>Corner data unavailable</span>
                      )}

                      {corners.length > 0 && (
                        <div className="grid gap-x-2 mb-1" style={{ gridTemplateColumns: `32px repeat(${n}, 1fr)` }}>
                          <span />
                          {labels.map((lbl, i) => (
                            <span key={i} className="data-value text-[8px] text-right" style={{ color: colors[i] }}>{lbl}</span>
                          ))}
                        </div>
                      )}

                      {corners.map((c, idx) => {
                        let best = 0;
                        for (let i = 1; i < c.speeds.length; i++) if (c.speeds[i] > c.speeds[best]) best = i;
                        return (
                          <div key={idx} className="grid gap-x-2 items-center" style={{ gridTemplateColumns: `32px repeat(${n}, 1fr)` }}>
                            <span className="data-value text-[9px]" style={{ color: 'var(--text-2)' }}>{c.label}</span>
                            {c.speeds.map((s, i) => (
                              <span
                                key={i}
                                className="data-value text-[9px] text-right"
                                style={{ color: i === best ? colors[i] : 'var(--text-2)', fontWeight: i === best ? 700 : 400 }}
                              >
                                {Math.round(s)}
                              </span>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <span className="data-value text-[9px]" style={{ color: 'var(--text-3)' }}>GPS data not available</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
