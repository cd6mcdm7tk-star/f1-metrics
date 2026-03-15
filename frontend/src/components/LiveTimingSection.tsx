import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { Radio, ArrowRight, Zap, Map, Mic } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

function SpaceParticles() {
  const ref = useRef<THREE.Points>(null);
  const particleCount = 1500;
  const positions = useRef(new Float32Array(particleCount * 3));
  const velocities = useRef(new Float32Array(particleCount));

  useMemo(() => {
    for (let i = 0; i < particleCount; i++) {
      positions.current[i * 3]     = (Math.random() - 0.5) * 50;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
      velocities.current[i]        = Math.random() * 0.5 + 0.1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    if (!ref.current) return;
    const pos  = ref.current.geometry.attributes.position.array as Float32Array;
    const vel  = velocities.current;
    const time = state.clock.getElapsedTime();
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3 + 2] += vel[i] * 0.3;
      pos[i3]     += Math.sin(time * 0.1 + i) * 0.01;
      pos[i3 + 1] += Math.cos(time * 0.1 + i) * 0.01;
      if (pos[i3 + 2] > 10) {
        pos[i3 + 2] = -100;
        pos[i3]     = (Math.random() - 0.5) * 50;
        pos[i3 + 1] = (Math.random() - 0.5) * 50;
      }
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.z = Math.sin(time * 0.1) * 0.02;
  });

  return (
    <Points ref={ref} positions={positions.current} stride={3} frustumCulled={false}>
      <PointMaterial transparent color="#00D2BE" size={0.05} sizeAttenuation depthWrite={false} opacity={0.8} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

const NEBULA_CONFIGS = Array.from({ length: 5 }, () => ({
  x: (Math.random() - 0.5) * 40,
  y: (Math.random() - 0.5) * 40,
  z: -20 - Math.random() * 30,
  scale: 5 + Math.random() * 10,
}));

function SpaceNebula() {
  return (
    <>
      {NEBULA_CONFIGS.map((cfg, i) => (
        <mesh key={i} position={[cfg.x, cfg.y, cfg.z]}>
          <sphereGeometry args={[cfg.scale, 32, 32]} />
          <meshBasicMaterial color="#00D2BE" transparent opacity={0.05} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}

function BrightStars() {
  const ref = useRef<THREE.Points>(null);
  const starCount = 100;
  const positions = useRef(new Float32Array(starCount * 3));
  useMemo(() => {
    for (let i = 0; i < starCount; i++) {
      positions.current[i * 3]     = (Math.random() - 0.5) * 60;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions.current[i * 3 + 2] = -10 - Math.random() * 80;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useFrame((state) => {
    if (!ref.current) return;
    const mat = ref.current.material as THREE.PointsMaterial;
    if (mat) mat.opacity = 0.7 + Math.sin(state.clock.getElapsedTime() * 2) * 0.3;
  });
  return (
    <Points ref={ref} positions={positions.current} stride={3}>
      <PointMaterial transparent color="#FFFFFF" size={0.15} sizeAttenuation depthWrite={false} opacity={0.9} blending={THREE.AdditiveBlending} />
    </Points>
  );
}

// ── Driver data ──────────────────────────────────────────────────────────────
const DRIVERS = [
  { code: 'ANT', name: 'Antonelli', team: 'Mercedes', color: '#27F4D2', s1: '28.4', s2: '31.2', s3: '57.8', compound: 'M' },
  { code: 'HAM', name: 'Hamilton',  team: 'Ferrari',  color: '#E8002D', s1: '28.6', s2: '31.4', s3: '58.1', compound: 'M' },
  { code: 'NOR', name: 'Norris',    team: 'McLaren',  color: '#FF8700', s1: '28.9', s2: '31.7', s3: '58.5', compound: 'S' },
  { code: 'LEC', name: 'Leclerc',   team: 'Ferrari',  color: '#E8002D', s1: '29.1', s2: '31.9', s3: '58.9', compound: 'M' },
  { code: 'VER', name: 'Verstappen',team: 'Red Bull', color: '#3671C6', s1: '29.3', s2: '32.1', s3: '59.2', compound: 'H' },
];

const COMPOUND_COLORS: Record<string, string> = {
  S: 'bg-red-500',
  M: 'bg-yellow-400',
  H: 'bg-white',
};

interface LiveTimingSectionProps {
  navigate: (path: string) => void;
}

export default function LiveTimingSection({ navigate }: LiveTimingSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView   = useInView(sectionRef, { amount: 0.3 });

  // Animated lap times
  const [lapTimes, setLapTimes] = useState(['1:32.064', '1:32.286', '1:32.415', '1:32.428', '1:33.002']);
  const [gaps,     setGaps]     = useState(['+0.000', '+0.222', '+0.351', '+0.364', '+0.938']);
  const [tick,     setTick]     = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
      // Randomly update one driver's lap time slightly
      setLapTimes(prev => {
        const next = [...prev];
        const idx  = Math.floor(Math.random() * next.length);
        const base = [64, 286, 415, 428, 938][idx];
        const delta = Math.floor(Math.random() * 40) - 20;
        const ms  = Math.max(0, base + delta);
        const sec = 32 + Math.floor(ms / 1000);
        next[idx] = `1:${sec}.${String(ms % 1000).padStart(3, '0')}`;
        return next;
      });
      setGaps(prev => {
        const next = [...prev];
        for (let i = 1; i < next.length; i++) {
          const base  = parseFloat(next[i].replace('+', ''));
          const delta = (Math.random() - 0.5) * 0.05;
          next[i]     = '+' + Math.max(0.001, base + delta).toFixed(3);
        }
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, [isInView]);

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

      {/* Content */}
      <div className="relative z-20 container mx-auto px-4 sm:px-6 py-8 sm:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">

          {/* Left: Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
          >
            {/* Icon */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              viewport={{ once: false }}
              className="inline-flex p-3 sm:p-4 bg-metrik-turquoise/20 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-2xl shadow-metrik-turquoise/30"
            >
              <Radio className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-3 sm:mb-4 leading-tight">
              F1 Live
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Timing
              </span>
            </h2>

            {/* Description */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-6 font-inter leading-relaxed">
              Follow every session in real-time. Live standings, sector times, tyre strategies, team radio and GPS tracking — directly from the F1 data feed.
            </p>

            {/* Features */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {[
                { icon: Zap,  text: 'Real-time standings & sector times', color: 'text-metrik-turquoise' },
                { icon: Map,  text: 'GPS track map with live positions',   color: 'text-cyan-400'         },
                { icon: Mic,  text: 'Team radio & race control alerts',    color: 'text-metrik-turquoise' },
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

            {/* Stats + CTA */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-xl sm:text-2xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">20</div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">Drivers</div>
              </div>
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-xl sm:text-2xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">LIVE</div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">Real-Time</div>
              </div>
              <motion.button
                onClick={() => navigate('/live-timing')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="col-span-2 sm:col-span-1 group flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1 p-3 sm:p-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                <span className="text-sm sm:text-xs uppercase tracking-wider">Go Live</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Animated Timing Table Preview — desktop only */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: false, amount: 0.3 }}
            className="relative z-30 hidden lg:block"
          >
            <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-2xl shadow-metrik-turquoise/20 hover:border-metrik-turquoise/50 transition-all">

              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-6 bg-metrik-turquoise rounded-full" />
                  <span className="text-sm font-rajdhani font-black text-metrik-turquoise uppercase tracking-wider">
                    Live Standings
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-rajdhani text-gray-400">LAP {32 + (tick % 24)}/56</span>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-metrik-black/80 border border-red-500/40 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
                    <span className="text-xs font-rajdhani font-bold text-red-400 uppercase">LIVE</span>
                  </div>
                </div>
              </div>

              {/* Column headers */}
              <div className="grid grid-cols-[24px_1fr_64px_56px_56px_56px_28px] gap-1 px-1 mb-2">
                {['POS', 'DRIVER', 'LAST', 'S1', 'S2', 'S3', ''].map((h, i) => (
                  <div key={i} className="text-[9px] text-gray-500 font-rajdhani font-bold uppercase tracking-wider text-center">{h}</div>
                ))}
              </div>

              {/* Driver rows */}
              <div className="space-y-1.5">
                {DRIVERS.map((driver, index) => (
                  <motion.div
                    key={driver.code}
                    layout
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="grid grid-cols-[24px_1fr_64px_56px_56px_56px_28px] gap-1 items-center p-2.5 bg-metrik-black/50 border border-metrik-turquoise/10 rounded-xl hover:border-metrik-turquoise/30 transition-all"
                  >
                    {/* Pos */}
                    <div className="text-sm font-rajdhani font-black text-white text-center">{index + 1}</div>

                    {/* Driver */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-0.5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: driver.color }} />
                      <div>
                        <div className="text-xs font-rajdhani font-black text-white">{driver.code}</div>
                        <div className="text-[9px] text-gray-500 font-inter truncate">{driver.team}</div>
                      </div>
                    </div>

                    {/* Last lap */}
                    <div className="text-center">
                      <div className="text-xs font-rajdhani font-bold text-metrik-turquoise tabular-nums">{lapTimes[index]}</div>
                      <div className="text-[9px] text-gray-600 font-inter">{index === 0 ? 'LEADER' : gaps[index]}</div>
                    </div>

                    {/* S1 */}
                    <div className={`text-[10px] font-rajdhani font-bold tabular-nums text-center ${index === 0 ? 'text-purple-400' : index === 1 ? 'text-green-400' : 'text-gray-400'}`}>
                      {driver.s1}
                    </div>

                    {/* S2 */}
                    <div className={`text-[10px] font-rajdhani font-bold tabular-nums text-center ${index === 1 ? 'text-purple-400' : index === 2 ? 'text-green-400' : 'text-gray-400'}`}>
                      {driver.s2}
                    </div>

                    {/* S3 */}
                    <div className={`text-[10px] font-rajdhani font-bold tabular-nums text-center ${index === 2 ? 'text-purple-400' : index === 0 ? 'text-green-400' : 'text-gray-400'}`}>
                      {driver.s3}
                    </div>

                    {/* Compound */}
                    <div className="flex justify-center">
                      <div className={`w-5 h-5 rounded-full ${COMPOUND_COLORS[driver.compound]} flex items-center justify-center`}>
                        <span className="text-[8px] font-rajdhani font-black text-black">{driver.compound}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Weather bar */}
              <div className="flex items-center justify-between mt-4 px-2 py-2 bg-metrik-black/40 rounded-xl border border-metrik-turquoise/10">
                <div className="flex items-center gap-4 text-[10px] font-rajdhani text-gray-400">
                  <span>🌡️ Air <span className="text-white font-bold">17.6°C</span></span>
                  <span>🏎️ Track <span className="text-white font-bold">29.5°C</span></span>
                  <span>💧 Hum <span className="text-white font-bold">34%</span></span>
                </div>
                <div className="text-[10px] font-rajdhani text-gray-500">Shanghai</div>
              </div>
            </div>

            {/* Floating glow */}
            <motion.div
              animate={{ y: [0, -20, 0], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br from-metrik-turquoise/20 to-cyan-500/20 rounded-full blur-3xl pointer-events-none"
            />
            <motion.div
              animate={{ y: [0, 20, 0], opacity: [0.2, 0.5, 0.2] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-br from-cyan-500/20 to-metrik-turquoise/20 rounded-full blur-3xl pointer-events-none"
            />
          </motion.div>

        </div>
      </div>
    </section>
  );
}
