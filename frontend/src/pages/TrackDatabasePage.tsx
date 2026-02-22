import { useState, useRef, useEffect, Fragment } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
import * as THREE from 'three';
import { Globe as GlobeIcon, MapPin, X } from 'lucide-react';
import circuitsData from '../data/circuits.json';
import { CornerMarkers } from '../components/CornerMarkers';

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

interface CalendarRace {
  round: number;
  name: string;
  country: string;
  flag: string;
  date: string;
  laps: number;
  distance: string;
  circuit: Circuit;
}

const circuits: Circuit[] = [
  { name: "Bahrain International Circuit", country: "Bahrain", lat: 26.0325, lng: 50.5106, length: "5.412 km", laps: 57, firstGP: "2004", lapRecord: "1:31.447", recordHolder: "Pedro de la Rosa (2005)", corners: 15, drsZones: 3, topSpeed: "336 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Night Race", "Desert", "High-Speed"] },
  { name: "Jeddah Corniche Circuit", country: "Saudi Arabia", lat: 21.6319, lng: 39.1044, length: "6.174 km", laps: 50, firstGP: "2021", lapRecord: "1:30.734", recordHolder: "Lewis Hamilton (2021)", corners: 27, drsZones: 3, topSpeed: "322 km/h", circuitType: "Street Circuit", direction: "Anti-Clockwise", characteristics: ["Night Race", "Coastal", "Longest Street Circuit"] },
  { name: "Albert Park Circuit", country: "Australia", lat: -37.8497, lng: 144.9680, length: "5.278 km", laps: 58, firstGP: "1996", lapRecord: "1:20.260", recordHolder: "Charles Leclerc (2024)", corners: 14, drsZones: 4, topSpeed: "329 km/h", circuitType: "Street Circuit", direction: "Clockwise", characteristics: ["Lakeside", "Bumpy", "Season Opener"] },
  { name: "Suzuka International Racing Course", country: "Japan", lat: 34.8431, lng: 136.5408, length: "5.807 km", laps: 53, firstGP: "1987", lapRecord: "1:30.983", recordHolder: "Lewis Hamilton (2019)", corners: 18, drsZones: 2, topSpeed: "319 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Figure-8", "Technical", "Fast Corners"] },
  { name: "Shanghai International Circuit", country: "China", lat: 31.3389, lng: 121.2200, length: "5.451 km", laps: 56, firstGP: "2004", lapRecord: "1:32.238", recordHolder: "Michael Schumacher (2004)", corners: 16, drsZones: 2, topSpeed: "327 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Long Straight", "Unique Layout", "Snail Corner"] },
  { name: "Miami International Autodrome", country: "USA (Miami)", lat: 25.9581, lng: -80.2389, length: "5.412 km", laps: 57, firstGP: "2022", lapRecord: "1:29.708", recordHolder: "Max Verstappen (2023)", corners: 19, drsZones: 3, topSpeed: "343 km/h", circuitType: "Street Circuit", direction: "Anti-Clockwise", characteristics: ["Coastal", "New Circuit", "Stadium Section"] },
  { name: "Autodromo Enzo e Dino Ferrari", country: "Italy (Imola)", lat: 44.3439, lng: 11.7167, length: "4.909 km", laps: 63, firstGP: "1980", lapRecord: "1:15.484", recordHolder: "Lewis Hamilton (2020)", corners: 19, drsZones: 2, topSpeed: "316 km/h", circuitType: "Permanent", direction: "Anti-Clockwise", characteristics: ["Historic", "Technical", "Elevation Changes"] },
  { name: "Circuit de Monaco", country: "Monaco", lat: 43.7347, lng: 7.4206, length: "3.337 km", laps: 78, firstGP: "1950", lapRecord: "1:12.909", recordHolder: "Lewis Hamilton (2021)", corners: 19, drsZones: 1, topSpeed: "290 km/h", circuitType: "Street Circuit", direction: "Clockwise", characteristics: ["Iconic", "Tight & Twisty", "No Margin for Error"] },
  { name: "Circuit Gilles Villeneuve", country: "Canada", lat: 45.5000, lng: -73.5228, length: "4.361 km", laps: 70, firstGP: "1978", lapRecord: "1:13.078", recordHolder: "Valtteri Bottas (2019)", corners: 14, drsZones: 3, topSpeed: "344 km/h", circuitType: "Semi-Permanent", direction: "Clockwise", characteristics: ["Island Circuit", "Hard Braking", "High Speed"] },
  { name: "Circuit de Barcelona-Catalunya", country: "Spain", lat: 41.5700, lng: 2.2611, length: "4.657 km", laps: 66, firstGP: "1991", lapRecord: "1:18.149", recordHolder: "Max Verstappen (2023)", corners: 16, drsZones: 2, topSpeed: "328 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Technical", "Testing Circuit", "High Downforce"] },
  { name: "Red Bull Ring", country: "Austria", lat: 47.2197, lng: 14.7647, length: "4.318 km", laps: 71, firstGP: "1970", lapRecord: "1:05.619", recordHolder: "Carlos Sainz (2020)", corners: 10, drsZones: 3, topSpeed: "318 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Shortest Lap", "Alpine", "Elevation Changes"] },
  { name: "Silverstone Circuit", country: "Great Britain", lat: 52.0786, lng: -1.0169, length: "5.891 km", laps: 52, firstGP: "1950", lapRecord: "1:27.097", recordHolder: "Max Verstappen (2020)", corners: 18, drsZones: 2, topSpeed: "334 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Historic", "High Speed Corners", "Home of British GP"] },
  { name: "Hungaroring", country: "Hungary", lat: 47.5789, lng: 19.2486, length: "4.381 km", laps: 70, firstGP: "1986", lapRecord: "1:16.627", recordHolder: "Lewis Hamilton (2020)", corners: 14, drsZones: 2, topSpeed: "309 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Twisty", "Low Speed", "Hard to Overtake"] },
  { name: "Circuit de Spa-Francorchamps", country: "Belgium", lat: 50.4372, lng: 5.9714, length: "7.004 km", laps: 44, firstGP: "1950", lapRecord: "1:46.286", recordHolder: "Valtteri Bottas (2018)", corners: 19, drsZones: 2, topSpeed: "336 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Longest Circuit", "Legendary", "Eau Rouge"] },
  { name: "Circuit Zandvoort", country: "Netherlands", lat: 52.3888, lng: 4.5409, length: "4.259 km", laps: 72, firstGP: "1952", lapRecord: "1:11.097", recordHolder: "Lewis Hamilton (2021)", corners: 14, drsZones: 2, topSpeed: "315 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Banked Corners", "Coastal", "Narrow Track"] },
  { name: "Autodromo Nazionale di Monza", country: "Italy (Monza)", lat: 45.6156, lng: 9.2811, length: "5.793 km", laps: 53, firstGP: "1950", lapRecord: "1:21.046", recordHolder: "Rubens Barrichello (2004)", corners: 11, drsZones: 2, topSpeed: "360 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Temple of Speed", "Low Downforce", "Historic"] },
  { name: "Baku City Circuit", country: "Azerbaijan", lat: 40.3725, lng: 49.8533, length: "6.003 km", laps: 51, firstGP: "2016", lapRecord: "1:43.009", recordHolder: "Charles Leclerc (2019)", corners: 20, drsZones: 2, topSpeed: "358 km/h", circuitType: "Street Circuit", direction: "Anti-Clockwise", characteristics: ["Longest Straight", "Old Town", "Unpredictable"] },
  { name: "Marina Bay Street Circuit", country: "Singapore", lat: 1.2914, lng: 103.8640, length: "4.940 km", laps: 62, firstGP: "2008", lapRecord: "1:35.867", recordHolder: "Lewis Hamilton (2023)", corners: 19, drsZones: 3, topSpeed: "315 km/h", circuitType: "Street Circuit", direction: "Anti-Clockwise", characteristics: ["Night Race", "High Humidity", "Bumpy Surface"] },
  { name: "Circuit of the Americas", country: "USA (Austin)", lat: 30.1328, lng: -97.6411, length: "5.513 km", laps: 56, firstGP: "2012", lapRecord: "1:36.169", recordHolder: "Charles Leclerc (2019)", corners: 20, drsZones: 2, topSpeed: "330 km/h", circuitType: "Permanent", direction: "Anti-Clockwise", characteristics: ["Turn 1 Hill", "Varied Corners", "Modern Facility"] },
  { name: "Autódromo Hermanos Rodríguez", country: "Mexico", lat: 19.4042, lng: -99.0907, length: "4.304 km", laps: 71, firstGP: "1963", lapRecord: "1:17.774", recordHolder: "Valtteri Bottas (2021)", corners: 17, drsZones: 3, topSpeed: "371 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["High Altitude", "Thin Air", "Stadium Section"] },
  { name: "Autódromo José Carlos Pace", country: "Brazil", lat: -23.7036, lng: -46.6997, length: "4.309 km", laps: 71, firstGP: "1973", lapRecord: "1:10.540", recordHolder: "Valtteri Bottas (2018)", corners: 15, drsZones: 2, topSpeed: "320 km/h", circuitType: "Permanent", direction: "Anti-Clockwise", characteristics: ["Passionate Fans", "Bumpy", "Anti-Clockwise"] },
  { name: "Las Vegas Street Circuit", country: "USA (Las Vegas)", lat: 36.1147, lng: -115.1728, length: "6.120 km", laps: 50, firstGP: "2023", lapRecord: "1:35.490", recordHolder: "Oscar Piastri (2023)", corners: 17, drsZones: 2, topSpeed: "350 km/h", circuitType: "Street Circuit", direction: "Anti-Clockwise", characteristics: ["Night Race", "Vegas Strip", "Cold Temperatures"] },
  { name: "Losail International Circuit", country: "Qatar", lat: 25.4900, lng: 51.4542, length: "5.380 km", laps: 57, firstGP: "2021", lapRecord: "1:24.319", recordHolder: "Max Verstappen (2023)", corners: 16, drsZones: 2, topSpeed: "342 km/h", circuitType: "Permanent", direction: "Clockwise", characteristics: ["Night Race", "MotoGP Track", "Fast Corners"] },
  { name: "Yas Marina Circuit", country: "Abu Dhabi", lat: 24.4672, lng: 54.6031, length: "5.281 km", laps: 58, firstGP: "2009", lapRecord: "1:26.103", recordHolder: "Max Verstappen (2021)", corners: 16, drsZones: 2, topSpeed: "330 km/h", circuitType: "Permanent", direction: "Anti-Clockwise", characteristics: ["Sunset Race", "Modern Facility", "Season Finale"] }
];

