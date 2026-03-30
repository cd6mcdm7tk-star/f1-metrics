import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Corner {
  number: number;
  name: string;
  position: number; // 0.0 to 1.0 (fraction of lap distance)
  type: string;
}

interface CornerMarkersProps {
  gpsData: { x: number; y: number }[];
  corners: Corner[];
}

/**
 * Arc-length parameterization: maps position 0.0-1.0 to actual track distance,
 * not GPS point index. Fixes corner placement on circuits with speed variation
 * (slow technical sections have many GPS points, fast straights have fewer).
 */
export function CornerMarkers({ gpsData, corners }: CornerMarkersProps) {
  const arcData = useMemo(() => {
    if (!gpsData || gpsData.length === 0) return null;

    // Build cumulative arc-length table
    const table = [0];
    for (let i = 1; i < gpsData.length; i++) {
      const dx = gpsData[i].x - gpsData[i - 1].x;
      const dy = gpsData[i].y - gpsData[i - 1].y;
      table.push(table[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }

    // Normalization bounds (same as Circuit3D)
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

    return { table, total: table[table.length - 1], minX, rangeX, minY, rangeY, scale };
  }, [gpsData]);

  if (!arcData || !corners || corners.length === 0) return null;

  function getPos(progress: number): THREE.Vector3 {
    const { table, total, minX, rangeX, minY, rangeY, scale } = arcData!;
    const target = Math.max(0, Math.min(1, progress)) * total;

    // Binary search for the GPS index at target distance
    let lo = 0, hi = gpsData.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (table[mid] < target) lo = mid + 1;
      else hi = mid;
    }

    const p = gpsData[lo];
    return new THREE.Vector3(
      (p.x - minX - rangeX / 2) * scale,
      0,
      (p.y - minY - rangeY / 2) * scale,
    );
  }

  return (
    <>
      {corners.map((corner) => {
        const pos3D = getPos(corner.position);
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
