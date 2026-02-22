import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Map, ArrowRight, Globe2, MapPin, Navigation } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Sphere, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// Space particles component
function SpaceParticles() {
  const ref = useRef<THREE.Points>(null);
  
  const particleCount = 1500;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
    velocities[i] = Math.random() * 0.5 + 0.1;
  }

  useFrame((state) => {
    if (!ref.current) return;

    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3 + 2] += velocities[i] * 0.3;
      positions[i3] += Math.sin(time * 0.1 + i) * 0.01;
      positions[i3 + 1] += Math.cos(time * 0.1 + i) * 0.01;

      if (positions[i3 + 2] > 10) {
        positions[i3 + 2] = -100;
        positions[i3] = (Math.random() - 0.5) * 50;
        positions[i3 + 1] = (Math.random() - 0.5) * 50;
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.z = Math.sin(time * 0.1) * 0.02;
  });

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#00D2BE"
        size={0.05}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

function SpaceNebula() {
  return (
    <>
      {[...Array(5)].map((_, i) => {
        const x = (Math.random() - 0.5) * 40;
        const y = (Math.random() - 0.5) * 40;
        const z = -20 - Math.random() * 30;
        const scale = 5 + Math.random() * 10;

        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[scale, 32, 32]} />
            <meshBasicMaterial
              color="#00D2BE"
              transparent
              opacity={0.05}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </>
  );
}

function BrightStars() {
  const starsRef = useRef<THREE.Points>(null);
  const starCount = 100;
  const positions = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = -10 - Math.random() * 80;
  }

  useFrame((state) => {
    if (!starsRef.current) return;
    const time = state.clock.getElapsedTime();
    const material = starsRef.current.material as THREE.PointsMaterial;
    if (material) {
      material.opacity = 0.7 + Math.sin(time * 2) * 0.3;
    }
  });

  return (
    <Points ref={starsRef} positions={positions} stride={3}>
      <PointMaterial
        transparent
        color="#FFFFFF"
        size={0.15}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.9}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

const circuitPositions = [
  { lat: 26.0325, lng: 50.5106 },
  { lat: 21.6319, lng: 39.1044 },
  { lat: -37.8497, lng: 144.9680 },
  { lat: 34.8431, lng: 136.5408 },
  { lat: 25.9581, lng: -80.2389 },
  { lat: 43.7347, lng: 7.4206 },
  { lat: 52.0786, lng: -1.0169 },
  { lat: 50.4372, lng: 5.9714 },
  { lat: 45.6156, lng: 9.2811 },
  { lat: 1.2914, lng: 103.8640 },
  { lat: 30.1328, lng: -97.6411 },
  { lat: 19.4042, lng: -99.0907 },
];

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

function CircuitMarker({ position }: { position: THREE.Vector3 }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 2) * 0.15);
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 3) * 0.2);
    }
  });

  return (
    <group position={position}>
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color="#00D2BE" transparent opacity={0.15} />
      </mesh>
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color="#00D2BE" toneMapped={false} />
      </mesh>
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
  for (let i = 0; i < circuitPositions.length - 1; i++) {
    const start = latLngToVector3(circuitPositions[i].lat, circuitPositions[i].lng, 2.03);
    const end = latLngToVector3(circuitPositions[i + 1].lat, circuitPositions[i + 1].lng, 2.03);
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
            color: 0x00D2BE, 
            transparent: true, 
            opacity: 0.4, 
            linewidth: 1 
          })
        )}
        ref={(ref: THREE.Line) => { if (ref) lineRefs.current[i] = ref; }}
      />
    );
  }
  
  return <>{lines}</>;
}

function Globe() {
  const globeRef = useRef<THREE.Mesh>(null);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      <Sphere ref={globeRef} args={[2, 64, 64]}>
        <meshStandardMaterial 
          color="#0A2A3A" 
          roughness={0.8} 
          metalness={0.2} 
          emissive="#001a2a" 
          emissiveIntensity={0.2} 
        />
      </Sphere>
      
      <Sphere args={[2.01, 64, 64]}>
        <meshBasicMaterial 
          color="#00D2BE" 
          transparent 
          opacity={0.05} 
          wireframe 
        />
      </Sphere>
      
      <CalendarLines />
      
      {circuitPositions.map((circuit, index) => (
        <CircuitMarker 
          key={index} 
          position={latLngToVector3(circuit.lat, circuit.lng, 2.02)} 
        />
      ))}
      
      <OrbitControls 
        enableDamping 
        dampingFactor={0.05} 
        autoRotate 
        autoRotateSpeed={0.5} 
        minDistance={3} 
        maxDistance={15} 
        enablePan={false}
        enableZoom={true}
        zoomSpeed={0.5}
      />
    </>
  );
}

interface TracksSectionProps {
  navigate: (path: string) => void;
}