const calendar2025: CalendarRace[] = [
  { round: 1, name: "Bahrain", country: "Bahrain", flag: "🇧🇭", date: "28 FEB - 02 MAR", laps: 57, distance: "308.238 km", circuit: circuits[0] },
  { round: 2, name: "Saudi Arabia", country: "Jeddah", flag: "🇸🇦", date: "07-09 MAR", laps: 50, distance: "308.45 km", circuit: circuits[1] },
  { round: 3, name: "Australia", country: "Melbourne", flag: "🇦🇺", date: "14-16 MAR", laps: 58, distance: "306.124 km", circuit: circuits[2] },
  { round: 4, name: "Japan", country: "Suzuka", flag: "🇯🇵", date: "28-30 MAR", laps: 53, distance: "307.471 km", circuit: circuits[3] },
  { round: 5, name: "China", country: "Shanghai", flag: "🇨🇳", date: "18-20 APR", laps: 56, distance: "305.256 km", circuit: circuits[4] },
  { round: 6, name: "USA", country: "Miami", flag: "🇺🇸", date: "02-04 MAY", laps: 57, distance: "308.326 km", circuit: circuits[5] },
  { round: 7, name: "Italy", country: "Imola", flag: "🇮🇹", date: "16-18 MAY", laps: 63, distance: "309.049 km", circuit: circuits[6] },
  { round: 8, name: "Monaco", country: "Monaco", flag: "🇲🇨", date: "23-25 MAY", laps: 78, distance: "260.286 km", circuit: circuits[7] },
  { round: 9, name: "Canada", country: "Montreal", flag: "🇨🇦", date: "13-15 JUN", laps: 70, distance: "305.27 km", circuit: circuits[8] },
  { round: 10, name: "Spain", country: "Barcelona", flag: "🇪🇸", date: "27-29 JUN", laps: 66, distance: "307.362 km", circuit: circuits[9] },
  { round: 11, name: "Austria", country: "Spielberg", flag: "🇦🇹", date: "27-29 JUN", laps: 71, distance: "306.578 km", circuit: circuits[10] },
  { round: 12, name: "Great Britain", country: "Silverstone", flag: "🇬🇧", date: "04-06 JUL", laps: 52, distance: "306.198 km", circuit: circuits[11] },
  { round: 13, name: "Hungary", country: "Budapest", flag: "🇭🇺", date: "25-27 JUL", laps: 70, distance: "306.63 km", circuit: circuits[12] },
  { round: 14, name: "Belgium", country: "Spa", flag: "🇧🇪", date: "25-27 JUL", laps: 44, distance: "308.052 km", circuit: circuits[13] },
  { round: 15, name: "Netherlands", country: "Zandvoort", flag: "🇳🇱", date: "29-31 AUG", laps: 72, distance: "306.648 km", circuit: circuits[14] },
  { round: 16, name: "Italy", country: "Monza", flag: "🇮🇹", date: "05-07 SEP", laps: 53, distance: "306.72 km", circuit: circuits[15] },
  { round: 17, name: "Azerbaijan", country: "Baku", flag: "🇦🇿", date: "19-21 SEP", laps: 51, distance: "306.049 km", circuit: circuits[16] },
  { round: 18, name: "Singapore", country: "Singapore", flag: "🇸🇬", date: "03-05 OCT", laps: 62, distance: "306.143 km", circuit: circuits[17] },
  { round: 19, name: "USA", country: "Austin", flag: "🇺🇸", date: "17-19 OCT", laps: 56, distance: "308.405 km", circuit: circuits[18] },
  { round: 20, name: "Mexico", country: "Mexico City", flag: "🇲🇽", date: "24-26 OCT", laps: 71, distance: "305.354 km", circuit: circuits[19] },
  { round: 21, name: "Brazil", country: "São Paulo", flag: "🇧🇷", date: "07-09 NOV", laps: 71, distance: "305.879 km", circuit: circuits[20] },
  { round: 22, name: "USA", country: "Las Vegas", flag: "🇺🇸", date: "20-22 NOV", laps: 50, distance: "306.183 km", circuit: circuits[21] },
  { round: 23, name: "Qatar", country: "Lusail", flag: "🇶🇦", date: "28-30 NOV", laps: 57, distance: "306.66 km", circuit: circuits[22] },
  { round: 24, name: "Abu Dhabi", country: "Yas Island", flag: "🇦🇪", date: "05-07 DEC", laps: 58, distance: "306.183 km", circuit: circuits[23] },
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
    ctx.fillStyle = '#00D2BE';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 32, 32);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

