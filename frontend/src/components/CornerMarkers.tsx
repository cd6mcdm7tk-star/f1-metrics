import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Corner {
  number: number;
  name: string;
  position: number; // kept for type compatibility, not used for placement
  type: string;
}

interface CornerMarkersProps {
  gpsData: { x: number; y: number }[];
  corners: Corner[];
}

/**
 * Detect actual corner positions by finding curvature peaks in the GPS path.
 * Returns arc-length fractions (0.0–1.0) for each detected corner, sorted by
 * lap position. This replaces manually estimated position values in circuits.json.
 */
function detectCornerPositions(
  gpsData: { x: number; y: number }[],
  numCorners: number,
): number[] {
  const n = gpsData.length;
  if (n < 10 || numCorners === 0) return [];

  // Arc-length table
  const arcLen = [0];
  for (let i = 1; i < n; i++) {
    const dx = gpsData[i].x - gpsData[i - 1].x;
    const dy = gpsData[i].y - gpsData[i - 1].y;
    arcLen.push(arcLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
  }
  const total = arcLen[n - 1];

  // Direction angle at each point (using neighbours to reduce noise)
  const angles = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    angles[i] = Math.atan2(
      gpsData[i + 1].y - gpsData[i - 1].y,
      gpsData[i + 1].x - gpsData[i - 1].x,
    );
  }
  angles[0] = angles[1];
  angles[n - 1] = angles[n - 2];

  // Curvature proxy = |angular change| between consecutive direction vectors
  const curv = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i++) {
    let da = angles[i + 1] - angles[i];
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    curv[i] = Math.abs(da);
  }

  // Smooth curvature — window adapts to GPS point density
  const W = Math.max(8, Math.floor(n / 150));
  const smooth = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) {
      sum += curv[j]; cnt++;
    }
    smooth[i] = sum / cnt;
  }

  // Find local peaks with minimum gap to avoid double-counting one corner
  const minGap = Math.max(5, Math.floor(n / (numCorners * 3)));
  const peaks: { idx: number; val: number }[] = [];

  for (let i = 1; i < n - 1; i++) {
    if (smooth[i] > smooth[i - 1] && smooth[i] >= smooth[i + 1] && smooth[i] > 0.001) {
      const last = peaks[peaks.length - 1];
      if (!last || i - last.idx >= minGap) {
        peaks.push({ idx: i, val: smooth[i] });
      } else if (smooth[i] > last.val) {
        // Same cluster — keep the stronger peak
        peaks[peaks.length - 1] = { idx: i, val: smooth[i] };
      }
    }
  }

  // Take the N strongest peaks, then re-sort by lap position
  return peaks
    .sort((a, b) => b.val - a.val)
    .slice(0, numCorners)
    .sort((a, b) => a.idx - b.idx)
    .map(p => arcLen[p.idx] / total);
}

/**
 * Normalize a GPS point to the same 3D coordinate space as Circuit3D.
 */
function normalizePoint(
  p: { x: number; y: number },
  minX: number, rangeX: number,
  minY: number, rangeY: number,
  scale: number,
): THREE.Vector3 {
  return new THREE.Vector3(
    (p.x - minX - rangeX / 2) * scale,
    0,
    (p.y - minY - rangeY / 2) * scale,
  );
}

export function CornerMarkers({ gpsData, corners }: CornerMarkersProps) {
  // Compute normalization bounds + arc-length table + detected corner positions
  const computed = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return null;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of gpsData) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const scale = 2 / Math.max(rangeX, rangeY);

    // Arc-length for binary-search lookup
    const arcLen = [0];
    for (let i = 1; i < gpsData.length; i++) {
      const dx = gpsData[i].x - gpsData[i - 1].x;
      const dy = gpsData[i].y - gpsData[i - 1].y;
      arcLen.push(arcLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const total = arcLen[arcLen.length - 1];

    const numCorners = corners?.length ?? 0;
    const cornerFractions = detectCornerPositions(gpsData, numCorners);

    return { minX, rangeX, minY, rangeY, scale, arcLen, total, cornerFractions };
  }, [gpsData, corners?.length]);

  if (!computed || !corners || corners.length === 0) return null;

  const { minX, rangeX, minY, rangeY, scale, arcLen, total, cornerFractions } = computed;

  function getPos(fraction: number): THREE.Vector3 {
    const target = Math.max(0, Math.min(1, fraction)) * total;
    let lo = 0, hi = gpsData.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arcLen[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return normalizePoint(gpsData[lo], minX, rangeX, minY, rangeY, scale);
  }

  return (
    <>
      {corners.map((corner, i) => {
        const fraction = cornerFractions[i];
        if (fraction == null) return null;
        const pos3D = getPos(fraction);

        return (
          <group key={corner.number} position={pos3D}>
            {/* Barre verticale fine */}
            <mesh position={[0, 0.05, 0]}>
              <boxGeometry args={[0.006, 0.1, 0.006]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#FFFFFF"
                emissiveIntensity={0.4}
                transparent
                opacity={0.8}
              />
            </mesh>

            {/* Numéro du virage */}
            <Html
              position={[0, 0.12, 0]}
              center
              distanceFactor={0.8}
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              <div
                className="text-white text-[9px] font-bold"
                style={{
                  textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,229,204,0.6)',
                  fontFamily: 'Rajdhani, sans-serif',
                }}
                title={corner.name}
              >
                {corner.number}
              </div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

export default CornerMarkers;
