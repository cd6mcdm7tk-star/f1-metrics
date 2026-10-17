import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Loader2, ZoomIn } from 'lucide-react';
import type { TelemetryDataMulti } from '../types/telemetry';
import { useIsMobile } from '../hooks/useIsMobile';
import TelemetryChartStack from './TelemetryChartStack';
import {
  buildChartData, buildColors, buildLabel, fastestLapIndex, fmtRpm,
  MARGIN, MOBILE_MARGIN, MOBILE_Y_AXIS_WIDTH, RENDER_SCALE, Y_AXIS_WIDTH,
} from './telemetryChart';

// ── Types ────────────────────────────────────────────────────────────────────

interface Props {
  telemetryData: TelemetryDataMulti;
  getDriverColor: (code: string) => string;
  areTeammates: (d1: string, d2: string) => boolean;
  loading?: boolean;
  /** Replays the lap up to this distance (m): traces stop there, and the live
   * readouts and track marker follow it instead of the pointer */
  replayDistance?: number;
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

function nearestIdx(arr: number[], val: number): number {
  let lo = 0, hi = arr.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= val) lo = mid; else hi = mid;
  }
  return Math.abs(arr[lo] - val) <= Math.abs(arr[hi] - val) ? lo : hi;
}

const SECTOR_KEYS = ['s1', 's2', 's3'] as const;

// A replay reveals the traces up to the crosshair through this clip
// (index.css), which keeps the axes and the work of a full lap
const REPLAY_CLIP_ID = 'telemetry-replay-clip';

// Where the plot starts: Recharts puts the Y axis inside the left margin
const PLOT_LEFT = MARGIN.left + Y_AXIS_WIDTH;

// ── Component ────────────────────────────────────────────────────────────────

