import { useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, ArrowRight, Zap } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Space particles component (from HeroSection)
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

interface TelemetrySectionProps {
  navigate: (path: string) => void;
}

export default function TelemetrySection({ navigate }: TelemetrySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 }); // 0.5 → 0.3 pour mobile

  // Animated professional telemetry chart (smooth and clean)
  useEffect(() => {
    if (!isInView || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas sizing
    const updateCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.scale(dpr, dpr);
    };

    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    let frame = 0;

    // Generate REALISTIC F1 circuit speed profile with SMOOTH curves
    const generateSpeedData = (driver: 'NOR' | 'VER') => {
      const points = 800;
      const data = [];
      
      const isNOR = driver === 'NOR';
      
      for (let i = 0; i < points; i++) {
        const progress = i / points;
        let speed;
        
        if (progress < 0.15) {
          const t = progress / 0.15;
          speed = isNOR 
            ? 285 + Math.pow(t, 0.75) * 35
            : 275 + Math.pow(t, 0.85) * 40;
          
        } else if (progress < 0.19) {
          const t = (progress - 0.15) / 0.04;
          speed = isNOR
            ? 320 - Math.pow(t, 1.4) * 230
            : 315 - Math.pow(t, 1.6) * 235;
          
        } else if (progress < 0.28) {
          const t = (progress - 0.19) / 0.09;
          speed = isNOR
            ? 90 + Math.pow(t, 0.65) * 135
            : 80 + Math.pow(t, 0.75) * 135;
          
        } else if (progress < 0.38) {
          const t = (progress - 0.28) / 0.1;
          speed = isNOR
            ? 225 + Math.pow(t, 0.8) * 80
            : 215 + Math.pow(t, 0.9) * 75;
          
        } else if (progress < 0.42) {
          const t = (progress - 0.38) / 0.04;
          speed = isNOR
            ? 305 - Math.abs(Math.sin(t * Math.PI * 2.2)) * 75
            : 290 - Math.abs(Math.sin(t * Math.PI * 1.8)) * 65;
          
        } else if (progress < 0.54) {
          const t = (progress - 0.42) / 0.12;
          speed = isNOR
            ? 230 + Math.sin(t * Math.PI * 2.3) * 38
            : 225 + Math.sin(t * Math.PI * 2.7 + 0.3) * 42;
          
        } else if (progress < 0.68) {
          const t = (progress - 0.54) / 0.14;
          speed = isNOR
            ? 245 + Math.pow(t, 0.7) * 75
            : 240 + Math.pow(t, 0.75) * 72;
          
        } else if (progress < 0.72) {
          const t = (progress - 0.68) / 0.04;
          speed = isNOR
            ? 320 - Math.pow(t, 1.3) * 215
            : 312 - Math.pow(t, 1.4) * 217;
          
        } else if (progress < 0.82) {
          const t = (progress - 0.72) / 0.1;
          speed = isNOR
            ? 105 + Math.pow(t, 0.85) * 150
            : 95 + Math.pow(t, 0.95) * 150;
          
        } else if (progress < 0.88) {
          const t = (progress - 0.82) / 0.06;
          speed = isNOR
            ? 255 - Math.abs(Math.cos(t * Math.PI * 2.4)) * 48
            : 245 - Math.abs(Math.cos(t * Math.PI * 2.6 + 0.4)) * 52;
          
        } else {
          const t = (progress - 0.88) / 0.12;
          speed = isNOR
            ? 207 + Math.pow(t, 0.75) * 78
            : 193 + Math.pow(t, 0.85) * 82;
        }
        
        data.push(Math.max(80, Math.min(320, speed)));
      }
      
      return data;
    };

    const speedData1 = generateSpeedData('NOR');
    const speedData2 = generateSpeedData('VER');

    const animate = () => {
      if (!ctx || !canvas) return;

      const width = canvas.offsetWidth;
      const height = canvas.offsetHeight;

      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, width, height);

      // Responsive font sizes
      const isMobile = width < 640;
      const labelFontSize = isMobile ? 7 : 9;
      const speedFontSize = isMobile ? 10 : 14;

      // Grid lines
      ctx.strokeStyle = 'rgba(0, 210, 190, 0.03)';
      ctx.lineWidth = 1;
      
      const speedMarkers = [100, 150, 200, 250, 300];
      speedMarkers.forEach(speed => {
        const y = height - ((speed - 80) / 240) * (height - 40) - 20;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        if (!isMobile) {
          ctx.fillStyle = 'rgba(0, 210, 190, 0.3)';
          ctx.font = `${labelFontSize}px Rajdhani`;
          ctx.textAlign = 'right';
          ctx.fillText(speed + '', width - 5, y - 3);
        }
      });

      // Sector dividers
      ctx.strokeStyle = 'rgba(0, 210, 190, 0.08)';
      ctx.setLineDash([4, 4]);
      [width * 0.33, width * 0.66].forEach(x => {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // Sector labels
      ctx.fillStyle = 'rgba(0, 210, 190, 0.4)';
      ctx.font = `bold ${labelFontSize + 1}px Rajdhani`;
      ctx.textAlign = 'center';
      ctx.fillText('S1', width * 0.165, 15);
      ctx.fillText('S2', width * 0.5, 15);
      ctx.fillText('S3', width * 0.83, 15);

      const scrollSpeed = 0.5;
      const dataProgress = ((frame * scrollSpeed) % speedData1.length) / speedData1.length;
      const startIndex = Math.floor(dataProgress * speedData1.length);
      const visiblePoints = 450;

      let speed1Display = 280;
      let speed2Display = 275;

      // Draw NOR Orange
      ctx.save();
      ctx.strokeStyle = '#FF8700';
      ctx.lineWidth = isMobile ? 1.5 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < visiblePoints; i++) {
        const dataIndex = (startIndex + i) % speedData1.length;
        const x = (i / visiblePoints) * width;
        const speed = speedData1[dataIndex];
        const y = height - ((speed - 80) / 240) * (height - 40) - 20;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        if (i === Math.floor(visiblePoints * 0.5)) {
          speed1Display = Math.round(speed);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Draw VER Blue
      ctx.save();
      ctx.strokeStyle = '#3671C6';
      ctx.lineWidth = isMobile ? 1.5 : 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      for (let i = 0; i < visiblePoints; i++) {
        const dataIndex = (startIndex + i) % speedData2.length;
        const x = (i / visiblePoints) * width;
        const speed = speedData2[dataIndex];
        const y = height - ((speed - 80) / 240) * (height - 40) - 20;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        
        if (i === Math.floor(visiblePoints * 0.5)) {
          speed2Display = Math.round(speed);
        }
      }
      ctx.stroke();
      ctx.restore();

      // Labels
      ctx.fillStyle = 'rgba(0, 210, 190, 0.5)';
      ctx.font = `bold ${labelFontSize + 2}px Rajdhani`;
      ctx.textAlign = 'left';
      ctx.fillText('SPEED', 10, 20);

      ctx.fillStyle = 'rgba(0, 210, 190, 0.4)';
      ctx.font = `${labelFontSize}px Rajdhani`;
      ctx.fillText('km/h', 10, height - 10);

      // Legend (top right)
      const legendX = width - 10;
      const legendY = isMobile ? 20 : 25;
      const lineHeight = isMobile ? 15 : 18;

      ctx.textAlign = 'right';
      ctx.fillStyle = '#FF8700';
      ctx.font = `bold ${labelFontSize + 1}px Rajdhani`;
      ctx.fillText('NOR', legendX, legendY);
      
      ctx.fillStyle = 'rgba(255, 135, 0, 0.8)';
      ctx.font = `bold ${speedFontSize}px Rajdhani`;
      ctx.fillText(speed1Display + ' km/h', legendX, legendY + 12);

      ctx.fillStyle = '#3671C6';
      ctx.font = `bold ${labelFontSize + 1}px Rajdhani`;
      ctx.fillText('VER', legendX, legendY + lineHeight + 20);
      
      ctx.fillStyle = 'rgba(54, 113, 198, 0.8)';
      ctx.font = `bold ${speedFontSize}px Rajdhani`;
      ctx.fillText(speed2Display + ' km/h', legendX, legendY + lineHeight + 32);

      frame += 1;

      if (isInView) {
        requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      frame = 0;
      window.removeEventListener('resize', updateCanvasSize);
    };
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
              className="inline-flex p-3 sm:p-4 bg-metrik-turquoise/20 rounded-xl sm:rounded-2xl mb-4 sm:mb-6 shadow-2xl shadow-metrik-turquoise/30"
            >
              <Activity className="w-8 h-8 sm:w-12 sm:h-12 text-metrik-turquoise" />
            </motion.div>

            {/* Title - Responsive sizes */}
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-rajdhani font-black text-white mb-3 sm:mb-4 leading-tight">
              Telemetry
              <br />
              <span className="bg-gradient-to-r from-metrik-turquoise to-cyan-400 bg-clip-text text-transparent">
                Analysis
              </span>
            </h2>

            {/* Description - Responsive text */}
            <p className="text-base sm:text-lg text-gray-300 mb-4 sm:mb-6 font-inter leading-relaxed">
              Compare drivers lap-by-lap with synchronized telemetry data. Analyze speed, throttle, brake, gear, and more with professional F1-grade visualizations.
            </p>

            {/* Features list - Compact on mobile */}
            <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8">
              {[
                { icon: Zap, text: 'Real-time data synchronization', color: 'text-metrik-turquoise' },
                { icon: Activity, text: 'Multi-parameter comparison', color: 'text-cyan-400' },
                { icon: Activity, text: 'Interactive sector analysis', color: 'text-metrik-turquoise' },
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

            {/* Stats cards + CTA - MOBILE: 2 cols stats + full width CTA */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {/* Stats - 2 cards */}
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-xl sm:text-2xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">
                  2018-2026
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                  Years Covered
                </div>
              </div>
              
              <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:border-metrik-turquoise/60 transition-all">
                <div className="text-2xl sm:text-3xl font-rajdhani font-black text-metrik-turquoise mb-0.5 sm:mb-1">
                  1000+
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-400 uppercase font-rajdhani font-bold tracking-wider">
                  Data Points
                </div>
              </div>
              
              {/* CTA Button - Full width on mobile, same size on desktop */}
              <motion.button
                onClick={() => navigate('/telemetry')}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="col-span-2 sm:col-span-1 group flex flex-row sm:flex-col items-center justify-center gap-2 sm:gap-1 p-3 sm:p-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-lg sm:rounded-xl font-rajdhani font-black text-metrik-black shadow-glow-turquoise-lg hover:shadow-glow-turquoise transition-all duration-300"
              >
                <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 group-hover:translate-x-1 transition-transform" />
                <span className="text-sm sm:text-xs uppercase tracking-wider">Start Analyzing</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Right: Professional Chart Preview - HIDDEN ON MOBILE, SHOWN ON DESKTOP ONLY */}
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
                    Speed Comparison
                  </span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-metrik-black/80 border border-metrik-turquoise/30 rounded-full">
                  <div className="w-2 h-2 rounded-full bg-metrik-turquoise animate-pulse shadow-lg shadow-metrik-turquoise/50" />
                  <span className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">
                    Live
                  </span>
                </div>
              </div>

              {/* Canvas Chart */}
              <div className="relative">
                <canvas
                  ref={canvasRef}
                  className="w-full h-72 rounded-xl bg-metrik-black/50 border border-metrik-turquoise/10"
                  style={{ display: 'block' }}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-8 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-gradient-to-r from-orange-500 to-orange-400" />
                  <span className="text-xs font-rajdhani font-bold text-gray-300 uppercase tracking-wide">
                    NOR
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-0.5 bg-[#3671C6]" />
                  <span className="text-xs font-rajdhani font-bold text-gray-300 uppercase tracking-wide">
                    VER
                  </span>
                </div>
              </div>
            </div>

            {/* Floating glow elements */}
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