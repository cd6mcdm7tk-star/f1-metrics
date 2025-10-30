import { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { MapPin, Globe as GlobeIcon, X } from 'lucide-react';

interface Circuit {
  name: string;
  country: string;
  lat: number;
  lng: number;
  length: string;
  laps: number;
  firstGP: string;
  lapRecord: string;
  recordHolder: string;
  corners: number;
  drsZones: number;
  topSpeed: string;
  circuitType: string;
  direction: string;
  characteristics: string[];
}

const circuits: Circuit[] = [
  { 
    name: "Bahrain International Circuit", 
    country: "Bahrain", 
    lat: 26.0325, 
    lng: 50.5106, 
    length: "5.412 km", 
    laps: 57, 
    firstGP: "2004", 
    lapRecord: "1:31.447", 
    recordHolder: "Pedro de la Rosa (2005)",
    corners: 15,
    drsZones: 3,
    topSpeed: "336 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Night Race", "Desert", "High-Speed"]
  },
  { 
    name: "Jeddah Corniche Circuit", 
    country: "Saudi Arabia", 
    lat: 21.6319, 
    lng: 39.1044, 
    length: "6.174 km", 
    laps: 50, 
    firstGP: "2021", 
    lapRecord: "1:30.734", 
    recordHolder: "Lewis Hamilton (2021)",
    corners: 27,
    drsZones: 3,
    topSpeed: "322 km/h",
    circuitType: "Street Circuit",
    direction: "Anti-Clockwise",
    characteristics: ["Night Race", "Coastal", "Longest Street Circuit"]
  },
  { 
    name: "Albert Park Circuit", 
    country: "Australia", 
    lat: -37.8497, 
    lng: 144.9680, 
    length: "5.278 km", 
    laps: 58, 
    firstGP: "1996", 
    lapRecord: "1:20.260", 
    recordHolder: "Charles Leclerc (2024)",
    corners: 14,
    drsZones: 4,
    topSpeed: "329 km/h",
    circuitType: "Street Circuit",
    direction: "Clockwise",
    characteristics: ["Lakeside", "Bumpy", "Season Opener"]
  },
  { 
    name: "Suzuka International Racing Course", 
    country: "Japan", 
    lat: 34.8431, 
    lng: 136.5408, 
    length: "5.807 km", 
    laps: 53, 
    firstGP: "1987", 
    lapRecord: "1:30.983", 
    recordHolder: "Lewis Hamilton (2019)",
    corners: 18,
    drsZones: 2,
    topSpeed: "319 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Figure-8", "Technical", "Fast Corners"]
  },
  { 
    name: "Shanghai International Circuit", 
    country: "China", 
    lat: 31.3389, 
    lng: 121.2200, 
    length: "5.451 km", 
    laps: 56, 
    firstGP: "2004", 
    lapRecord: "1:32.238", 
    recordHolder: "Michael Schumacher (2004)",
    corners: 16,
    drsZones: 2,
    topSpeed: "327 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Long Straight", "Unique Layout", "Snail Corner"]
  },
  { 
    name: "Miami International Autodrome", 
    country: "USA (Miami)", 
    lat: 25.9581, 
    lng: -80.2389, 
    length: "5.412 km", 
    laps: 57, 
    firstGP: "2022", 
    lapRecord: "1:29.708", 
    recordHolder: "Max Verstappen (2023)",
    corners: 19,
    drsZones: 3,
    topSpeed: "343 km/h",
    circuitType: "Street Circuit",
    direction: "Anti-Clockwise",
    characteristics: ["Coastal", "New Circuit", "Stadium Section"]
  },
  { 
    name: "Autodromo Enzo e Dino Ferrari", 
    country: "Italy (Imola)", 
    lat: 44.3439, 
    lng: 11.7167, 
    length: "4.909 km", 
    laps: 63, 
    firstGP: "1980", 
    lapRecord: "1:15.484", 
    recordHolder: "Lewis Hamilton (2020)",
    corners: 19,
    drsZones: 2,
    topSpeed: "316 km/h",
    circuitType: "Permanent",
    direction: "Anti-Clockwise",
    characteristics: ["Historic", "Technical", "Elevation Changes"]
  },
  { 
    name: "Circuit de Monaco", 
    country: "Monaco", 
    lat: 43.7347, 
    lng: 7.4206, 
    length: "3.337 km", 
    laps: 78, 
    firstGP: "1950", 
    lapRecord: "1:12.909", 
    recordHolder: "Lewis Hamilton (2021)",
    corners: 19,
    drsZones: 1,
    topSpeed: "290 km/h",
    circuitType: "Street Circuit",
    direction: "Clockwise",
    characteristics: ["Iconic", "Tight & Twisty", "No Margin for Error"]
  },
  { 
    name: "Circuit Gilles Villeneuve", 
    country: "Canada", 
    lat: 45.5000, 
    lng: -73.5228, 
    length: "4.361 km", 
    laps: 70, 
    firstGP: "1978", 
    lapRecord: "1:13.078", 
    recordHolder: "Valtteri Bottas (2019)",
    corners: 14,
    drsZones: 3,
    topSpeed: "344 km/h",
    circuitType: "Semi-Permanent",
    direction: "Clockwise",
    characteristics: ["Island Circuit", "Hard Braking", "High Speed"]
  },
  { 
    name: "Circuit de Barcelona-Catalunya", 
    country: "Spain", 
    lat: 41.5700, 
    lng: 2.2611, 
    length: "4.657 km", 
    laps: 66, 
    firstGP: "1991", 
    lapRecord: "1:18.149", 
    recordHolder: "Max Verstappen (2023)",
    corners: 16,
    drsZones: 2,
    topSpeed: "328 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Technical", "Testing Circuit", "High Downforce"]
  },
  { 
    name: "Red Bull Ring", 
    country: "Austria", 
    lat: 47.2197, 
    lng: 14.7647, 
    length: "4.318 km", 
    laps: 71, 
    firstGP: "1970", 
    lapRecord: "1:05.619", 
    recordHolder: "Carlos Sainz (2020)",
    corners: 10,
    drsZones: 3,
    topSpeed: "318 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Shortest Lap", "Alpine", "Elevation Changes"]
  },
  { 
    name: "Silverstone Circuit", 
    country: "Great Britain", 
    lat: 52.0786, 
    lng: -1.0169, 
    length: "5.891 km", 
    laps: 52, 
    firstGP: "1950", 
    lapRecord: "1:27.097", 
    recordHolder: "Max Verstappen (2020)",
    corners: 18,
    drsZones: 2,
    topSpeed: "334 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Historic", "High Speed Corners", "Home of British GP"]
  },
  { 
    name: "Hungaroring", 
    country: "Hungary", 
    lat: 47.5789, 
    lng: 19.2486, 
    length: "4.381 km", 
    laps: 70, 
    firstGP: "1986", 
    lapRecord: "1:16.627", 
    recordHolder: "Lewis Hamilton (2020)",
    corners: 14,
    drsZones: 2,
    topSpeed: "309 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Twisty", "Low Speed", "Hard to Overtake"]
  },
  { 
    name: "Circuit de Spa-Francorchamps", 
    country: "Belgium", 
    lat: 50.4372, 
    lng: 5.9714, 
    length: "7.004 km", 
    laps: 44, 
    firstGP: "1950", 
    lapRecord: "1:46.286", 
    recordHolder: "Valtteri Bottas (2018)",
    corners: 19,
    drsZones: 2,
    topSpeed: "336 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Longest Circuit", "Legendary", "Eau Rouge"]
  },
  { 
    name: "Circuit Zandvoort", 
    country: "Netherlands", 
    lat: 52.3888, 
    lng: 4.5409, 
    length: "4.259 km", 
    laps: 72, 
    firstGP: "1952", 
    lapRecord: "1:11.097", 
    recordHolder: "Lewis Hamilton (2021)",
    corners: 14,
    drsZones: 2,
    topSpeed: "315 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Banked Corners", "Coastal", "Narrow Track"]
  },
  { 
    name: "Autodromo Nazionale di Monza", 
    country: "Italy (Monza)", 
    lat: 45.6156, 
    lng: 9.2811, 
    length: "5.793 km", 
    laps: 53, 
    firstGP: "1950", 
    lapRecord: "1:21.046", 
    recordHolder: "Rubens Barrichello (2004)",
    corners: 11,
    drsZones: 2,
    topSpeed: "360 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Temple of Speed", "Low Downforce", "Historic"]
  },
  { 
    name: "Baku City Circuit", 
    country: "Azerbaijan", 
    lat: 40.3725, 
    lng: 49.8533, 
    length: "6.003 km", 
    laps: 51, 
    firstGP: "2016", 
    lapRecord: "1:43.009", 
    recordHolder: "Charles Leclerc (2019)",
    corners: 20,
    drsZones: 2,
    topSpeed: "358 km/h",
    circuitType: "Street Circuit",
    direction: "Anti-Clockwise",
    characteristics: ["Longest Straight", "Old Town", "Unpredictable"]
  },
  { 
    name: "Marina Bay Street Circuit", 
    country: "Singapore", 
    lat: 1.2914, 
    lng: 103.8640, 
    length: "4.940 km", 
    laps: 62, 
    firstGP: "2008", 
    lapRecord: "1:35.867", 
    recordHolder: "Lewis Hamilton (2023)",
    corners: 19,
    drsZones: 3,
    topSpeed: "315 km/h",
    circuitType: "Street Circuit",
    direction: "Anti-Clockwise",
    characteristics: ["Night Race", "High Humidity", "Bumpy Surface"]
  },
  { 
    name: "Circuit of the Americas", 
    country: "USA (Austin)", 
    lat: 30.1328, 
    lng: -97.6411, 
    length: "5.513 km", 
    laps: 56, 
    firstGP: "2012", 
    lapRecord: "1:36.169", 
    recordHolder: "Charles Leclerc (2019)",
    corners: 20,
    drsZones: 2,
    topSpeed: "330 km/h",
    circuitType: "Permanent",
    direction: "Anti-Clockwise",
    characteristics: ["Turn 1 Hill", "Varied Corners", "Modern Facility"]
  },
  { 
    name: "Autódromo Hermanos Rodríguez", 
    country: "Mexico", 
    lat: 19.4042, 
    lng: -99.0907, 
    length: "4.304 km", 
    laps: 71, 
    firstGP: "1963", 
    lapRecord: "1:17.774", 
    recordHolder: "Valtteri Bottas (2021)",
    corners: 17,
    drsZones: 3,
    topSpeed: "371 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["High Altitude", "Thin Air", "Stadium Section"]
  },
  { 
    name: "Autódromo José Carlos Pace", 
    country: "Brazil", 
    lat: -23.7036, 
    lng: -46.6997, 
    length: "4.309 km", 
    laps: 71, 
    firstGP: "1973", 
    lapRecord: "1:10.540", 
    recordHolder: "Valtteri Bottas (2018)",
    corners: 15,
    drsZones: 2,
    topSpeed: "320 km/h",
    circuitType: "Permanent",
    direction: "Anti-Clockwise",
    characteristics: ["Passionate Fans", "Bumpy", "Anti-Clockwise"]
  },
  { 
    name: "Las Vegas Street Circuit", 
    country: "USA (Las Vegas)", 
    lat: 36.1147, 
    lng: -115.1728, 
    length: "6.120 km", 
    laps: 50, 
    firstGP: "2023", 
    lapRecord: "1:35.490", 
    recordHolder: "Oscar Piastri (2023)",
    corners: 17,
    drsZones: 2,
    topSpeed: "350 km/h",
    circuitType: "Street Circuit",
    direction: "Anti-Clockwise",
    characteristics: ["Night Race", "Vegas Strip", "Cold Temperatures"]
  },
  { 
    name: "Losail International Circuit", 
    country: "Qatar", 
    lat: 25.4900, 
    lng: 51.4542, 
    length: "5.380 km", 
    laps: 57, 
    firstGP: "2021", 
    lapRecord: "1:24.319", 
    recordHolder: "Max Verstappen (2023)",
    corners: 16,
    drsZones: 2,
    topSpeed: "342 km/h",
    circuitType: "Permanent",
    direction: "Clockwise",
    characteristics: ["Night Race", "MotoGP Track", "Fast Corners"]
  },
  { 
    name: "Yas Marina Circuit", 
    country: "Abu Dhabi", 
    lat: 24.4672, 
    lng: 54.6031, 
    length: "5.281 km", 
    laps: 58, 
    firstGP: "2009", 
    lapRecord: "1:26.103", 
    recordHolder: "Max Verstappen (2021)",
    corners: 16,
    drsZones: 2,
    topSpeed: "330 km/h",
    circuitType: "Permanent",
    direction: "Anti-Clockwise",
    characteristics: ["Sunset Race", "Modern Facility", "Season Finale"]
  }
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