// 🔥 CIRCUIT MARKER avec roundNumber PARFAITEMENT SYNC
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

  return (
    <group position={position}>
      <mesh ref={glowRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#00D2BE" transparent opacity={0.15} />
      </mesh>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#00D2BE" toneMapped={false} />
      </mesh>
      {isSelected && (
        <mesh onClick={(e) => { e.stopPropagation(); onClick(); }}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#00D2BE" transparent opacity={0.3} />
        </mesh>
      )}
      <mesh position={[0, 0.12, 0]}>
        <circleGeometry args={[0.05, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.8} />
      </mesh>
      <sprite position={[0, 0.12, 0]} scale={[0.08, 0.08, 1]}>
        <spriteMaterial color="#00D2BE" map={createTextTexture(roundNumber.toString())} transparent />
      </sprite>
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
        object={new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: 0x00D2BE, transparent: true, opacity: 0.4, linewidth: 1 }))}
        ref={(ref: THREE.Line) => { if (ref) lineRefs.current[i] = ref; }}
      />
    );
  }
  return <>{lines}</>;
}

function Globe({ selectedRound, onCircuitSelect }: { selectedRound: number | null; onCircuitSelect: (round: number | null) => void }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const controlsRef = useRef<any>(null);
  const [autoRotate, setAutoRotate] = useState(true);

  useEffect(() => {
    if (selectedRound !== null && controlsRef.current) {
      setAutoRotate(false);
      const circuit = calendar2025.find(r => r.round === selectedRound)?.circuit;
      if (!circuit) return;
      const targetPosition = latLngToVector3(circuit.lat, circuit.lng, 2.02);
      const currentTarget = controlsRef.current.target.clone();
      const targetLookAt = targetPosition.clone().normalize().multiplyScalar(0.5);
      const startTarget = currentTarget.clone();
      const startDistance = controlsRef.current.object.position.length();
      const targetDistance = 4;
      let progress = 0;
      const duration = 1000;
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
        if (progress < 1) requestAnimationFrame(animate);
      };
      animate();
    }
  }, [selectedRound]);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      <Sphere ref={globeRef} args={[2, 64, 64]} onClick={(e) => { if (e.object === globeRef.current) { onCircuitSelect(null); setAutoRotate(true); } }}>
        <meshStandardMaterial color="#0A2A3A" roughness={0.8} metalness={0.2} emissive="#001a2a" emissiveIntensity={0.2} />
      </Sphere>
      <Sphere args={[2.01, 64, 64]}>
        <meshBasicMaterial color="#00D2BE" transparent opacity={0.05} wireframe />
      </Sphere>
      <CalendarLines />
      {/* 🔥 MAPPING PARFAIT: calendar2025[i].round → circuit position */}
      {calendar2025.map((race) => (
        <CircuitMarker 
          key={race.round} 
          circuit={race.circuit} 
          roundNumber={race.round} 
          onClick={() => { onCircuitSelect(race.round); setAutoRotate(false); }} 
          isSelected={selectedRound === race.round} 
        />
      ))}
      <OrbitControls ref={controlsRef} enableDamping dampingFactor={0.05} autoRotate={autoRotate} autoRotateSpeed={0.5} minDistance={3} maxDistance={15} enablePan={false} />
    </>
  );
}

