import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Target, ArrowRight, Timer, Flag, TrendingUp } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
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

interface PitWallSectionProps {
  navigate: (path: string) => void;
}

export default function PitWallSection({ navigate }: PitWallSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 }); // 0.5 → 0.3
  const [positions, setPositions] = useState([1, 2, 3, 4, 5]);

  // Simulate position changes
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setPositions(prev => {
        const newPositions = [...prev];
        const randomIndex = Math.floor(Math.random() * (prev.length - 1));
        [newPositions[randomIndex], newPositions[randomIndex + 1]] = 
        [newPositions[randomIndex + 1], newPositions[randomIndex]];
        return newPositions;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isInView]);

  const drivers = [
    { code: 'VER', name: 'Verstappen', team: 'Red Bull', color: '#3671C6' },
    { code: 'NOR', name: 'Norris', team: 'McLaren', color: '#FF8700' },
    { code: 'LEC', name: 'Leclerc', team: 'Ferrari', color: '#E8002D' },
    { code: 'HAM', name: 'Hamilton', team: 'Mercedes', color: '#27F4D2' },
    { code: 'PIA', name: 'Piastri', team: 'McLaren', color: '#FF8700' },
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
          
          {/* Left: Content - ORDER NORMAL ON MOBILE */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
            className="lg:order-2"
          >
            {/* Icon - Responsive */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              viewport={{ once: false }}
              className="inline-flex p-3 sm:p-4 bg-metrik-turquoise/20 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-2xl shadow-metrik-turquoise/30"
            >
              <Target className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title - Responsive */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-3 sm:mb-4 leading-tight">
              Pit Wall
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Control Center
              </span>
            </h2>

            {/* Description - Responsive */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-6 font-inter leading-relaxed">
              Real-time race control center with position evolution, lap times, tire strategies, and comprehensive timing data.
            </p>

            {/* Features - Compact on mobile */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {[
                { icon: Timer, text: 'Live lap timing & sectors', color: 'text-metrik-turquoise' },
                { icon: Flag, text: 'Position evolution graph', color: 'text-cyan-400' },
                { icon: TrendingUp, text: 'Tire strategy analyzer', color: 'text-metrik-turquoise' },
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

            {/* CTA Button - Responsive */}
            <motion.button
              onClick={() => navigate('/pit-wall')}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group inline-flex items-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-base sm:text-lg text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
            >
              <span>Enter Pit Wall</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>

          {/* Right: Live Timing Tower - HIDDEN ON MOBILE, SHOWN ON DESKTOP ONLY */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
            className="hidden lg:block lg:order-1"
          >
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-2xl shadow-metrik-turquoise/20 hover:border-metrik-turquoise/50 transition-all">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-rajdhani font-black text-white">
                  Live Timing
                </h3>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-metrik-black/80 border border-metrik-turquoise/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                  <span className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">
                    LIVE
                  </span>
                </div>
              </div>

              {/* Position Evolution */}
              <div className="space-y-2">
                {positions.map((position, index) => {
                  const driver = drivers[index];
                  return (
                    <motion.div
                      key={driver.code}
                      layout
                      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                      className="flex items-center gap-3 p-3 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl hover:border-metrik-turquoise/50 transition-all"
                    >
                      {/* Position */}
                      <div className="w-8 h-8 flex items-center justify-center bg-metrik-turquoise/20 rounded-lg flex-shrink-0">
                        <span className="text-sm font-rajdhani font-black text-metrik-turquoise">
                          P{position}
                        </span>
                      </div>

                      {/* Driver color */}
                      <div
                        className="w-1 h-8 rounded-full flex-shrink-0"
                        style={{ backgroundColor: driver.color }}
                      />

                      {/* Driver info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-rajdhani font-black text-white text-sm truncate">
                          {driver.code}
                        </div>
                        <div className="text-xs text-gray-400 font-inter truncate">
                          {driver.name}
                        </div>
                      </div>

                      {/* Lap time */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-rajdhani font-bold text-metrik-turquoise tabular-nums">
                          1:{18 + index}.{200 + Math.floor(Math.random() * 800)}
                        </div>
                        <div className="text-xs text-gray-500 font-inter">Last Lap</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="text-center p-3 bg-metrik-black/50 rounded-xl border border-metrik-turquoise/20">
                  <div className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                    44
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                    Lap
                  </div>
                </div>
                <div className="text-center p-3 bg-metrik-black/50 rounded-xl border border-metrik-turquoise/20">
                  <div className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                    14
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                    Left
                  </div>
                </div>
                <div className="text-center p-3 bg-metrik-black/50 rounded-xl border border-metrik-turquoise/20">
                  <div className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                    3
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                    Pits
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}