export default function TelemetryViewMulti({ telemetryData, getDriverColor, areTeammates, loading, replayDistance }: Props) {
  const isMobile = useIsMobile();
  const chartMargin = isMobile ? MOBILE_MARGIN : MARGIN;
  const yAxisWidth = isMobile ? MOBILE_Y_AXIS_WIDTH : Y_AXIS_WIDTH;
  const n = telemetryData.drivers.length;
  // Beyond 2 drivers the live panel's fixed-width column needs smaller, shorter values
  const liveCompact = n >= 3;
  const colors = useMemo(
    () => buildColors(telemetryData.drivers, getDriverColor, areTeammates),
    [telemetryData, getDriverColor, areTeammates],
  );
  const labels = useMemo(
    () => telemetryData.drivers.map(d => buildLabel(d, telemetryData.drivers)),
    [telemetryData]
  );
  const dashed = useMemo(
    () => telemetryData.drivers.map((d, i) => i > 0 && d.driver === telemetryData.drivers[0].driver),
    [telemetryData]
  );

  // The delta reference, rather than whichever lap was picked first
  const fastestIdx = useMemo(() => fastestLapIndex(telemetryData.drivers), [telemetryData]);
  const chartData = useMemo(() => buildChartData(telemetryData, fastestIdx), [telemetryData, fastestIdx]);

  // Distance array for binary search
  const distances = useMemo(
    () => telemetryData.telemetry.map(pt => pt.distance),
    [telemetryData]
  );
  const maxDist = distances[distances.length - 1] ?? 5000;
  const xDomain = useMemo((): [number, number] => [0, maxDist], [maxDist]);

  // Speed axis from the slowest point (to the 10 km/h below), not 0, which flattened the trace
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

    // FastF1's circuit rotation, so the map matches official track maps
    const rot = ((telemetryData.rotation ?? 0) * Math.PI) / 180;
    const cosA = Math.cos(rot), sinA = Math.sin(rot);
    const rx = (x: number, y: number) => x * cosA - y * sinA;
    // Negated: FastF1's rotation assumes Y up, SVG's Y goes down
    const ry = (x: number, y: number) => -(x * sinA + y * cosA);

    const rxs = pts.map(p => rx(p.x, p.y)), rys = pts.map(p => ry(p.x, p.y));
    const minX = Math.min(...rxs), maxX = Math.max(...rxs);
    const minY = Math.min(...rys), maxY = Math.max(...rys);
    const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1;
    const W = 220, H = 195, pad = 12;
    // Same scale on both axes, so long circuits (Baku, Spa) keep their shape
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

    // In a replay, only the part of the lap driven so far
    const reached = replayDistance == null ? -1 : pts.findIndex(p => p.distance > replayDistance);
    const shown = reached === -1 ? pts.length : reached;
    const segments: { path: string; color: string }[] = [];
    let curDriver = dominant[0];
    let curPath = `M${nx(pts[0].x, pts[0].y).toFixed(1)},${ny(pts[0].x, pts[0].y).toFixed(1)}`;
    for (let i = 1; i < shown; i++) {
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
    if (shown > 1) segments.push({ path: curPath, color: colors[curDriver] });

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
  }, [telemetryData, colors, n, distances, replayDistance]);

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
      if (replayDistance != null && e > replayDistance) return -1;
      const pts = tel.filter(p => p.distance >= s && p.distance < e);
      if (!pts.length) return -1;
      const avgs = Array.from({ length: n }, (_, di) =>
        pts.reduce((sum, p) => sum + p.speeds[di], 0) / pts.length,
      );
      let best = 0;
      for (let di = 1; di < n; di++) if (avgs[di] > avgs[best]) best = di;
      return best;
    });
  }, [telemetryData, n, replayDistance]);

  // ── Refs for DOM manipulation ──────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const trackMarkerRef = useRef<SVGCircleElement>(null);
  const replayClipRef = useRef<SVGRectElement>(null);

  // Per-driver, per-channel DOM refs for live panel
  const liveRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const rafRef = useRef<number>(0);

  const [trackHover, setTrackHover] = useState(false);

  // ── Loupe zoom — hover-follow magnifier, toggled by the button below ──────
  // Scaling the chart up with CSS alone stretches a bitmap and blurs it. So
  // while hovered, a row is rendered RENDER_SCALE times wider and then scaled
  // down to ZOOM_TARGET: always downsampling, so always sharp.
  const [loupeMode, setLoupeMode] = useState(false);
  const [zoomChartIdx, setZoomChartIdx] = useState<number | null>(null);
  const chartRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const zoomWrapRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoveredRowRef = useRef<number | null>(null);
  const ZOOM_TARGET = 4.2; // visual magnification actually shown while hovering

  // Crosshair, live panel and track marker at one point of the lap
  const showReadouts = useCallback((idx: number, frac: number) => {
    const pt = telemetryData.telemetry[idx];
    const container = containerRef.current;
    if (!pt || !container) return;
    const plotW = container.clientWidth - PLOT_LEFT - MARGIN.right;
    // Crosshair, and the edge of a replay's traces
    if (crosshairRef.current) {
      crosshairRef.current.style.left = `${PLOT_LEFT + frac * plotW}px`;
      crosshairRef.current.style.opacity = '1';
    }
    replayClipRef.current?.setAttribute('width', `${PLOT_LEFT + frac * plotW}`);

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
  }, [telemetryData, n, fastestIdx, liveCompact, trackViz]);

  // ── Mousemove → crosshair + live panel + track marker + loupe zoom ───────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const rect = container.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const plotW = rect.width - PLOT_LEFT - MARGIN.right;
        const frac = Math.max(0, Math.min(1, (relX - PLOT_LEFT) / plotW));
        const dist = frac * maxDist;
        const idx = nearestIdx(distances, dist);
        const pt = telemetryData.telemetry[idx];
        if (!pt) return;

        // Per frame: only a CSS transform. React state changes only when the hovered row does.
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
              const rowWidth = hoveredRowRect.width;
              const plotWNormal = rowWidth - PLOT_LEFT - MARGIN.right;
              const plotWWide = RENDER_SCALE * rowWidth - PLOT_LEFT - MARGIN.right;
              const sZoom = (plotWNormal * ZOOM_TARGET) / plotWWide;
              // Keeps the point under the cursor in place
              const tZoom = relX - sZoom * (PLOT_LEFT + frac * plotWWide);
              el.style.transformOrigin = '0 0';
              el.style.transform = `translateX(${tZoom}px) scaleX(${sZoom})`;
            }
          }
        }

        showReadouts(idx, frac);
      });
    };

    const leave = () => {
      if (crosshairRef.current) crosshairRef.current.style.opacity = '0';
      if (panelRef.current) panelRef.current.style.opacity = '0';
      if (trackMarkerRef.current) trackMarkerRef.current.style.opacity = '0';
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
  }, [distances, maxDist, telemetryData, showReadouts, loupeMode]);

  useLayoutEffect(() => {
    if (replayDistance == null) return;
    showReadouts(nearestIdx(distances, replayDistance), Math.min(1, replayDistance / maxDist));
  }, [replayDistance, distances, maxDist, showReadouts]);

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
            data-export-watermark
            data-replay={replayDistance != null || undefined}
            className="relative flex-1 overflow-hidden"
            style={{ cursor: loupeMode ? 'zoom-in' : 'crosshair' }}
          >
            {replayDistance != null && (
              // In each chart's own coordinates, up to the crosshair (showReadouts)
              <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden="true">
                <clipPath id={REPLAY_CLIP_ID} clipPathUnits="userSpaceOnUse">
                  <rect ref={replayClipRef} x={0} y={0} width={0} height={10000} />
                </clipPath>
              </svg>
            )}

            {/* Loupe toggle — hover-follow zoom on all 6 synced charts */}
            <button
              data-export-hide
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

            <TelemetryChartStack
              chartData={chartData} colors={colors} labels={labels} dashed={dashed} fastestIdx={fastestIdx}
              corners={corners} xDomain={xDomain} speedYDomain={speedYDomain} margin={chartMargin} yAxisWidth={yAxisWidth}
              zoomChartIdx={zoomChartIdx} rowRefs={chartRowRefs} zoomWrapRefs={zoomWrapRefs}
            />
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

                  {/* Hover overlay: speed at each corner */}
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
