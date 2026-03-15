import React, { useEffect, useRef, useMemo } from 'react';
import type { ProcessedPositionData, ProcessedDriver } from '../../services/livetiming/types';

interface Props {
  gpsPositions: ProcessedPositionData[];
  trackHistory:  { x: number; y: number }[];
  drivers:       ProcessedDriver[];
}

const CANVAS_SIZE = 380;
const PADDING     = 20;
const DOT_RADIUS  = 6;

export default function TrackMapWidget({ gpsPositions, trackHistory, drivers }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const driverMap = useMemo(() => {
    const m = new Map<number, ProcessedDriver>();
    drivers.forEach(d => m.set(d.driver_number, d));
    return m;
  }, [drivers]);

  // Compute bounding box from track history + current positions
  const bounds = useMemo(() => {
    const all = [...trackHistory, ...gpsPositions.map(p => ({ x: p.x ?? 0, y: p.y ?? 0 }))];
    if (all.length === 0) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of all) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, maxX, minY, maxY };
  }, [trackHistory, gpsPositions]);

  const toCanvas = (x: number, y: number): [number, number] => {
    if (!bounds) return [CANVAS_SIZE / 2, CANVAS_SIZE / 2];
    const rangeX = bounds.maxX - bounds.minX || 1;
    const rangeY = bounds.maxY - bounds.minY || 1;
    const scale  = Math.min(
      (CANVAS_SIZE - PADDING * 2) / rangeX,
      (CANVAS_SIZE - PADDING * 2) / rangeY,
    );
    const cx = PADDING + (x - bounds.minX) * scale;
    // F1 Y axis is inverted vs canvas
    const cy = CANVAS_SIZE - PADDING - (y - bounds.minY) * scale;
    return [cx, cy];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // ── Track outline ───────────────────────────────────────────────────────
    if (trackHistory.length > 2) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 3;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      const [sx, sy] = toCanvas(trackHistory[0].x, trackHistory[0].y);
      ctx.moveTo(sx, sy);
      for (let i = 1; i < trackHistory.length; i++) {
        const [px, py] = toCanvas(trackHistory[i].x, trackHistory[i].y);
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // ── Driver dots ─────────────────────────────────────────────────────────
    for (const pos of gpsPositions) {
      if (pos.x == null || pos.y == null) continue;
      const driver = driverMap.get(pos.driver_number);
      const color  = driver ? `#${driver.team_colour}` : '#888888';
      const acronym = driver?.name_acronym ?? String(pos.driver_number);
      const [cx, cy] = toCanvas(pos.x, pos.y);

      // Shadow
      ctx.shadowColor = color;
      ctx.shadowBlur  = 6;

      // Dot
      ctx.beginPath();
      ctx.arc(cx, cy, DOT_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowBlur = 0;

      // Acronym label
      ctx.font         = 'bold 8px monospace';
      ctx.fillStyle    = '#ffffff';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(acronym, cx, cy);
    }
  }, [gpsPositions, trackHistory, driverMap, bounds]);

  const onTrackCount = gpsPositions.filter(p => p.status === 'OnTrack').length;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-base">🗺️</span> TRACK MAP
        </h3>
        {onTrackCount > 0 && (
          <span className="text-xs text-gray-400">{onTrackCount} on track</span>
        )}
      </div>

      {trackHistory.length < 10 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm gap-2">
          <span className="text-2xl">🏎️</span>
          <span>Building track map…</span>
          <span className="text-xs text-gray-600">Needs ~1 lap of position data</span>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full"
          style={{ maxWidth: CANVAS_SIZE, display: 'block', margin: '0 auto' }}
        />
      )}
    </div>
  );
}