function createTextTexture(text: string): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    ctx.fillStyle = '#00E5CC';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
  }
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function CircuitMarker({ circuit, onClick, isSelected, roundNumber }: { circuit: Circuit; onClick: () => void; isSelected: boolean; roundNumber: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const position = latLngToVector3(circuit.lat, circuit.lng, 2.02);

  useFrame((state) => {
    if (meshRef.current && !isSelected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.15);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    onClick();
  };

  return (
    <group position={position}>
      <mesh ref={glowRef} onClick={handleClick}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#00E5CC" transparent opacity={0.15} />
      </mesh>
      <mesh ref={meshRef} onClick={handleClick}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#00E5CC" toneMapped={false} />
      </mesh>
      {isSelected && (
        <mesh onClick={handleClick}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#00E5CC" transparent opacity={0.3} />
        </mesh>
      )}
      <mesh position={[0, 0.12, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.8} />
      </mesh>
      <sprite position={[0, 0.12, 0]} scale={[0.08, 0.08, 1]}>
        <spriteMaterial color="#00E5CC" map={createTextTexture(roundNumber.toString())} transparent />
      </sprite>
    </group>
  );
}

function CircuitTrack({ circuit }: { circuit: Circuit }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = latLngToVector3(circuit.lat, circuit.lng, 2.15);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.lookAt(0, 0, 0);
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 4) * 0.1);
    }
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <torusGeometry args={[0.12, 0.018, 16, 32]} />
        <meshBasicMaterial color="#00E5CC" toneMapped={false} />
      </mesh>
      <pointLight position={position} intensity={1.5} color="#00E5CC" distance={0.5} />
    </group>
  );
}

