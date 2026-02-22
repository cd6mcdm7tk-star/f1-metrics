/**
 * METRIK DELTA - Minimalist Countdown
 * Inspired by f1telemetry.com - Ultra-clean centered design
 */

import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { Radio, Gauge, Map as MapIcon, Wind } from 'lucide-react';
import { getNextSession, getTimeRemaining, type F1Race, type F1Session } from '../data/f1Calendar2026';

// ============================================
// THREE.JS COMPONENTS
// ============================================

function SpaceParticles() {
  const ref = useRef<THREE.Points>(null);
  
  // Generate positions ONCE (useMemo to avoid regeneration)
  const { positions, velocities } = React.useMemo(() => {
    const particleCount = 2000;
    const pos = new Float32Array(particleCount * 3);
    const vel = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
      vel[i] = Math.random() * 0.5 + 0.1;
    }
    
    return { positions: pos, velocities: vel };
  }, []);

  useFrame((state) => {
    if (!ref.current) return;

    const positions = ref.current.geometry.attributes.position.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < 2000; i++) {
      const i3 = i * 3;
      
      // Smooth continuous movement
      positions[i3 + 2] += velocities[i] * 0.3;
      positions[i3] += Math.sin(time * 0.1 + i) * 0.01;
      positions[i3 + 1] += Math.cos(time * 0.1 + i) * 0.01;

      // Reset smoothly when passing camera
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
  const nebulas = [
    { x: -15, y: 10, z: -40, scale: 8 },
    { x: 20, y: -8, z: -35, scale: 10 },
    { x: -10, y: -15, z: -50, scale: 12 },
    { x: 15, y: 12, z: -45, scale: 9 },
    { x: 0, y: 0, z: -60, scale: 15 },
  ];

  return (
    <>
      {nebulas.map((nebula, i) => (
        <mesh key={i} position={[nebula.x, nebula.y, nebula.z]}>
          <sphereGeometry args={[nebula.scale, 32, 32]} />
          <meshBasicMaterial
            color="#00D2BE"
            transparent
            opacity={0.05}
            depthWrite={false}
          />
        </mesh>
      ))}
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

// ============================================
// MAIN COMPONENT
// ============================================

export default function CountdownShowcase() {
  const [nextSession, setNextSession] = useState<{ race: F1Race; session: F1Session } | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });

  useEffect(() => {
    const session = getNextSession();
    setNextSession(session);

    if (!session) return;

    const interval = setInterval(() => {
      const remaining = getTimeRemaining(session.session.date);
      setCountdown(remaining);

      if (remaining.expired) {
        const newSession = getNextSession();
        setNextSession(newSession);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (!nextSession) {
    return (
      <div className="relative min-h-screen flex items-center justify-center bg-metrik-black overflow-hidden">
        <div className="absolute inset-0 z-0">
          <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
            <SpaceNebula />
            <SpaceParticles />
            <BrightStars />
          </Canvas>
        </div>
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-rajdhani font-black text-white mb-4">
            Season Finished
          </h1>
          <p className="text-metrik-silver">See you next season.</p>
        </div>
      </div>
    );
  }

  const { race, session } = nextSession;

  const features = [
    { icon: MapIcon, label: 'GPS Tracking' },
    { icon: Gauge, label: 'Telemetry' },
    { icon: Radio, label: 'Team Radio' },
    { icon: Wind, label: 'Weather' },
  ];

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-metrik-black overflow-hidden">
      
      {/* SPACE BACKGROUND */}
      <div className="absolute inset-0 z-0">
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
          <SpaceNebula />
          <SpaceParticles />
          <BrightStars />
        </Canvas>
      </div>

      {/* Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-metrik-black/60 via-metrik-black/20 to-metrik-black/80 z-10" />
      <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-10" />
      
      {/* CONTENT - Centered */}
      <div className="relative z-20 text-center px-6">
        
        {/* COUNTDOWN - Giant */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="mb-12"
        >
          <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8">
            {[
              { value: countdown.days, label: 'days' },
              { value: countdown.hours, label: 'hours' },
              { value: countdown.minutes, label: 'minutes' },
              { value: countdown.seconds, label: 'seconds' },
            ].map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
                className="flex flex-col items-center"
              >
                <div className="text-6xl md:text-7xl lg:text-8xl font-rajdhani font-bold text-white mb-2 tabular-nums">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-text-tertiary uppercase tracking-widest">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* SESSION INFO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="mb-12"
        >
          <p className="text-lg md:text-xl font-rajdhani font-bold text-metrik-turquoise mb-2">
            {session.name}
          </p>
          <p className="text-sm md:text-base font-inter text-metrik-text-secondary">
            {session.date.toLocaleString('en-US', { 
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZoneName: 'short'
            })}
          </p>
        </motion.div>

        {/* GRAND PRIX INFO */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="mb-16"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-2">
            {race.country} Grand Prix
          </h1>
          <p className="text-lg md:text-xl font-inter text-metrik-text-secondary">
            {race.city}
          </p>
        </motion.div>

        {/* FEATURES */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="flex items-center justify-center gap-6 mb-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.1 + index * 0.1 }}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-12 h-12 rounded-lg backdrop-blur-xl bg-metrik-card/20 border border-metrik-turquoise/20 flex items-center justify-center group-hover:border-metrik-turquoise/50 group-hover:bg-metrik-card/30 transition-all">
                <feature.icon className="w-5 h-5 text-metrik-turquoise group-hover:scale-110 transition-transform" />
              </div>
              <span className="text-xs font-rajdhani font-bold text-metrik-text-tertiary">
                {feature.label}
              </span>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA MESSAGE */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="text-sm font-inter text-metrik-text-secondary max-w-lg mx-auto"
        >
          Come back during the session to access live data.
        </motion.p>

      </div>
    </div>
  );
}