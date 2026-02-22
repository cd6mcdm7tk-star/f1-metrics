import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Corner {
  number: number;
  name: string;
  position: number; // 0.0 to 1.0
  type: string;
}

interface CornerMarkersProps {
  gpsData: { x: number; y: number }[];
  corners: Corner[];
}

/**
 * Obtenir la position 3D à un pourcentage donné du circuit
 */
function getPositionAtProgress(gpsData: { x: number; y: number }[], progress: number): THREE.Vector3 {
  if (gpsData.length === 0) return new THREE.Vector3(0, 0, 0);
  
  // Clamp progress entre 0 et 1
  const clampedProgress = Math.max(0, Math.min(1, progress));
  
  // Trouver l'index correspondant
  const index = Math.floor(clampedProgress * (gpsData.length - 1));
  const point = gpsData[index];
  
  // Normaliser les coordonnées (même logique que Circuit3D)
  const xCoords = gpsData.map(p => p.x);
  const yCoords = gpsData.map(p => p.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = 2 / Math.max(rangeX, rangeY);
  
  const x = (point.x - minX - rangeX / 2) * scale;
  const z = (point.y - minY - rangeY / 2) * scale;
  
  return new THREE.Vector3(x, 0, z);
}

/**
 * Composant pour afficher les markers de corners sur le circuit 3D
 */
export function CornerMarkers({ gpsData, corners }: CornerMarkersProps) {
  if (!gpsData || gpsData.length === 0 || !corners || corners.length === 0) {
    return null;
  }

  return (
    <>
      {corners.map((corner) => {
        const pos3D = getPositionAtProgress(gpsData, corner.position);
        
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
              style={{
                pointerEvents: 'none',
                userSelect: 'none',
              }}
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