export default function TracksSection({ navigate }: TracksSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 }); // 0.5 → 0.3

  const circuits = [
    { name: 'Monaco', country: 'Monaco', corners: 19, length: '3.3 km' },
    { name: 'Monza', country: 'Italy', corners: 11, length: '5.8 km' },
    { name: 'Spa', country: 'Belgium', corners: 19, length: '7.0 km' },
    { name: 'Suzuka', country: 'Japan', corners: 18, length: '5.8 km' },
  ];

  return (
    <section
      ref={sectionRef}
      className="section relative min-h-screen w-full flex items-center justify-center overflow-hidden snap-start bg-gradient-to-b from-metrik-black via-metrik-black to-metrik-black"
    >
      {/* Three.js Space Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <SpaceNebula />
          <SpaceParticles />
          <BrightStars />
        </Canvas>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-metrik-black/60 via-metrik-black/20 to-metrik-black/80 z-10" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-metrik-black/10 to-metrik-black z-10" />
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-10" />

      {/* Content - MOBILE OPTIMIZED */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 py-8 sm:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          
          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
          >
            {/* Icon - Responsive */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              viewport={{ once: false }}
              className="inline-flex p-3 sm:p-4 bg-metrik-turquoise/20 rounded-xl sm:rounded-2xl mb-3 sm:mb-4 shadow-2xl shadow-metrik-turquoise/30"
            >
              <Map className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title - Responsive */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-2 sm:mb-3 leading-tight">
              Track
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Database
              </span>
            </h2>

            {/* Description - Responsive */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-5 font-inter leading-relaxed">
              Explore the complete F1 calendar with interactive world map, detailed circuit layouts, and comprehensive track statistics.
            </p>

            {/* Features - Compact on mobile */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
              {[
                { icon: Globe2, text: 'Interactive world map', color: 'text-metrik-turquoise' },
                { icon: MapPin, text: '24 circuits with 321 corners', color: 'text-cyan-400' },
                { icon: Navigation, text: 'Turn-by-turn analysis', color: 'text-metrik-turquoise' },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.1 }}
                  viewport={{ once: false }}
                  className="flex items-center gap-2 sm:gap-3 text-gray-300"
                >
                  <div className="p-1.5 sm:p-2 bg-metrik-turquoise/10 rounded-lg flex-shrink-0">
                    <feature.icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${feature.color}`} />
                  </div>
                  <span className="font-inter text-xs sm:text-sm">{feature.text}</span>
                </motion.div>
              ))}
            </div>

            {/* Featured circuits - RESPONSIVE GRID */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-4 lg:mb-0">
              {circuits.map((circuit, index) => (
                <motion.div
                  key={circuit.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.05 }}
                  viewport={{ once: false }}
                  className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-2.5 sm:p-3 hover:border-metrik-turquoise/50 transition-all"
                >
                  <div className="text-xs sm:text-sm font-rajdhani font-black text-white mb-0.5">
                    {circuit.name}
                  </div>
                  <div className="text-[9px] sm:text-[10px] text-gray-400 mb-1.5 sm:mb-2">
                    {circuit.country}
                  </div>
                  <div className="flex items-center justify-between text-[10px] sm:text-xs">
                    <span className="font-rajdhani font-bold text-metrik-turquoise">
                      {circuit.corners} corners
                    </span>
                    <span className="text-gray-500">{circuit.length}</span>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button - MOBILE ONLY (to compensate for hidden globe) */}
            <motion.button
              onClick={() => navigate('/track-database')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="lg:hidden group w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg font-rajdhani font-black text-sm text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
            >
              <span>Explore All 24 Circuits</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Right: Globe - HIDDEN ON MOBILE, SHOWN ON DESKTOP ONLY */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
            className="relative z-30 hidden lg:block"
          >
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-2xl shadow-metrik-turquoise/20 hover:border-metrik-turquoise/50 transition-all overflow-hidden">
              
              {/* Header */}
              <div className="flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4">
                <div className="w-0.5 sm:w-1 h-5 sm:h-6 bg-metrik-turquoise rounded-full" />
                <span className="text-xs sm:text-sm font-rajdhani font-black text-white uppercase tracking-wider">
                  2025 F1 Calendar
                </span>
              </div>

              {/* Globe Canvas - DESKTOP ONLY */}
              <div className="h-80 rounded-lg sm:rounded-xl overflow-hidden bg-metrik-black/50">
                {isInView && (
                  <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
                    <Globe />
                  </Canvas>
                )}
              </div>

              {/* Info badge */}
              <div className="mt-3 sm:mt-4 flex items-center justify-center">
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-metrik-black/60 border border-metrik-turquoise/30 rounded-full">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-metrik-turquoise animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">
                      24 Circuits
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button - DESKTOP ONLY */}
            <motion.button
              onClick={() => navigate('/track-database')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group w-full flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-sm sm:text-base text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300 mt-3"
            >
              <span>Explore Circuits</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Floating glow */}
            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-metrik-turquoise/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}