function CalendarLines() {
  const lineRefs = useRef<THREE.Line[]>([]);
  
  useFrame((state) => {
    lineRefs.current.forEach((line, index) => {
      if (line) {
        const material = line.material as THREE.LineBasicMaterial;
        material.opacity = 0.3 + Math.sin(state.clock.elapsedTime * 2 + index * 0.5) * 0.2;
      }
    });
  });

  const lines = [];
  
  for (let i = 0; i < circuits.length - 1; i++) {
    const start = latLngToVector3(circuits[i].lat, circuits[i].lng, 2.03);
    const end = latLngToVector3(circuits[i + 1].lat, circuits[i + 1].lng, 2.03);
    
    const points = [];
    const steps = 30;
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const point = new THREE.Vector3().lerpVectors(start, end, t);
      point.normalize().multiplyScalar(2.04);
      points.push(point);
    }
    
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    
    lines.push(
      <primitive
        key={`line-${i}`}
        object={new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: 0x00E5CC,
            transparent: true,
            opacity: 0.4,
            linewidth: 1
          })
        )}
        ref={(ref: THREE.Line) => {
          if (ref) lineRefs.current[i] = ref;
        }}
      />
    );
  }
  
  return <>{lines}</>;
}

const getCircuitRound = (circuitName: string): number => {
  const rounds: { [key: string]: number } = {
    'Bahrain': 1,
    'Saudi Arabia': 2,
    'Australia': 3,
    'Japan': 4,
    'China': 5,
    'Miami': 6,
    'Imola': 7,
    'Monaco': 8,
    'Canada': 9,
    'Spain': 10,
    'Austria': 11,
    'Great Britain': 12,
    'Hungary': 13,
    'Belgium': 14,
    'Netherlands': 15,
    'Monza': 16,
    'Azerbaijan': 17,
    'Singapore': 18,
    'Austin': 19,
    'Mexico': 20,
    'Brazil': 21,
    'Las Vegas': 22,
    'Qatar': 23,
    'Abu Dhabi': 24
  };

  for (const [key, round] of Object.entries(rounds)) {
    if (circuitName.includes(key)) return round;
  }
  return 1;
};

