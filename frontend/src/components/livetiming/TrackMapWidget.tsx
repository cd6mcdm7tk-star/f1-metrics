import React, { useMemo } from 'react';
import type { ProcessedPositionData, ProcessedDriver } from '../../services/livetiming/types';

interface Props {
  gpsPositions:   ProcessedPositionData[];
  trackHistory:   { x: number; y: number }[];
  drivers:        ProcessedDriver[];
  circuitPoints?: { x: number; y: number }[];
}

const SVG_SIZE    = 400;
const PADDING     = 28;
const DOT_RADIUS  = 7;

// Rotate F1 coordinates 90° clockwise to match visual orientation
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

function normalize(
  x: number, y: number, bounds: Bounds, rotated = true
): [number, number] {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cy = (bounds.minY + bounds.maxY) / 2;
  const [rx, ry] = rotated ? rotate90(x, y, cx, cy) : [x, y];

  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const scale  = Math.min(
    (SVG_SIZE - PADDING * 2) / rangeX,
    (SVG_SIZE - PADDING * 2) / rangeY,
  );

  const offX = (SVG_SIZE - rangeX * scale) / 2;
  const offY = (SVG_SIZE - rangeY * scale) / 2;

  return [
    offX + (rx - bounds.minX) * scale,
    SVG_SIZE - offY - (ry - bounds.minY) * scale,
  ];
}

export default function TrackMapWidget({ gpsPositions, trackHistory, drivers, circuitPoints }: Props) {
  // Use circuitPoints from backend if available, otherwise fall back to trackHistory
  const activeTrackSource = (circuitPoints && circuitPoints.length > 0) ? circuitPoints : trackHistory;
  const driverMap = useMemo(() => {
    const m = new Map<number, ProcessedDriver>();
    drivers.forEach(d => m.set(d.driver_number, d));
    return m;
  }, [drivers]);

  // Build bounds from active track source (rotated)
  const bounds = useMemo(() => {
    if (activeTrackSource.length === 0) return null;
    const cx = activeTrackSource.reduce((s, p) => s + p.x, 0) / activeTrackSource.length;
    const cy = activeTrackSource.reduce((s, p) => s + p.y, 0) / activeTrackSource.length;
    const rotated = activeTrackSource.map(p => {
      const [rx, ry] = rotate90(p.x, p.y, cx, cy);
      return { x: rx, y: ry };
    });
    return computeBounds(rotated);
  }, [activeTrackSource]);

  // Track path
  const trackPath = useMemo(() => {
    if (!bounds || activeTrackSource.length < 5) return '';
    const cx = activeTrackSource.reduce((s, p) => s + p.x, 0) / activeTrackSource.length;
    const cy = activeTrackSource.reduce((s, p) => s + p.y, 0) / activeTrackSource.length;
    return activeTrackSource.map((p, i) => {
      const [rx, ry] = rotate90(p.x, p.y, cx, cy);
      const [sx, sy] = normalize(rx, ry, bounds, false);
      return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)},${sy.toFixed(1)}`;
    }).join(' ');
  }, [activeTrackSource, bounds]);

  // Driver positions normalized
  const driverDots = useMemo(() => {
    if (!bounds || gpsPositions.length === 0) return [];
    const cx = activeTrackSource.reduce((s, p) => s + p.x, 0) / (activeTrackSource.length || 1);
    const cy = activeTrackSource.reduce((s, p) => s + p.y, 0) / (activeTrackSource.length || 1);
    return gpsPositions
      .filter(p => p.x != null && p.y != null)
      .map(p => {
        const [rx, ry] = rotate90(p.x!, p.y!, cx, cy);
        const [sx, sy] = normalize(rx, ry, bounds, false);
        const driver    = driverMap.get(p.driver_number);
        const color     = driver ? `#${driver.team_colour}` : '#888888';
        const acronym   = driver?.name_acronym ?? String(p.driver_number);
        const inPit     = p.status === 'InPit';
        const retired   = p.status === 'Stopped';
        return { sx, sy, color, acronym, inPit, retired, driver_number: p.driver_number };
      });
  }, [gpsPositions, activeTrackSource, bounds, driverMap]);

  const onTrackCount = gpsPositions.filter(p => p.status === 'OnTrack').length;
  const hasTrack     = activeTrackSource.length >= 20;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <span>🗺️</span> TRACK MAP
        </h3>
        {onTrackCount > 0 && (
          <span className="text-xs text-gray-400">{onTrackCount} on track</span>
        )}
      </div>

      {!hasTrack ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-sm gap-2">
          <span className="text-2xl">🏎️</span>
          <span>Building track map…</span>
          <span className="text-xs text-gray-600">{activeTrackSource.length} / ~200 points</span>
        </div>
      ) : (
        <svg
          viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
          className="w-full h-full"
          style={{ maxHeight: SVG_SIZE }}
        >
          {/* Track outline */}
          {trackPath && (
            <path
              d={trackPath}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Driver dots */}
          {driverDots.map(({ sx, sy, color, acronym, inPit, retired }) => (
            <g
              key={acronym}
              style={{ transition: 'transform 0.8s ease-out' }}
              transform={`translate(${sx.toFixed(1)}, ${sy.toFixed(1)})`}
              opacity={retired ? 0.3 : inPit ? 0.6 : 1}
            >
              {/* Glow */}
              {!retired && (
                <circle r={DOT_RADIUS + 3} fill={color} opacity={0.2} />
              )}
              {/* Dot */}
              <circle
                r={DOT_RADIUS}
                fill={inPit ? '#333' : color}
                stroke={color}
                strokeWidth={inPit ? 2 : 0}
              />
              {/* Acronym */}
              <text
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6"
                fontWeight="bold"
                fontFamily="monospace"
                fill="white"
              >
                {acronym}
              </text>
            </g>
          ))}
        </svg>
      )}

      {/* Legend */}
      {hasTrack && driverDots.some(d => d.inPit) && (
        <div className="flex gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-600 border border-gray-400 inline-block" />
            In Pit
          </span>
        </div>
      )}
    </div>
  );
}
