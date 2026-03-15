import { useEffect, useRef, useMemo } from 'react';
import { motion, useInView } from 'framer-motion';
import { Activity, ArrowRight, Zap } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Space particles component (from HeroSection)
function SpaceParticles() {
  const ref = useRef<THREE.Points>(null);

  const particleCount = 1500;
  // useRef → tableau créé une seule fois, stable entre re-renders
  const positions = useRef(new Float32Array(particleCount * 3));
  const velocities = useRef(new Float32Array(particleCount));

  // Initialisation une seule fois
  useMemo(() => {
    for (let i = 0; i < particleCount; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 50;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions.current[i * 3 + 2] = (Math.random() - 0.5) * 100 - 50;
      velocities.current[i] = Math.random() * 0.5 + 0.1;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    if (!ref.current) return;

    const pos = ref.current.geometry.attributes.position.array as Float32Array;
    const vel = velocities.current;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      pos[i3 + 2] += vel[i] * 0.3;
      pos[i3] += Math.sin(time * 0.1 + i) * 0.01;
      pos[i3 + 1] += Math.cos(time * 0.1 + i) * 0.01;

      if (pos[i3 + 2] > 10) {
        pos[i3 + 2] = -100;
        pos[i3] = (Math.random() - 0.5) * 50;
        pos[i3 + 1] = (Math.random() - 0.5) * 50;
      }
    }

    ref.current.geometry.attributes.position.needsUpdate = true;
    ref.current.rotation.z = Math.sin(time * 0.1) * 0.02;
  });

  return (
    <Points ref={ref} positions={positions.current} stride={3} frustumCulled={false}>
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

// Positions des nébuleuses générées une seule fois au module load — jamais recalculées
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
  const starsRef = useRef<THREE.Points>(null);
  const starCount = 100;
  // useRef → stable entre re-renders
  const positions = useRef(new Float32Array(starCount * 3));
  useMemo(() => {
    for (let i = 0; i < starCount; i++) {
      positions.current[i * 3] = (Math.random() - 0.5) * 60;
      positions.current[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions.current[i * 3 + 2] = -10 - Math.random() * 80;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    if (!starsRef.current) return;
    const time = state.clock.getElapsedTime();
    const material = starsRef.current.material as THREE.PointsMaterial;
    if (material) {
      material.opacity = 0.7 + Math.sin(time * 2) * 0.3;
    }
  });

  return (
    <Points ref={starsRef} positions={positions.current} stride={3}>
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

// ── Real telemetry: ANT vs HAM — China 2026 Race fastest laps ────────────────
const ANT_SPEED = [281.0,282.4,284.5,286.1,288.0,288.0,288.0,288.0,289.1,290.2,291.9,292.0,292.0,292.0,292.0,292.0,292.3,292.5,292.8,293.0,293.0,293.0,293.0,293.0,293.0,293.0,293.0,293.0,293.0,293.0,293.0,291.8,289.8,288.7,286.9,284.5,273.6,244.1,230.3,228.0,212.2,206.0,206.0,194.2,180.0,180.0,167.2,157.4,148.1,140.0,130.6,124.3,118.0,109.8,103.8,100.6,97.5,97.1,108.2,116.3,111.0,106.3,99.6,93.0,94.9,99.0,107.0,110.4,135.3,147.7,155.0,159.8,168.4,175.4,186.9,196.4,209.7,218.2,224.1,227.3,234.2,241.1,250.7,256.0,258.2,259.3,261.9,264.0,266.5,267.9,269.6,270.3,271.0,271.6,272.5,273.1,274.2,274.7,275.3,275.7,276.4,277.0,277.0,276.1,274.3,273.1,259.6,234.6,197.0,171.9,145.3,120.9,96.0,88.0,79.7,83.8,109.8,127.3,163.5,179.3,190.4,194.1,195.0,195.0,200.0,217.9,227.4,230.0,230.0,240.1,247.7,251.7,258.1,259.3,260.2,261.1,262.6,263.8,266.0,265.6,265.0,263.6,263.0,262.0,259.6,259.2,257.3,255.7,255.0,253.5,253.0,253.0,252.7,251.3,249.3,247.7,246.2,246.6,246.2,244.8,242.8,241.5,238.0,233.0,224.0,217.0,198.6,194.8,188.6,182.4,180.2,180.0,180.0,181.5,184.8,188.8,192.2,187.7,175.4,149.6,142.0,142.0,136.7,131.8,122.0,115.0,116.5,127.4,143.7,152.4,162.9,172.0,178.3,188.7,197.0,201.6,208.5,213.1,220.7,224.4,229.3,232.5,237.4,240.2,241.7,243.5,246.4,248.2,249.9,251.0,253.3,254.6,256.1,257.1,259.8,262.1,262.8,263.2,263.6,263.9,250.1,236.2,208.9,187.9,145.1,128.3,103.9,96.2,95.2,109.7,117.4,114.6,110.7,109.4,109.7,110.9,113.9,116.5,125.0,125.0,149.1,153.6,166.1,171.3,182.9,189.5,196.6,202.7,212.0,216.8,226.0,226.5,231.1,236.2,246.6,251.7,255.9,258.0,261.3,263.0,263.0,263.0,263.0,269.6,280.1,285.2,292.4,295.7,297.9,299.4,304.1,305.7,307.0,307.8,309.0,309.8,311.1,312.0,313.2,314.0,315.1,315.9,317.2,318.0,318.0,318.2,318.8,319.3,320.0,320.2,320.5,320.8,321.0,321.0,321.0,320.9,319.7,318.9,317.7,316.8,315.6,315.0,315.0,315.0,314.6,314.3,313.9,313.6,313.1,312.6,312.0,312.0,311.8,311.5,311.0,310.6,309.9,309.5,309.0,309.0,309.0,309.0,308.3,307.8,307.0,307.0,306.9,306.7,306.2,306.0,306.0,305.2,304.1,303.7,303.1,303.0,303.0,303.0,302.8,301.0,298.3,270.1,220.9,188.1,147.4,126.6,102.6,86.7,67.3,67.0,90.1,115.8,146.3,156.0,157.9,161.3,165.9,168.0,191.0,198.4,210.0,213.2,217.5,220.0,223.8,225.5,227.9,228.5,229.8,230.9,217.5,206.5,194.0,193.0,156.5,150.7,148.5,153.1,155.0,168.0,186.4,193.9,202.8,208.8,216.5,222.3,238.5,246.1,256.7,258.0,261.5,264.8,268.5,270.6,273.8,277.0,278.0,278.0,278.0,278.0];
const HAM_SPEED = [289.0,291.6,295.4,296.0,297.6,299.5,302.7,305.0,305.3,305.5,305.8,306.0,306.0,306.3,307.0,307.0,307.0,307.0,307.0,307.0,306.8,306.3,306.0,306.0,305.9,305.8,305.5,305.3,305.0,304.8,304.5,304.3,302.1,296.7,288.8,280.7,258.8,244.9,228.9,222.8,214.0,206.9,194.8,190.1,182.4,175.3,169.7,161.7,148.4,141.8,133.2,126.0,121.9,115.9,101.1,97.6,95.0,95.0,103.4,117.4,109.2,106.0,98.8,94.2,92.5,107.1,120.0,130.6,136.0,139.5,147.1,153.3,168.9,178.3,191.0,202.0,208.9,211.7,221.0,226.9,235.1,240.7,248.2,251.4,255.1,257.3,259.8,261.4,264.8,268.4,270.8,270.0,271.2,272.0,272.7,272.8,272.1,272.4,273.2,273.6,274.0,274.0,274.0,274.5,275.0,270.2,250.3,237.1,217.6,204.5,147.5,120.9,94.8,84.9,79.0,86.9,107.4,133.5,155.3,166.6,182.2,188.5,198.1,204.0,211.8,214.7,219.2,225.1,231.0,234.3,236.3,240.1,246.2,247.8,249.6,250.0,250.0,252.0,252.4,252.7,253.0,253.0,252.1,251.5,250.5,249.7,248.5,248.0,248.0,248.0,248.0,248.0,245.6,245.0,245.0,244.6,244.0,244.3,244.7,245.0,245.0,245.0,245.0,240.8,221.5,215.1,205.7,199.5,192.2,187.5,177.9,173.0,173.0,175.5,178.8,178.1,177.1,176.4,168.5,160.0,144.9,139.0,125.8,123.9,119.4,113.3,119.0,122.8,135.7,147.6,165.8,169.7,180.4,187.7,196.6,201.7,210.3,214.5,220.4,224.0,227.8,230.1,234.5,240.2,245.4,248.6,251.5,253.4,255.7,256.5,257.4,258.0,259.2,259.9,261.1,262.6,264.8,265.3,265.9,261.8,251.4,244.5,214.3,190.1,141.7,116.0,102.2,94.9,93.8,107.3,117.8,112.7,104.9,103.0,104.0,106.3,109.8,117.9,127.8,135.5,146.6,152.9,162.5,169.5,179.1,188.3,194.0,198.0,205.1,209.8,216.9,218.2,224.0,230.6,242.6,245.3,250.4,254.2,256.0,259.3,263.7,266.2,270.1,273.3,279.0,285.6,288.7,290.6,294.1,296.3,299.1,300.9,303.0,304.3,306.4,307.6,309.4,310.2,311.5,312.2,312.9,313.4,314.2,314.6,315.4,315.9,319.3,319.8,319.3,319.1,320.0,320.0,320.0,319.4,318.1,317.0,317.0,316.4,315.3,314.7,314.1,313.0,312.7,312.5,312.2,312.0,312.0,312.0,311.0,309.8,308.8,308.6,308.3,308.0,308.0,308.0,308.0,307.0,307.0,306.9,306.0,306.0,306.0,305.8,305.5,305.3,305.1,304.8,304.3,304.0,304.0,304.0,304.0,304.0,303.4,302.5,294.4,289.1,281.0,275.6,220.6,206.7,186.5,174.4,144.0,121.7,99.6,83.7,67.2,69.6,89.3,106.3,137.4,149.3,167.9,175.4,184.0,188.6,191.6,194.3,200.3,206.1,214.4,216.2,219.6,221.6,223.4,224.4,225.0,225.1,226.8,221.5,207.2,185.0,154.9,152.3,150.2,154.0,166.2,174.6,194.1,203.0,206.5,208.8,226.3,233.2,242.4,247.5,253.8,256.8,263.7,266.6,270.8,273.7,279.0,282.4,284.9,286.6,290.7,294.5];
const ANT_LAP = '1:35.275';
const HAM_LAP = '1:36.092';

export default function TelemetrySection({ navigate }: TelemetrySectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const isInView   = useInView(sectionRef, { amount: 0.3 });

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

    const speedData1 = ANT_SPEED;
    const speedData2 = HAM_SPEED;

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

      // Draw Driver 1
      ctx.save();
      ctx.strokeStyle = '#27F4D2';
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

      // Draw Driver 2
      ctx.save();
      ctx.strokeStyle = '#E8002D';
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
      ctx.fillStyle = '#27F4D2';
      ctx.font = `bold ${labelFontSize + 1}px Rajdhani`;
      ctx.fillText('ANT', legendX, legendY);
      ctx.fillStyle = '#27F4D2' + 'CC';
      ctx.font = `bold ${speedFontSize}px Rajdhani`;
      ctx.fillText(speed1Display + ' km/h', legendX, legendY + 12);

      ctx.fillStyle = '#E8002D';
      ctx.font = `bold ${labelFontSize + 1}px Rajdhani`;
      ctx.fillText('HAM', legendX, legendY + lineHeight + 20);
      ctx.fillStyle = '#E8002D' + 'CC';
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
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-metrik-turquoise" />
                    <span className="text-xs font-rajdhani font-bold text-gray-300 uppercase tracking-wide">
                      ANT <span className="text-metrik-turquoise">{ANT_LAP}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-0.5 bg-red-500" />
                    <span className="text-xs font-rajdhani font-bold text-gray-300 uppercase tracking-wide">
                      HAM <span className="text-gray-400">{HAM_LAP}</span>
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-rajdhani text-gray-600 uppercase tracking-wider">
                  🇨🇳 China 2026 Race
                </span>
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