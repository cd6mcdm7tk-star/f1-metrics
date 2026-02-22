import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { motion } from 'framer-motion';
import { ArrowDown, Zap, Sparkles } from 'lucide-react';

function SpaceParticles() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate space particles with depth layers
  const particleCount = 2000;
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount);
  const sizes = new Float32Array(particleCount);
  
  for (let i = 0; i < particleCount; i++) {
    // Random position in 3D space
    positions[i * 3] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50; // Deep space
    
    // Different velocities for parallax effect
    velocities[i] = Math.random() * 0.5 + 0.1;
    
    // Different sizes based on depth
    sizes[i] = Math.random() * 2 + 0.5;
  }

  useFrame((state) => {
    if (!ref.current) return;

    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;

      // Move particles towards camera (Z-axis)
      positions[i3 + 2] += velocities[i] * 0.3;

      // Gentle drift sideways
      positions[i3] += Math.sin(time * 0.1 + i) * 0.01;
      positions[i3 + 1] += Math.cos(time * 0.1 + i) * 0.01;

      // Reset particle when it passes the camera
      if (positions[i3 + 2] > 10) {
        positions[i3 + 2] = -100;
        positions[i3] = (Math.random() - 0.5) * 50;
        positions[i3 + 1] = (Math.random() - 0.5) * 50;
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true;

    // Slight camera rotation for immersion
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

// Nebula effect (fog-like clouds in space)
function SpaceNebula() {
  const cloudRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!cloudRef.current) return;
    cloudRef.current.rotation.z = state.clock.getElapsedTime() * 0.02;
  });

  return (
    <>
      {/* Large nebula clouds */}
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

// Bright stars (bigger focal points)
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
    
    // Twinkling effect avec cast correct
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

interface HeroSectionProps {
  navigate: (path: string) => void;
}

export default function HeroSection({ navigate }: HeroSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <section
      ref={sectionRef}
      className="section relative h-screen w-full flex items-center justify-center overflow-hidden snap-start"
    >
      {/* Three.js Space Background */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <SpaceNebula />
          <SpaceParticles />
          <BrightStars />
        </Canvas>
      </div>

      {/* Gradient Overlays - Plus légers */}
      <div className="absolute inset-0 bg-gradient-to-b from-metrik-black/60 via-metrik-black/20 to-metrik-black/80 z-10" />
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-metrik-black/10 to-metrik-black z-10" />

      {/* Subtle vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-10" />

      {/* Content - Décalé vers le haut */}
      <div className="relative z-20 container mx-auto px-6 text-center -mt-16 md:-mt-20">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {/* Badge Premium */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 mb-8 backdrop-blur-xl bg-metrik-card/60 border border-metrik-turquoise/40 rounded-full px-6 py-2.5 shadow-glow-turquoise"
          >
            <div className="w-2 h-2 rounded-full bg-metrik-turquoise animate-pulse shadow-glow-turquoise" />
            <span className="text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wider">
              F1 Lab for Professionals
            </span>
            <Sparkles className="w-4 h-4 text-metrik-turquoise" />
          </motion.div>

          {/* Main Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-6xl md:text-7xl lg:text-8xl font-rajdhani font-black mb-6 leading-none tracking-tight"
          >
            <motion.span
              className="inline-block bg-gradient-to-r from-white via-metrik-turquoise to-cyan-400 bg-clip-text text-transparent"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 5,
                repeat: Infinity,
                ease: 'linear',
              }}
              style={{
                backgroundSize: '200% 200%',
              }}
            >
              METRIK DELTA
            </motion.span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-xl md:text-2xl text-gray-300 font-inter mb-4 max-w-3xl mx-auto font-light"
          >
            Advanced Formula 1 Telemetry & Analytics Platform
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-sm text-gray-500 font-inter mb-12 max-w-2xl mx-auto"
          >
            Deep performance analysis • Interactive 3D models • Real-time data visualization
          </motion.p>

          {/* Premium CTA Button - Un seul centré */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="flex justify-center"
          >
            <motion.button
              onClick={() => navigate('/telemetry')}
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.95 }}
              className="group relative px-12 py-5 bg-gradient-to-r from-metrik-turquoise via-cyan-400 to-metrik-turquoise rounded-xl font-rajdhani font-black text-xl text-metrik-black overflow-hidden shadow-glow-turquoise-lg transition-all duration-300"
              style={{
                backgroundSize: '200% 100%',
              }}
            >
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{
                  x: ['-100%', '100%'],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
              
              <span className="relative z-10 flex items-center gap-3">
                <Zap className="w-6 h-6" />
                Start Analyzing
              </span>

              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-metrik-turquoise to-cyan-400 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-300 -z-10" />
            </motion.button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30"
      >
        <div className="flex flex-col items-center gap-3">
          <motion.span
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-xs font-rajdhani font-bold uppercase tracking-widest text-metrik-turquoise"
          >
            Scroll to explore
          </motion.span>

          <div className="relative w-8 h-12 rounded-full border-2 border-metrik-turquoise/40 backdrop-blur-sm bg-metrik-card/20 shadow-glow-turquoise">
            <motion.div
              className="absolute top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-metrik-turquoise shadow-glow-turquoise"
              animate={{
                y: [0, 20, 0],
                opacity: [1, 0.3, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            />
          </div>

          <motion.div
            animate={{
              y: [0, 10, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <ArrowDown className="w-6 h-6 text-metrik-turquoise" strokeWidth={3} />
          </motion.div>

          <motion.div
            className="absolute bottom-0 w-20 h-20 rounded-full border-2 border-metrik-turquoise/20"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </div>
      </motion.div>
    </section>
  );
}