import React, { useMemo } from 'react';
import { Map as MapIcon } from 'lucide-react';
import type { ProcessedPositionData, ProcessedDriver } from '../../services/livetiming/types';

interface Props {
  gpsPositions:   ProcessedPositionData[];
  trackHistory:   { x: number; y: number }[];
  drivers:        ProcessedDriver[];
  circuitPoints?: { x: number; y: number }[];
  circuitName?:   string;
}

const SVG_SIZE   = 400;
const PADDING    = 28;
const DOT_RADIUS = 7;

function rotate90(x: number, y: number, cx: number, cy: number): [number, number] {
  const dx = x - cx;
  const dy = y - cy;
  return [cx + dy, cy - dx];
}

interface Bounds { minX: number; maxX: number; minY: number; maxY: number }

function computeBounds(points: { x: number; y: number }[]): Bounds | null {
  if (points.length === 0) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

function normalizePoint(x: number, y: number, bounds: Bounds): [number, number] {
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const scale  = Math.min(
    (SVG_SIZE - PADDING * 2) / rangeX,
    (SVG_SIZE - PADDING * 2) / rangeY,
  );
  const offX = (SVG_SIZE - rangeX * scale) / 2;
  const offY = (SVG_SIZE - rangeY * scale) / 2;
  return [
    offX + (x - bounds.minX) * scale,
    SVG_SIZE - offY - (y - bounds.minY) * scale,
  ];
}

export default function TrackMapWidget({
  gpsPositions, trackHistory, drivers, circuitPoints, circuitName,
}: Props) {
  const activeTrackSource = (circuitPoints && circuitPoints.length > 0)
    ? circuitPoints
    : trackHistory;

  const driverMap = useMemo(() => {
    const m = new Map<number, ProcessedDriver>();
    drivers.forEach(d => m.set(d.driver_number, d));
    return m;
  }, [drivers]);

  const { rotatedTrack, bounds, trackCx, trackCy } = useMemo(() => {
    if (activeTrackSource.length === 0) {
      return { rotatedTrack: [], bounds: null, trackCx: 0, trackCy: 0 };
    }
    const cx = activeTrackSource.reduce((s, p) => s + p.x, 0) / activeTrackSource.length;
    const cy = activeTrackSource.reduce((s, p) => s + p.y, 0) / activeTrackSource.length;
    const rotated = activeTrackSource.map(p => {
      const [rx, ry] = rotate90(p.x, p.y, cx, cy);
      return { x: rx, y: ry };
    });
    return { rotatedTrack: rotated, bounds: computeBounds(rotated), trackCx: cx, trackCy: cy };
  }, [activeTrackSource]);

  const trackPath = useMemo(() => {
    if (!bounds || rotatedTrack.length < 5) return '';
    return rotatedTrack.map((p, i) => {
      const [sx, sy] = normalizePoint(p.x, p.y, bounds);
      return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(' ') + ' Z';
  }, [rotatedTrack, bounds]);

  const driverDots = useMemo(() => {
    if (!bounds || gpsPositions.length === 0) return [];
    return gpsPositions
      .filter(p => p.x != null && p.y != null)
      .map(p => {
        const [rx, ry] = rotate90(p.x!, p.y!, trackCx, trackCy);
        const [sx, sy] = normalizePoint(rx, ry, bounds);
        const driver   = driverMap.get(p.driver_number);
        const color    = driver ? `#${driver.team_colour}` : '#888888';
        const acronym  = driver?.name_acronym ?? String(p.driver_number);
        const inPit    = p.status === 'InPit';
        const retired  = p.status === 'Stopped';
        return { sx, sy, color, acronym, inPit, retired };
      });
  }, [gpsPositions, bounds, trackCx, trackCy, driverMap]);

  const hasTrack       = activeTrackSource.length >= 20;
  const isFetching     = !hasTrack && circuitPoints === undefined;
  const onTrackCount   = gpsPositions.filter(p => p.status === 'OnTrack').length;
  const hasLiveDrivers = driverDots.length > 0;

  return (
    <div className="bg-metrik-card border border-metrik-turquoise/30 rounded-lg overflow-hidden">

      {/* Header */}
      <div className="border-b border-metrik-turquoise/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapIcon size={16} className="text-metrik-turquoise" />
          <h3 className="font-rajdhani font-black text-white">TRACK MAP</h3>
          {circuitName && (
            <span className="text-xs text-metrik-silver hidden sm:inline">{circuitName}</span>
          )}
        </div>
        {onTrackCount > 0 && (
          <span className="text-xs text-metrik-silver font-mono">{onTrackCount} on track</span>
        )}
      </div>

      {/* Body */}
      <div className="p-3">
        {isFetching ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="w-8 h-8 border-2 border-metrik-turquoise/30 border-t-metrik-turquoise rounded-full animate-spin" />
            <span className="text-xs text-metrik-silver">Loading circuit…</span>
          </div>

        ) : !hasTrack ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2">
            <MapIcon size={28} className="text-metrik-turquoise/30" />
            <p className="text-metrik-silver text-sm">Circuit unavailable</p>
            {activeTrackSource.length > 0 && (
              <div className="w-36">
                <div className="h-1 bg-metrik-black rounded-full overflow-hidden">
                  <div
                    className="h-full bg-metrik-turquoise rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (activeTrackSource.length / 20) * 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-metrik-silver/50 text-center mt-1 font-mono">
                  {activeTrackSource.length} / 20 pts
                </p>
              </div>
            )}
          </div>

        ) : (
          <>
            <svg
              viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
              className="w-full"
              style={{ maxHeight: SVG_SIZE }}
            >
              {/* Track outline — glow + main line */}
              {trackPath && (
                <>
                  <path
                    d={trackPath}
                    fill="none"
                    stroke="rgba(0,210,190,0.10)"
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d={trackPath}
                    fill="none"
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </>
              )}

              {/* Driver dots */}
              {driverDots.map(({ sx, sy, color, acronym, inPit, retired }) => (
                <g
                  key={acronym}
                  style={{ transition: 'transform 0.8s ease-out' }}
                  transform={`translate(${sx.toFixed(1)}, ${sy.toFixed(1)})`}
                  opacity={retired ? 0.3 : 1}
                >
                  {!retired && !inPit && (
                    <circle r={DOT_RADIUS + 4} fill={color} opacity={0.18} />
                  )}
                  <circle
                    r={DOT_RADIUS}
                    fill={inPit ? '#1a1a2e' : color}
                    stroke={color}
                    strokeWidth={inPit ? 1.5 : 0}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="5.5"
                    fontWeight="bold"
                    fontFamily="monospace"
                    fill="white"
                  >
                    {acronym}
                  </text>
                </g>
              ))}
            </svg>

            {hasLiveDrivers && driverDots.some(d => d.inPit) && (
              <div className="flex gap-3 mt-2 px-1 text-[10px] text-metrik-silver">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full border border-metrik-silver/40 bg-[#1a1a2e] inline-block" />
                  In Pit
                </span>
              </div>
            )}

            {!hasLiveDrivers && (
              <p className="text-center text-[10px] text-metrik-silver/40 mt-1">
                Waiting for live positions…
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
