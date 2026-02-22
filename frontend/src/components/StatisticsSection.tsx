import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { TrendingUp, ArrowRight, Users, Target, Zap } from 'lucide-react';
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

interface StatisticsSectionProps {
  navigate: (path: string) => void;
}

export default function StatisticsSection({ navigate }: StatisticsSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 }); // 0.5 → 0.3

  const VER_COLOR = '#3671C6';
  const NOR_COLOR = '#FF8700';

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
              <TrendingUp className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title - Responsive */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-2 sm:mb-3 leading-tight">
              Driver
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Statistics
              </span>
            </h2>

            {/* Description - Responsive */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-5 font-inter leading-relaxed">
              Deep performance analysis with head-to-head comparisons, seasonal evolution, and comprehensive driver metrics.
            </p>

            {/* Features - Compact on mobile */}
            <div className="space-y-2 sm:space-y-3 mb-5 sm:mb-6">
              {[
                { icon: Users, text: 'Head-to-head comparison', color: 'text-metrik-turquoise' },
                { icon: Target, text: 'Multi-parameter analysis', color: 'text-cyan-400' },
                { icon: Zap, text: 'Season-long evolution', color: 'text-metrik-turquoise' },
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

            {/* Stats + CTA - MOBILE: 2 cols stats + full width CTA */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* Card: Years */}
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-lg sm:text-2xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">
                  2003-2026
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                  Years Covered
                </div>
              </div>

              {/* Card: Drivers */}
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-2xl sm:text-3xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">
                  500+
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                  Drivers
                </div>
              </div>

              {/* CTA Button - Full width on mobile */}
              <motion.button
                onClick={() => navigate('/statistics')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="col-span-2 sm:col-span-1 group flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1 p-3 sm:p-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                <span className="text-sm sm:text-xs uppercase tracking-wider">Compare</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Right: H2H Widget - HIDDEN ON MOBILE, SHOWN ON DESKTOP ONLY */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
            className="relative z-30 hidden lg:block"
          >
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-2xl p-5 shadow-2xl shadow-metrik-turquoise/20 hover:border-metrik-turquoise/50 transition-all">
              
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-metrik-turquoise rounded-full" />
                  <span className="text-sm font-rajdhani font-black text-metrik-turquoise uppercase tracking-wider">
                    Head to Head
                  </span>
                </div>
                <span className="text-xs font-rajdhani font-bold text-metrik-silver uppercase">
                  2025 Season
                </span>
              </div>

              {/* Driver Cards */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* VER Card */}
                <div
                  className="backdrop-blur-xl bg-gradient-to-br from-black/40 to-metrik-card/95 rounded-lg p-3 border-2"
                  style={{ borderColor: `${VER_COLOR}80` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-rajdhani font-black" style={{ color: VER_COLOR }}>
                        VER
                      </h3>
                      <p className="text-[9px] text-metrik-silver">Red Bull</p>
                    </div>
                    <div className="text-2xl font-rajdhani font-black" style={{ color: VER_COLOR }}>
                      389
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-metrik-black/40 rounded p-2 border border-white/10">
                      <div className="text-sm font-rajdhani font-bold" style={{ color: VER_COLOR }}>8</div>
                      <div className="text-[8px] text-metrik-silver uppercase">Wins</div>
                    </div>
                    <div className="bg-metrik-black/40 rounded p-2 border border-white/10">
                      <div className="text-sm font-rajdhani font-bold" style={{ color: VER_COLOR }}>8</div>
                      <div className="text-[8px] text-metrik-silver uppercase">Poles</div>
                    </div>
                  </div>
                </div>

                {/* NOR Card */}
                <div
                  className="backdrop-blur-xl bg-gradient-to-br from-black/40 to-metrik-card/95 rounded-lg p-3 border-2"
                  style={{ borderColor: `${NOR_COLOR}80` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-xl font-rajdhani font-black" style={{ color: NOR_COLOR }}>
                        NOR
                      </h3>
                      <p className="text-[9px] text-metrik-silver">McLaren</p>
                    </div>
                    <div className="text-2xl font-rajdhani font-black" style={{ color: NOR_COLOR }}>
                      394
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-metrik-black/40 rounded p-2 border border-white/10">
                      <div className="text-sm font-rajdhani font-bold" style={{ color: NOR_COLOR }}>7</div>
                      <div className="text-[8px] text-metrik-silver uppercase">Wins</div>
                    </div>
                    <div className="bg-metrik-black/40 rounded p-2 border border-white/10">
                      <div className="text-sm font-rajdhani font-bold" style={{ color: NOR_COLOR }}>7</div>
                      <div className="text-[8px] text-metrik-silver uppercase">Poles</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* H2H Bars */}
              <div className="space-y-3">
                {/* Qualifying H2H */}
                <div className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Target className="text-metrik-turquoise" size={12} />
                    <h4 className="text-xs font-rajdhani font-black text-metrik-turquoise uppercase">
                      Qualifying H2H
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-rajdhani font-black" style={{ color: VER_COLOR }}>11</span>
                    <span className="text-2xl font-rajdhani font-black" style={{ color: NOR_COLOR }}>13</span>
                  </div>

                  <div className="h-5 bg-metrik-black/50 rounded-full overflow-hidden border border-metrik-turquoise/30 flex">
                    <div
                      className="flex items-center justify-center transition-all duration-500"
                      style={{ width: '46%', backgroundColor: VER_COLOR }}
                    >
                      <span className="text-[10px] font-rajdhani font-bold text-white">46%</span>
                    </div>
                    <div
                      className="flex items-center justify-center transition-all duration-500"
                      style={{ width: '54%', backgroundColor: NOR_COLOR }}
                    >
                      <span className="text-[10px] font-rajdhani font-bold text-white">54%</span>
                    </div>
                  </div>
                </div>

                {/* Race H2H */}
                <div className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl p-3">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="text-metrik-turquoise" size={12} />
                    <h4 className="text-xs font-rajdhani font-black text-metrik-turquoise uppercase">
                      Race H2H
                    </h4>
                  </div>

                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-rajdhani font-black" style={{ color: VER_COLOR }}>13</span>
                    <span className="text-2xl font-rajdhani font-black" style={{ color: NOR_COLOR }}>11</span>
                  </div>

                  <div className="h-5 bg-metrik-black/50 rounded-full overflow-hidden border border-metrik-turquoise/30 flex">
                    <div
                      className="flex items-center justify-center transition-all duration-500"
                      style={{ width: '54%', backgroundColor: VER_COLOR }}
                    >
                      <span className="text-[10px] font-rajdhani font-bold text-white">54%</span>
                    </div>
                    <div
                      className="flex items-center justify-center transition-all duration-500"
                      style={{ width: '46%', backgroundColor: NOR_COLOR }}
                    >
                      <span className="text-[10px] font-rajdhani font-bold text-white">46%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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