function CircuitLayoutDisplay({ circuit }: { circuit: Circuit }) {
  const [trackData, setTrackData] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchTrackData = async () => {
      try {
        setLoading(true);
        setError('');
        
        const round = getCircuitRound(circuit.country);
        const url = `https://metrikdelta-backend-eu-production.up.railway.app/api/racing-line/2024/${round}/Q/VER`;
        
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.gps_data && data.gps_data.length > 0) {
          const formattedData = data.gps_data.map((point: any) => ({
            x: point.x || point.X || 0,
            y: point.y || point.Y || 0
          }));
          setTrackData(formattedData);
        } else {
          setError('No GPS data available for this circuit');
        }
      } catch (error) {
        console.error('Error fetching track data:', error);
        setError('Circuit layout unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchTrackData();
  }, [circuit]);

  if (loading) {
    return (
      <div className="mb-6 bg-metrik-black/50 rounded-xl p-4 border border-turquoise-500/20">
        <h3 className="text-sm font-semibold text-turquoise-500 mb-3">CIRCUIT LAYOUT</h3>
        <div className="bg-metrik-card rounded-lg p-4 flex items-center justify-center min-h-[250px]">
          <div className="text-turquoise-500 animate-pulse">Loading circuit layout...</div>
        </div>
      </div>
    );
  }

  if (error || trackData.length === 0) {
    return (
      <div className="mb-6 bg-metrik-black/50 rounded-xl p-4 border border-turquoise-500/20">
        <h3 className="text-sm font-semibold text-turquoise-500 mb-3">CIRCUIT LAYOUT</h3>
        <div className="bg-metrik-card rounded-lg p-4 flex items-center justify-center min-h-[250px]">
          <div className="text-center">
            <div className="text-gray-500 mb-2">Circuit layout unavailable</div>
            {error && <div className="text-xs text-gray-600">{error}</div>}
          </div>
        </div>
      </div>
    );
  }

  const xCoords = trackData.map(p => p.x);
  const yCoords = trackData.map(p => p.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const width = 300;
  const height = 250;
  const padding = 20;
  
  const scaleX = (width - 2 * padding) / (maxX - minX);
  const scaleY = (height - 2 * padding) / (maxY - minY);
  const scale = Math.min(scaleX, scaleY);
  
  const points = trackData.map(point => {
    const x = padding + (point.x - minX) * scale;
    const y = padding + (point.y - minY) * scale;
    return `${x},${y}`;
  }).join(' ');

  const startX = padding + (trackData[0].x - minX) * scale;
  const startY = padding + (trackData[0].y - minY) * scale;

  return (
    <div className="mb-6 bg-metrik-black/50 rounded-xl p-4 border border-turquoise-500/20">
      <h3 className="text-sm font-semibold text-turquoise-500 mb-3">CIRCUIT LAYOUT</h3>
      <div className="bg-metrik-card rounded-lg p-4 flex items-center justify-center">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          <polyline
            points={points}
            fill="none"
            stroke="#00E5CC"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
          />
          <circle cx={startX} cy={startY} r="5" fill="#FFFFFF" />
          <text x={startX + 10} y={startY + 5} fill="#00E5CC" fontSize="10" fontWeight="bold">START</text>
        </svg>
      </div>
    </div>
  );
}

function Globe({ selectedCircuit, onCircuitSelect, showCalendar }: { selectedCircuit: Circuit | null; onCircuitSelect: (circuit: Circuit | null) => void; showCalendar: boolean }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (selectedCircuit && controlsRef.current) {
      setAutoRotate(false);
      const targetPosition = latLngToVector3(selectedCircuit.lat, selectedCircuit.lng, 2.02);
      
      const currentTarget = controlsRef.current.target.clone();
      const targetLookAt = targetPosition.clone().normalize().multiplyScalar(0.5);
      
      const startTarget = currentTarget.clone();
      const startDistance = controlsRef.current.object.position.length();
      const targetDistance = 4;
      
      let progress = 0;
      const duration = 1500;
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        progress = Math.min(elapsed / duration, 1);
        
        const eased = 1 - Math.pow(1 - progress, 3);
        
        controlsRef.current.target.lerpVectors(startTarget, targetLookAt, eased);
        
        const newDistance = startDistance + (targetDistance - startDistance) * eased;
        const direction = controlsRef.current.object.position.clone().normalize();
        controlsRef.current.object.position.copy(direction.multiplyScalar(newDistance));
        
        controlsRef.current.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [selectedCircuit]);

  const handleGlobeClick = (e: any) => {
    if (e.object === globeRef.current) {
      onCircuitSelect(null);
      setAutoRotate(true);
    }
  };

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <Sphere ref={globeRef} args={[2, 64, 64]} onClick={handleGlobeClick}>
        <meshStandardMaterial
          color="#0A2A3A"
          roughness={0.8}
          metalness={0.2}
          emissive="#001a2a"
          emissiveIntensity={0.2}
        />
      </Sphere>
      
      <Sphere args={[2.01, 64, 64]}>
        <meshBasicMaterial color="#00E5CC" transparent opacity={0.05} wireframe />
      </Sphere>

      {showCalendar && <CalendarLines />}

      {circuits.map((circuit, index) => (
        <CircuitMarker
          key={circuit.name}
          circuit={circuit}
          roundNumber={index + 1}
          onClick={() => {
            onCircuitSelect(circuit);
            setAutoRotate(false);
          }}
          isSelected={selectedCircuit?.name === circuit.name}
        />
      ))}

      {selectedCircuit && <CircuitTrack circuit={selectedCircuit} />}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        autoRotate={autoRotate}
        autoRotateSpeed={0.5}
        minDistance={3}
        maxDistance={15}
        enablePan={false}
      />
    </>
  );
}

