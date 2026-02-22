import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Cpu, ArrowRight, Layers, Box, Zap } from 'lucide-react';
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

function WireframeCar() {
  const meshRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.getElapsedTime() * 0.3) * 0.3;
      meshRef.current.position.y = Math.sin(state.clock.getElapsedTime() * 0.5) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      <mesh>
        <boxGeometry args={[4, 0.6, 1.2]} />
        <meshBasicMaterial color="#00D2BE" wireframe />
      </mesh>

      <mesh position={[-2, 0.5, 0]}>
        <boxGeometry args={[0.3, 0.8, 1.6]} />
        <meshBasicMaterial color="#22D3EE" wireframe />
      </mesh>

      <mesh position={[2.2, -0.3, 0]}>
        <boxGeometry args={[0.4, 0.1, 1.8]} />
        <meshBasicMaterial color="#00D2BE" wireframe />
      </mesh>

      <mesh position={[0.5, 0.6, 0]}>
        <torusGeometry args={[0.4, 0.08, 8, 16, Math.PI]} />
        <meshBasicMaterial color="#22D3EE" wireframe />
      </mesh>

      {[
        [1.5, -0.4, 0.7],
        [1.5, -0.4, -0.7],
        [-1.5, -0.4, 0.7],
        [-1.5, -0.4, -0.7],
      ].map((position, i) => (
        <mesh 
          key={i} 
          position={position as [number, number, number]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[0.4, 0.4, 0.3, 16]} />
          <meshBasicMaterial color="#00D2BE" wireframe />
        </mesh>
      ))}

      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={100}
            array={new Float32Array(Array.from({ length: 300 }, () => (Math.random() - 0.5) * 8))}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial size={0.05} color="#00D2BE" transparent opacity={0.6} />
      </points>
    </group>
  );
}

interface AnatomySectionProps {
  navigate: (path: string) => void;
}

export default function AnatomySection({ navigate }: AnatomySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 }); // 0.5 → 0.3

  const components = [
    { name: 'Front Wing', parts: 3, interactive: true },
    { name: 'Halo', parts: 1, interactive: true },
    { name: 'Rear Wing', parts: 2, interactive: true },
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
          
          {/* Left: 3D Car Model - HIDDEN ON MOBILE, SHOWN ON DESKTOP ONLY */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
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
                  3D Interactive Model
                </span>
              </div>

              {/* Canvas 3D - DESKTOP ONLY */}
              <div className="h-80 rounded-lg sm:rounded-xl overflow-hidden bg-metrik-black/50 relative">
                {isInView && (
                  <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} intensity={1} color="#00D2BE" />
                    <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22D3EE" />
                    <WireframeCar />
                  </Canvas>
                )}

                {/* Labels - DESKTOP ONLY */}
                {/* REAR WING */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  viewport={{ once: false }}
                  className="absolute top-12 left-8 px-2 sm:px-3 py-1 sm:py-1.5 bg-metrik-black/90 border border-cyan-400/50 rounded-lg backdrop-blur-xl"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-cyan-400">REAR WING</span>
                  </div>
                </motion.div>

                {/* HALO */}
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  viewport={{ once: false }}
                  className="absolute top-8 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-1 sm:py-1.5 bg-metrik-black/90 border border-metrik-turquoise/50 rounded-lg backdrop-blur-xl"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-metrik-turquoise animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise">HALO</span>
                  </div>
                </motion.div>

                {/* FRONT WING */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 }}
                  viewport={{ once: false }}
                  className="absolute top-1/2 right-8 px-2 sm:px-3 py-1 sm:py-1.5 bg-metrik-black/90 border border-metrik-turquoise/50 rounded-lg backdrop-blur-xl"
                >
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-metrik-turquoise animate-pulse" />
                    <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise">FRONT WING</span>
                  </div>
                </motion.div>
              </div>

              {/* Info badge */}
              <div className="mt-3 sm:mt-4 flex items-center justify-center">
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-metrik-black/60 border border-metrik-turquoise/30 rounded-full">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <motion.div
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                    >
                      <Box className="w-3 h-3 sm:w-4 sm:h-4 text-metrik-turquoise" />
                    </motion.div>
                    <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">
                      26 Components
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* CTA Button - DESKTOP ONLY */}
            <motion.button
              onClick={() => navigate('/f1-anatomy')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="group w-full flex items-center justify-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-3.5 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-sm sm:text-base text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300 mt-3"
            >
              <span>Explore 3D Model</span>
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
            </motion.button>

            {/* Floating glow */}
            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-metrik-turquoise/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none"
            />
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
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
              <Cpu className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title - Responsive */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-2 sm:mb-3 leading-tight">
              F1 Car
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Anatomy
              </span>
            </h2>

            {/* Description - Responsive */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-5 font-inter leading-relaxed">
              Explore the F1 car in 3D with 26 interactive components, detailed specifications, and CFD wind simulation.
            </p>

            {/* Features - Compact on mobile */}
            <div className="space-y-2 sm:space-y-3 mb-4 sm:mb-5">
              {[
                { icon: Layers, text: '26 clickable car components', color: 'text-metrik-turquoise' },
                { icon: Box, text: '3D interactive visualization', color: 'text-cyan-400' },
                { icon: Zap, text: 'CFD aerodynamic simulation', color: 'text-metrik-turquoise' },
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

            {/* Component list - COMPACT ON MOBILE */}
            <div className="space-y-1.5 sm:space-y-2 mb-4 lg:mb-0">
              {components.map((component, index) => (
                <motion.div
                  key={component.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1 }}
                  viewport={{ once: false }}
                  className="flex items-center justify-between p-2.5 sm:p-3 backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl hover:border-metrik-turquoise/50 transition-all group cursor-pointer"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-metrik-turquoise/10 rounded-lg group-hover:bg-metrik-turquoise/20 transition-all flex-shrink-0">
                      <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-metrik-turquoise" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-rajdhani font-black text-white text-xs sm:text-sm">
                        {component.name}
                      </div>
                      <div className="text-[10px] sm:text-xs text-gray-400">
                        {component.parts} parts
                      </div>
                    </div>
                  </div>
                  {component.interactive && (
                    <div className="px-2 py-0.5 sm:py-1 bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded-full flex-shrink-0">
                      <span className="text-[9px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">
                        Interactive
                      </span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>

            {/* CTA Button - MOBILE ONLY (to compensate for hidden 3D car) */}
            <motion.button
              onClick={() => navigate('/f1-anatomy')}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="lg:hidden group w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg font-rajdhani font-black text-sm text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
            >
              <span>Explore 3D Anatomy</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </motion.div>
        </div>
      </div>
    </section>
  );
}