// 🔥 CIRCUIT 3D - h-72 (288px) optimal
function Circuit3D({ gpsData, round }: { gpsData: { x: number; y: number }[]; round: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
  });

  if (gpsData.length === 0) return null;

  const xCoords = gpsData.map(p => p.x);
  const yCoords = gpsData.map(p => p.y);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  const rangeX = maxX - minX;
  const rangeY = maxY - minY;
  const scale = 2 / Math.max(rangeX, rangeY);

  const points = gpsData
    .filter((_, i) => i % 3 === 0)
    .map(p => 
      new THREE.Vector3(
        (p.x - minX - rangeX / 2) * scale,
        0,
        (p.y - minY - rangeY / 2) * scale
      )
    );

  const curve = new THREE.CatmullRomCurve3(points, true);
  const tubeGeometry = new THREE.TubeGeometry(curve, 200, 0.015, 8, true);
  const cornerData = circuitsData['2024'][round.toString()]?.corners;

  return (
    <group ref={meshRef}>
      <mesh geometry={tubeGeometry}>
        <meshStandardMaterial
          color="#00D2BE"
          emissive="#00D2BE"
          emissiveIntensity={0.6}
          transparent
          opacity={0.95}
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh position={points[0]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial
          color="#FFFFFF"
          emissive="#00D2BE"
          emissiveIntensity={1}
        />
      </mesh>
      {/* Corner markers */}
      {cornerData && (
        <CornerMarkers 
          gpsData={gpsData} 
          corners={cornerData} 
        />
      )}
    </group>
  );
}