export default function TrackDatabasePage() {
  const [selectedCircuit, setSelectedCircuit] = useState<Circuit | null>(null);
  const [showCalendar, setShowCalendar] = useState(true);

  return (
    <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <GlobeIcon className="w-10 h-10 text-turquoise-500" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-turquoise-500 bg-clip-text text-transparent">
              TRACK DATABASE 3D
            </h1>
          </div>
          <p className="text-gray-400 text-lg">
            Explore the 24 circuits of the Formula 1 World Championship
          </p>
        </div>

        <div className="relative h-[600px] rounded-2xl overflow-hidden border border-turquoise-500/20 bg-gradient-to-br from-metrik-card to-metrik-black/50">
          <Canvas
            camera={{ position: [0, 0, 8], fov: 45 }}
            style={{ background: '#0A0A0A' }}
          >
            <Globe selectedCircuit={selectedCircuit} onCircuitSelect={setSelectedCircuit} showCalendar={showCalendar} />
          </Canvas>

          {selectedCircuit && (
  <div className="absolute inset-0 md:inset-auto md:top-6 md:right-6 md:w-96 w-full h-full md:h-auto 
                  bg-metrik-card/95 backdrop-blur-xl border border-turquoise-500/30 
                  md:rounded-xl rounded-none p-4 md:p-6 shadow-2xl animate-fade-in 
                  md:max-h-[550px] max-h-full overflow-y-auto z-50">
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-turquoise-500" />
        <h3 className="text-lg md:text-xl font-bold text-turquoise-500">
          {selectedCircuit.country}
        </h3>
      </div>
      <button
        onClick={() => setSelectedCircuit(null)}
        className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg"
      >
        <X className="w-6 h-6 md:w-5 md:h-5" />
      </button>
    </div>

    <h2 className="text-xl md:text-2xl font-bold mb-4 md:mb-6 text-white">
      {selectedCircuit.name}
    </h2>

    <CircuitLayoutDisplay circuit={selectedCircuit} />

    <div className="grid grid-cols-2 gap-2 md:gap-3 mb-4">
      <div className="bg-metrik-black/30 rounded-lg p-2 md:p-3 border border-turquoise-500/10">
        <div className="text-xs text-gray-500 mb-1">Circuit Type</div>
        <div className="text-sm md:text-base text-turquoise-500 font-semibold">{selectedCircuit.circuitType}</div>
      </div>
      <div className="bg-metrik-black/30 rounded-lg p-2 md:p-3 border border-turquoise-500/10">
        <div className="text-xs text-gray-500 mb-1">Direction</div>
        <div className="text-sm md:text-base text-turquoise-500 font-semibold">{selectedCircuit.direction}</div>
      </div>
    </div>

    <div className="space-y-2 md:space-y-3">
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Circuit Length</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.length}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Race Laps</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.laps}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Total Corners</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.corners}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">DRS Zones</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.drsZones}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Top Speed</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.topSpeed}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">First Grand Prix</span>
        <span className="text-sm md:text-base text-white font-semibold">{selectedCircuit.firstGP}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Lap Record</span>
        <span className="text-sm md:text-base text-turquoise-500 font-bold">{selectedCircuit.lapRecord}</span>
      </div>
      <div className="flex justify-between items-center py-2 border-b border-turquoise-500/10">
        <span className="text-sm md:text-base text-gray-400">Record Holder</span>
        <span className="text-sm md:text-base text-white font-semibold text-right">{selectedCircuit.recordHolder}</span>
      </div>
      
      <div className="mt-4 pt-4 border-t border-turquoise-500/20">
        <div className="text-xs text-gray-500 mb-2">Circuit Characteristics</div>
        <div className="flex flex-wrap gap-2">
          {selectedCircuit.characteristics.map((char, idx) => (
            <span 
              key={idx}
              className="px-2 md:px-3 py-1 bg-turquoise-500/10 border border-turquoise-500/30 rounded-full text-xs text-turquoise-500 font-medium"
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>

    <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-turquoise-500/20 space-y-3">
      <div className="flex items-center gap-2 text-xs md:text-sm text-turquoise-500 bg-turquoise-500/10 rounded-lg px-3 py-2">
        <div className="w-2 h-2 rounded-full bg-turquoise-500 animate-pulse"></div>
        <span className="font-medium">Circuit marker visible on globe</span>
      </div>
      <button
        onClick={() => setSelectedCircuit(null)}
        className="w-full px-4 py-3 bg-turquoise-500/10 hover:bg-turquoise-500/20 border border-turquoise-500/30 rounded-lg text-turquoise-500 font-semibold transition-all touch-manipulation"
      >
        Reset View
      </button>
    </div>
  </div>
)}

          {!selectedCircuit && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-4 items-center">
              <div className="bg-metrik-card/80 backdrop-blur-xl border border-turquoise-500/30 rounded-full px-6 py-3 shadow-xl">
                <div className="text-gray-300 text-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-turquoise-500 animate-pulse block"></span>
                  Click on any circuit to view details
                </div>
              </div>
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className={`px-4 py-3 rounded-full font-semibold text-sm transition-all shadow-xl ${
                  showCalendar
                    ? 'bg-turquoise-500 text-black'
                    : 'bg-metrik-card/80 text-gray-300 border border-turquoise-500/30 backdrop-blur-xl'
                }`}
              >
                {showCalendar ? '📅 Calendar ON' : '📅 Calendar OFF'}
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {circuits.map((circuit) => (
            <button
              key={circuit.name}
              onClick={() => setSelectedCircuit(circuit)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                selectedCircuit?.name === circuit.name
                  ? 'bg-turquoise-500 text-black'
                  : 'bg-metrik-card/50 text-gray-300 hover:bg-turquoise-500/20 hover:text-turquoise-500 border border-turquoise-500/10'
              }`}
            >
              {circuit.country}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}