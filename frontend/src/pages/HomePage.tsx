import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useEffect, useRef } from 'react';
import { Activity, Film, Trophy, Map, Target, Cpu, Gauge, Zap, TrendingUp, Users, ArrowRight } from 'lucide-react';
import SEO from '../components/SEO';

export default function HomePage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // F1 Data Matrix Effect + Speed Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const f1Data = [
      'VER', 'HAM', 'LEC', 'SAI', 'PER', 'RUS', 'NOR', 'PIA', 'ALO', 'STR',
      '1:19.456', '1:20.123', '1:18.987', '305.2', '312.5', '298.7',
      'RED BULL', 'MERCEDES', 'FERRARI', 'McLAREN', 'ASTON', 'ALPINE',
      'DRS', 'P1', 'P2', 'P3', 'POLE', 'FL', 'DNF', 'PIT',
      '►', '▲', '●', '■', '◆', '▼', '◄', '★', '▪', '•',
      '330', '340', '290', '275', '320', 'KM/H', 'MPH',
      'SOFT', 'MED', 'HARD', 'S1', 'S2', 'S3', 'LAP 44', 'LAP 58'
    ];

    class MatrixStream {
      x: number;
      y: number;
      speed: number;
      chars: string[];
      opacity: number;
      length: number;

      constructor() {
        this.x = -100;
        this.y = canvas ? Math.random() * canvas.height : 0;
        this.speed = 1 + Math.random() * 3;
        this.chars = [];
        this.length = 8 + Math.floor(Math.random() * 12);
        this.opacity = 0.3 + Math.random() * 0.7;

        for (let i = 0; i < this.length; i++) {
          this.chars.push(f1Data[Math.floor(Math.random() * f1Data.length)]);
        }
      }

      update() {
        if (!canvas) return;
        this.x += this.speed;

        if (this.x > canvas.width + 200) {
          this.x = -100;
          this.y = Math.random() * canvas.height;
          this.chars = [];
          for (let i = 0; i < this.length; i++) {
            this.chars.push(f1Data[Math.floor(Math.random() * f1Data.length)]);
          }
        }
      }

      draw() {
        if (!ctx) return;
        ctx.font = 'bold 14px Rajdhani, monospace';
        
        this.chars.forEach((char, index) => {
          const xPos = this.x + (index * 60);
          const alpha = this.opacity * (1 - (index / this.length) * 0.5);
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00e5cc';
          
          ctx.fillStyle = `rgba(0, 229, 204, ${alpha})`;
          ctx.fillText(char, xPos, this.y);
          
          if (index === this.length - 1) {
            ctx.shadowBlur = 25;
            ctx.fillStyle = `rgba(0, 229, 204, ${this.opacity})`;
            ctx.fillText(char, xPos, this.y);
          }
        });
        
        ctx.shadowBlur = 0;
      }
    }

    class Particle {
      x: number;
      y: number;
      speedX: number;
      speedY: number;
      size: number;
      life: number;
      maxLife: number;

      constructor() {
        this.x = canvas ? Math.random() * canvas.width : 0;
        this.y = canvas ? Math.random() * canvas.height : 0;
        this.speedX = 2 + Math.random() * 6;
        this.speedY = (Math.random() - 0.5) * 2;
        this.size = 1 + Math.random() * 2;
        this.maxLife = 100 + Math.random() * 100;
        this.life = this.maxLife;
      }

      update() {
        if (!canvas) return;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;

        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        if (this.life <= 0) {
          this.x = 0;
          this.y = Math.random() * canvas.height;
          this.life = this.maxLife;
        }
      }

      draw() {
        if (!ctx) return;
        const alpha = this.life / this.maxLife;
        
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5cc';
        
        ctx.fillStyle = `rgba(0, 229, 204, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `rgba(0, 229, 204, ${alpha * 0.3})`;
        ctx.lineWidth = this.size / 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.speedX * 3, this.y - this.speedY * 3);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }
    }

    const streams: MatrixStream[] = [];
    const particles: Particle[] = [];

    for (let i = 0; i < 12; i++) {
      streams.push(new MatrixStream());
    }

    for (let i = 0; i < 80; i++) {
      particles.push(new Particle());
    }

    let animationId: number;
    const animate = () => {
      if (!ctx || !canvas) return;
      
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      streams.forEach(stream => {
        stream.update();
        stream.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <>
      <SEO path="/" />
      <style>{`
        @keyframes heartbeat {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.1); }
          50% { transform: scale(1); }
        }

        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes ripple {
          0% { 
            box-shadow: 0 0 0 0 rgba(0, 229, 204, 0.4),
                        0 0 0 0 rgba(0, 229, 204, 0.4);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(0, 229, 204, 0),
                        0 0 0 20px rgba(0, 229, 204, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(0, 229, 204, 0),
                        0 0 0 0 rgba(0, 229, 204, 0);
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { 
            box-shadow: 0 0 0 0 rgba(0, 229, 204, 0.7);
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 0 20px 8px rgba(0, 229, 204, 0.4);
            filter: brightness(1.2);
          }
        }

        .icon-heartbeat:hover {
          animation: heartbeat 1.5s ease-in-out infinite;
        }

        .icon-spin:hover {
          animation: spin-slow 3s linear infinite;
        }

        .icon-ripple:hover {
          animation: ripple 2s ease-out infinite;
        }

        .icon-bounce:hover {
          animation: bounce 1s ease-in-out infinite;
        }

        .icon-swing:hover {
          animation: swing 2s ease-in-out infinite;
        }

        .icon-pulse-glow:hover {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>
      <div className="min-h-screen bg-metrik-black text-white overflow-hidden relative">
        {/* Animated Canvas Background */}
        <canvas
          ref={canvasRef}
          className="fixed inset-0 w-full h-full pointer-events-none z-0"
          style={{ opacity: 0.4 }}
        />

        {/* Radial Gradient Overlay */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-metrik-black/50 to-metrik-black" />
        </div>

        <div className="container mx-auto px-6 py-6 relative z-10">
          {/* ULTRA COMPACT HERO SECTION */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center gap-2 mb-3 backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/30 rounded-full px-4 py-1.5 shadow-2xl shadow-metrik-turquoise/20">
              <div className="w-1.5 h-1.5 rounded-full bg-metrik-turquoise animate-pulse shadow-lg shadow-metrik-turquoise/50" />
              <span className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wider">
                {t('home.hero.subtitle')}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-rajdhani font-black mb-2 bg-gradient-to-r from-white via-metrik-turquoise to-cyan-400 bg-clip-text text-transparent leading-tight animate-gradient drop-shadow-2xl">
              {t('home.hero.title')}
            </h1>
            
            <p className="text-base md:text-lg text-gray-300 font-inter mb-1 max-w-2xl mx-auto">
              Advanced Formula 1 Telemetry & Analytics Platform
            </p>
            
            <p className="text-xs text-gray-500 font-inter max-w-xl mx-auto mb-4">
              Deep performance analysis • Interactive 3D models • Real-time data visualization
            </p>

            <button
              onClick={() => navigate('/telemetry')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-xl font-rajdhani font-black text-sm text-metrik-black hover:shadow-2xl hover:shadow-metrik-turquoise/50 transition-all duration-300 hover:scale-105"
            >
              {t('home.hero.cta')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* COMPACT INTERACTIVE FEATURES GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {/* 1. TELEMETRY CARD - Mini Oscilloscope */}
            <FeatureCardTelemetry navigate={navigate} t={t} />

            {/* 2. ANIMATION GPS CARD - Moving dots on circuit */}
            <FeatureCardAnimation navigate={navigate} t={t} />

            {/* 3. PIT WALL CARD - Live timing tower */}
            <FeatureCardPitWall navigate={navigate} />

            {/* 4. CHAMPIONSHIP CARD - Animated podium */}
            <FeatureCardChampionship navigate={navigate} t={t} />

            {/* 5. TRACK DATABASE CARD - Rotating globe */}
            <FeatureCardTracks navigate={navigate} t={t} />

            {/* 6. F1 ANATOMY CARD - Car silhouette with CFD */}
            <FeatureCardAnatomy navigate={navigate} />
          </div>

          {/* COMPACT STATS + FOOTER */}
          <div className="backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/20 rounded-2xl p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatCard icon={Gauge} value="6" label="Modules" />
              <StatCard icon={Map} value="24" label="Circuits F1" />
              <StatCard icon={TrendingUp} value="2018-2025" label="Années" />
              <StatCard icon={Zap} value="∞" label="Analyses" />
            </div>

            <div className="border-t border-metrik-turquoise/10 pt-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-metrik-turquoise animate-pulse" />
                  <span>Real F1 Telemetry Data • Powered by FastF1</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-metrik-turquoise" />
                    <span>Built for enthusiasts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-metrik-turquoise" />
                    <span>Professional analytics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ==================== FEATURE CARDS WITH MINI DEMOS ====================

function FeatureCardTelemetry({ navigate, t }: any) {
  return (
    <div
      onClick={() => navigate('/telemetry')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all duration-300 shadow-lg shadow-metrik-turquoise/0 group-hover:shadow-metrik-turquoise/30 icon-heartbeat">
            <Activity className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          {t('home.features.telemetry.title')}
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          {t('home.features.telemetry.desc')}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            {t('common.compare')}
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Race & Qualif
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureCardAnimation({ navigate, t }: any) {
  return (
    <div
      onClick={() => navigate('/animation')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all icon-spin">
            <Film className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          {t('home.features.animation.title')}
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          {t('home.features.animation.desc')}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Canvas 2D
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Écart dynamique
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureCardPitWall({ navigate }: any) {
  return (
    <div
      onClick={() => navigate('/pit-wall')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all icon-ripple">
            <Target className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          Pit Wall
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          Race Control Center : Position Evolution, Lap Times, Sectors, Timing Tower
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Live Race
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Strategy
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureCardChampionship({ navigate, t }: any) {
  return (
    <div
      onClick={() => navigate('/championship')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all icon-bounce">
            <Trophy className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          {t('home.features.championship.title')}
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          {t('home.features.championship.desc')}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Multi-années
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            4 onglets
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureCardTracks({ navigate, t }: any) {
  return (
    <div
      onClick={() => navigate('/track-database')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all icon-swing">
            <Map className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          {t('home.features.trackDatabase.title')}
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          {t('home.features.trackDatabase.desc')}
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Globe 3D
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            Records
          </span>
        </div>
      </div>
    </div>
  );
}

function FeatureCardAnatomy({ navigate }: any) {
  return (
    <div
      onClick={() => navigate('/f1-anatomy')}
      className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-xl p-4 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:border-metrik-turquoise hover:shadow-xl hover:shadow-metrik-turquoise/30"
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2.5 bg-metrik-turquoise/20 rounded-lg group-hover:bg-metrik-turquoise/30 transition-all icon-pulse-glow">
            <Cpu className="w-6 h-6 text-metrik-turquoise" />
          </div>
          <ArrowRight className="w-4 h-4 text-metrik-turquoise opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        
        <h2 className="text-lg font-rajdhani font-black text-white mb-1.5 group-hover:text-metrik-turquoise transition-colors">
          F1 Anatomy
        </h2>
        
        <p className="text-gray-400 text-xs font-inter leading-relaxed mb-3">
          Voiture 3D interactive avec 26 composants cliquables et simulation CFD
        </p>
        
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            3D Model
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            CFD Wind
          </span>
          <span className="text-xs px-2 py-0.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold">
            DRS
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: any) {
  return (
    <div className="text-center">
      <div className="flex items-center justify-center mb-1.5">
        <div className="p-1.5 bg-metrik-turquoise/10 rounded-lg">
          <Icon className="w-4 h-4 text-metrik-turquoise" />
        </div>
      </div>
      <div className="text-xl font-rajdhani font-black text-white mb-0.5">
        {value}
      </div>
      <div className="text-xs text-gray-400 font-inter uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}