// 🔥 CIRCUIT DETAILS COMPACT (pour accordion)
function CircuitDetailsCompact({ round }: { round: number }) {
  const race = calendar2025.find(r => r.round === round);
  const [gpsData, setGpsData] = useState<{ x: number; y: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchCircuitGPS = async () => {
      try {
        setLoading(true);
        setError('');
        const url = `https://metrikdelta-backend-eu-production.up.railway.app/api/racing-line/2024/${round}/Q/VER`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (data.gps_data && data.gps_data.length > 0) {
          setGpsData(data.gps_data);
        } else {
          setError('No GPS data available');
        }
      } catch (err) {
        console.error('Error fetching circuit GPS:', err);
        setError('Circuit layout unavailable');
      } finally {
        setLoading(false);
      }
    };
    fetchCircuitGPS();
  }, [round]);

  if (!race) return null;

  return (
    <div className="px-4 py-3 bg-metrik-black/30 backdrop-blur-sm">
      {/* Circuit 3D - h-72 optimal (288px) */}
      <div className="h-72 bg-metrik-black/50 rounded-lg border border-metrik-turquoise/20 overflow-hidden mb-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-metrik-turquoise border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <div className="text-metrik-turquoise text-xs font-semibold">Loading circuit...</div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500 text-xs">
              <div className="text-base mb-1">⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        ) : (
          <Canvas camera={{ position: [0, 2, 2], fov: 50 }}>
            <ambientLight intensity={0.3} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <Circuit3D gpsData={gpsData} round={round} />
            <OrbitControls enableDamping dampingFactor={0.05} enableZoom={true} enablePan={false} />
          </Canvas>
        )}
      </div>

      {/* Stats Inline Ultra Compact */}
      <div className="flex items-center justify-between gap-2 text-[10px] mb-2">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">LENGTH:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">LAPS:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.laps}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">CORNERS:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.corners}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">DRS:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.drsZones}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">SPEED:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.topSpeed}</span>
        </div>
      </div>

      {/* Type & Direction & Record Inline */}
      <div className="flex items-center justify-between text-[10px] pb-2 border-b border-metrik-turquoise/10">
        <div className="flex items-center gap-1">
          <span className="text-gray-500">TYPE:</span>
          <span className="text-white font-semibold">{race.circuit.circuitType}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">DIR:</span>
          <span className="text-white font-semibold">{race.circuit.direction}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-500">RECORD:</span>
          <span className="text-metrik-turquoise font-bold">{race.circuit.lapRecord}</span>
        </div>
      </div>

      {/* Characteristics Pills Ultra Compact */}
      <div className="pt-2">
        <div className="flex flex-wrap gap-1">
          {race.circuit.characteristics.map((char, idx) => (
            <span 
              key={idx} 
              className="px-1.5 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded text-[9px] text-metrik-turquoise font-semibold"
            >
              {char}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// 🔥 MOBILE DRAWER
function MobileDrawer({ round, onClose }: { round: number; onClose: () => void }) {
  const race = calendar2025.find(r => r.round === round);
  if (!race) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 lg:hidden">
      <div className="absolute inset-x-0 bottom-0 bg-metrik-card/95 backdrop-blur-xl border-t border-metrik-turquoise/30 rounded-t-2xl max-h-[85vh] overflow-y-auto custom-scrollbar animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-metrik-card/95 backdrop-blur-xl px-4 py-3 border-b border-metrik-turquoise/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{race.flag}</span>
            <h3 className="text-sm font-bold text-white">{race.circuit.name}</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-metrik-turquoise/20 rounded-full transition-colors">
            <X className="w-5 h-5 text-metrik-turquoise" />
          </button>
        </div>

        {/* Content */}
        <CircuitDetailsCompact round={round} />
      </div>
    </div>
  );
}

function CalendarTable({ selectedRound, onRaceSelect }: { selectedRound: number | null; onRaceSelect: (round: number) => void }) {
  const tableRef = useRef<HTMLDivElement>(null);

  // 🔥 AUTO-SCROLL au round sélectionné
  useEffect(() => {
    if (selectedRound && tableRef.current) {
      const row = tableRef.current.querySelector(`[data-round="${selectedRound}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedRound]);

  return (
    <div ref={tableRef} className="overflow-auto h-full custom-scrollbar">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-metrik-black/95 backdrop-blur-sm z-10">
          <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-metrik-turquoise/20">
            <th className="px-3 py-2 w-12">Rnd</th>
            <th className="px-3 py-2">Location</th>
            <th className="px-3 py-2 w-28">When</th>
            <th className="px-3 py-2 w-14 text-center">Laps</th>
            <th className="px-3 py-2 w-24 text-right hidden md:table-cell">Dist</th>
          </tr>
        </thead>
        <tbody>
          {calendar2025.map((race) => (
            <Fragment key={race.round}>
              {/* Regular Row */}
              <tr
                data-round={race.round}
                onClick={() => onRaceSelect(race.round)}
                className={`
                  cursor-pointer transition-all duration-300 border-b border-metrik-turquoise/5
                  ${selectedRound === race.round 
                    ? 'bg-metrik-turquoise/20 border-l-4 border-l-metrik-turquoise' 
                    : 'hover:bg-metrik-turquoise/10 hover:border-l-4 hover:border-l-metrik-turquoise/50'
                  }
                `}
              >
                <td className="px-3 py-2 font-bold text-base text-metrik-turquoise">
                  {String(race.round).padStart(2, '0')}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{race.flag}</span>
                    <span className={`font-semibold text-sm uppercase ${selectedRound === race.round ? 'text-white' : 'text-gray-300'}`}>
                      {race.country}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 font-medium text-xs text-gray-400">{race.date}</td>
                <td className="px-3 py-2 text-center font-semibold text-white">{race.laps}</td>
                <td className="px-3 py-2 text-right font-medium text-xs text-gray-400 hidden md:table-cell">{race.distance}</td>
              </tr>

              {/* 🔥 ACCORDION ROW - Desktop Only */}
              {selectedRound === race.round && (
                <tr className="hidden lg:table-row">
                  <td colSpan={5} className="p-0 border-b border-metrik-turquoise/20">
                    <div className="animate-expand overflow-hidden">
                      <CircuitDetailsCompact round={race.round} />
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function TrackDatabasePage() {
  const [selectedRound, setSelectedRound] = useState<number | null>(null);

  const handleRaceSelect = (round: number) => {
    setSelectedRound(round);
  };

  return (
    <div className="min-h-screen bg-metrik-black text-white pb-12">
      <div className="container mx-auto px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <GlobeIcon className="w-8 h-8 text-metrik-turquoise" />
            <h1 className="text-4xl font-bold">
              <span className="bg-gradient-to-r from-white via-metrik-turquoise to-white bg-clip-text text-transparent">BASE CIRCUITS</span>
            </h1>
          </div>
          <p className="text-gray-400 text-sm ml-11">Explore the 24 circuits of the 2025 Formula 1 World Championship</p>
        </div>

        {/* Globe + Calendar Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Globe 1/3 */}
          <div className="lg:col-span-1">
            <div className="sticky top-6">
              <div className="bg-metrik-card/50 backdrop-blur-sm rounded-xl border border-metrik-turquoise/30 overflow-hidden" style={{ height: '600px' }}>
                <div className="flex items-center gap-2 px-4 py-2 border-b border-metrik-turquoise/20">
                  <div className="w-1 h-6 bg-metrik-turquoise rounded-full"></div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wide">Globe View</h2>
                </div>
                <div style={{ height: 'calc(100% - 48px)' }}>
                  <Canvas camera={{ position: [0, 0, 10], fov: 50 }} style={{ background: '#0A0A0A' }}>
                    <Globe selectedRound={selectedRound} onCircuitSelect={setSelectedRound} />
                  </Canvas>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-metrik-card/80 backdrop-blur-xl border border-metrik-turquoise/30 rounded-full px-3 py-1.5">
                    <div className="text-gray-300 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-metrik-turquoise animate-pulse"></span>
                      Synced with calendar
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Calendar 2/3 */}
          <div className="lg:col-span-2">
            <div className="bg-metrik-card/50 backdrop-blur-sm rounded-xl border border-metrik-turquoise/30 flex flex-col" style={{ height: '600px' }}>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-metrik-turquoise/20 flex-shrink-0">
                <div className="w-1 h-6 bg-metrik-turquoise rounded-full"></div>
                <h2 className="text-sm font-bold text-white uppercase tracking-wide">2025 F1 Calendar</h2>
              </div>
              <div className="flex-1 overflow-hidden px-2">
                <CalendarTable selectedRound={selectedRound} onRaceSelect={handleRaceSelect} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 MOBILE DRAWER */}
      {selectedRound && <MobileDrawer round={selectedRound} onClose={() => setSelectedRound(null)} />}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 210, 190, 0.05); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 210, 190, 0.3); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 210, 190, 0.5); }
        
        @keyframes expand {
          from { 
            max-height: 0; 
            opacity: 0; 
          }
          to { 
            max-height: 500px; 
            opacity: 1; 
          }
        }
        
        .animate-expand {
          animation: expand 0.4s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
        
        @keyframes slide-up {
          from { 
            transform: translateY(100%); 
            opacity: 0; 
          }
          to { 
            transform: translateY(0); 
            opacity: 1; 
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
        }
      `}</style>
    </div>
  );
}