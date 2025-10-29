import { useNavigate } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { Activity, Film, Trophy, Map, Target, Cpu, Gauge, Zap, TrendingUp, Users } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // F1 Data Matrix Effect + Speed Particles
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Responsive canvas sizing
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // F1 Data pool (real-ish F1 data)
    const f1Data = [
      'VER', 'HAM', 'LEC', 'SAI', 'PER', 'RUS', 'NOR', 'PIA', 'ALO', 'STR',
      '1:19.456', '1:20.123', '1:18.987', '305.2', '312.5', '298.7',
      'RED BULL', 'MERCEDES', 'FERRARI', 'McLAREN', 'ASTON', 'ALPINE',
      'DRS', 'P1', 'P2', 'P3', 'POLE', 'FL', 'DNF', 'PIT',
      '►', '▲', '●', '■', '◆', '▼', '◄', '★', '▪', '•',
      '330', '340', '290', '275', '320', 'KM/H', 'MPH',
      'SOFT', 'MED', 'HARD', 'S1', 'S2', 'S3', 'LAP 44', 'LAP 58'
    ];

    // Matrix Cascade Streams (horizontal flow)
    class MatrixStream {
      x: number;
      y: number;
      speed: number;
      chars: string[];
      opacity: number;
      length: number;

      constructor() {
        this.x = -100; // Start off-screen left
        this.y = canvas ? Math.random() * canvas.height : 0;
        this.speed = 1 + Math.random() * 3; // Horizontal speed
        this.chars = [];
        this.length = 8 + Math.floor(Math.random() * 12);
        this.opacity = 0.3 + Math.random() * 0.7;

        // Generate random F1 data sequence
        for (let i = 0; i < this.length; i++) {
          this.chars.push(f1Data[Math.floor(Math.random() * f1Data.length)]);
        }
      }

      update() {
        if (!canvas) return;
        this.x += this.speed;

        // Reset when off-screen right
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
          const xPos = this.x + (index * 60); // Spacing between chars
          const alpha = this.opacity * (1 - (index / this.length) * 0.5); // Fade trail
          
          // Glow effect
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00e5cc';
          
          // Main text
          ctx.fillStyle = `rgba(0, 229, 204, ${alpha})`;
          ctx.fillText(char, xPos, this.y);
          
          // Stronger glow for lead char
          if (index === this.length - 1) {
            ctx.shadowBlur = 25;
            ctx.fillStyle = `rgba(0, 229, 204, ${this.opacity})`;
            ctx.fillText(char, xPos, this.y);
          }
        });
        
        ctx.shadowBlur = 0;
      }
    }

    // Speed Particles
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
        this.speedX = 2 + Math.random() * 6; // Horizontal speed
        this.speedY = (Math.random() - 0.5) * 2; // Slight vertical drift
        this.size = 1 + Math.random() * 2;
        this.maxLife = 100 + Math.random() * 100;
        this.life = this.maxLife;
      }

      update() {
        if (!canvas) return;
        this.x += this.speedX;
        this.y += this.speedY;
        this.life--;

        // Wrap around
        if (this.x > canvas.width) this.x = 0;
        if (this.y < 0) this.y = canvas.height;
        if (this.y > canvas.height) this.y = 0;

        // Respawn when dead
        if (this.life <= 0) {
          this.x = 0;
          this.y = Math.random() * canvas.height;
          this.life = this.maxLife;
        }
      }

      draw() {
        if (!ctx) return;
        const alpha = this.life / this.maxLife;
        
        // Trail effect
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#00e5cc';
        
        ctx.fillStyle = `rgba(0, 229, 204, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Speed line trail
        ctx.strokeStyle = `rgba(0, 229, 204, ${alpha * 0.3})`;
        ctx.lineWidth = this.size / 2;
        ctx.beginPath();
        ctx.moveTo(this.x - this.speedX * 3, this.y - this.speedY * 3);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
        
        ctx.shadowBlur = 0;
      }
    }

    // Initialize streams and particles
    const streams: MatrixStream[] = [];
    const particles: Particle[] = [];

    // Create matrix streams (vertical distribution)
    for (let i = 0; i < 12; i++) {
      streams.push(new MatrixStream());
    }

    // Create particles
    for (let i = 0; i < 80; i++) {
      particles.push(new Particle());
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      if (!ctx || !canvas) return;
      
      // Semi-transparent black for trail effect
      ctx.fillStyle = 'rgba(10, 10, 10, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles (background layer)
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });

      // Update and draw matrix streams (foreground layer)
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

  const features = [
    {
      id: 'telemetry',
      title: 'Télémétrie Avancée',
      description: '8 graphiques détaillés : Speed, Throttle, Brake, RPM, Gear, Pace, Stints, Secteurs',
      icon: Activity,
      path: '/telemetry',
      tags: ['Comparaison', 'Race & Qualif'],
      color: 'cyan'
    },
    {
      id: 'animation',
      title: 'Battle Animation',
      description: 'Visualisez les duels pilote par pilote avec trajectoires en temps réel',
      icon: Film,
      path: '/animation',
      tags: ['Canvas 2D', 'Écart dynamique'],
      color: 'orange'
    },
    {
      id: 'pit-wall',
      title: 'Pit Wall',
      description: 'Race Control Center : Position Evolution, Lap Times, Sectors, Timing Tower',
      icon: Target,
      path: '/pit-wall',
      tags: ['Live Race', 'Strategy'],
      color: 'red'
    },
    {
      id: 'championship',
      title: 'Championship',
      description: 'Classements pilotes, constructeurs, résultats course & qualifications',
      icon: Trophy,
      path: '/championship',
      tags: ['Multi-années', '4 onglets'],
      color: 'yellow'
    },
    {
      id: 'track-database',
      title: 'Track Database 3D',
      description: 'Globe 3D interactif avec les 24 circuits F1, infos techniques et records',
      icon: Map,
      path: '/track-database',
      tags: ['Globe 3D', 'Records'],
      color: 'green'
    },
    {
      id: 'f1-anatomy',
      title: 'F1 Anatomy',
      description: 'Voiture 3D interactive avec 26 composants cliquables et simulation CFD',
      icon: Cpu,
      path: '/f1-anatomy',
      tags: ['3D Model', 'CFD Wind', 'DRS'],
      color: 'purple'
    }
  ];

  const stats = [
    { value: '6', label: 'Modules', icon: Gauge },
    { value: '24', label: 'Circuits F1', icon: Map },
    { value: '2018-2025', label: 'Années de données', icon: TrendingUp },
    { value: '∞', label: 'Analyses possibles', icon: Zap }
  ];

  return (
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

      <div className="container mx-auto px-6 py-12 relative z-10">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center justify-center gap-4 mb-6 backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/30 rounded-full px-8 py-3 shadow-2xl shadow-metrik-turquoise/20">
            <div className="w-3 h-3 rounded-full bg-metrik-turquoise animate-pulse shadow-lg shadow-metrik-turquoise/50" />
            <span className="text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wider">
              Real-time F1 Telemetry Platform
            </span>
          </div>

          <h1 className="text-7xl md:text-9xl font-rajdhani font-black mb-6 bg-gradient-to-r from-white via-metrik-turquoise to-cyan-400 bg-clip-text text-transparent leading-tight animate-gradient drop-shadow-2xl">
            F1 METRIK
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-300 font-inter mb-4 max-w-3xl mx-auto drop-shadow-lg">
            Advanced Formula 1 Telemetry & Analytics Platform
          </p>
          
          <p className="text-sm text-gray-500 font-inter max-w-2xl mx-auto">
            Deep performance analysis • Interactive 3D models • Real-time data visualization
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300 hover:scale-105 group"
              >
                <div className="flex items-center justify-center mb-3">
                  <div className="p-3 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-colors">
                    <Icon className="w-6 h-6 text-metrik-turquoise" />
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-rajdhani font-black text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-gray-400 font-inter uppercase tracking-wide">
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => navigate(feature.path)}
                className="group relative backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/30 rounded-2xl p-8 cursor-pointer transition-all duration-300 hover:scale-105 hover:border-metrik-turquoise hover:shadow-lg hover:shadow-metrik-turquoise/30"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative z-10">
                  {/* Icon Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="p-4 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-all duration-300 group-hover:scale-110 shadow-lg shadow-metrik-turquoise/0 group-hover:shadow-metrik-turquoise/30">
                      <Icon className="w-8 h-8 text-metrik-turquoise" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-metrik-turquoise opacity-0 group-hover:opacity-100 animate-pulse transition-opacity" />
                      <span className="text-xs text-metrik-turquoise font-rajdhani font-black opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider">
                        EXPLORE
                      </span>
                    </div>
                  </div>
                  
                  {/* Title */}
                  <h2 className="text-2xl font-rajdhani font-black text-white mb-3 group-hover:text-metrik-turquoise transition-colors">
                    {feature.title}
                  </h2>
                  
                  {/* Description */}
                  <p className="text-gray-400 text-sm font-inter leading-relaxed mb-6">
                    {feature.description}
                  </p>
                  
                  {/* Tags */}
                  <div className="flex flex-wrap gap-2">
                    {feature.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-3 py-1.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 text-metrik-turquoise rounded-full font-rajdhani font-semibold group-hover:bg-metrik-turquoise/20 group-hover:border-metrik-turquoise/50 transition-colors"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="backdrop-blur-xl bg-gradient-to-br from-metrik-card/95 to-metrik-turquoise/5 border border-metrik-turquoise/30 rounded-3xl p-12 shadow-2xl shadow-metrik-turquoise/20 text-center mb-16">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-6 h-6 text-metrik-turquoise animate-pulse" />
            <span className="text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wider">
              Powered by FastF1
            </span>
          </div>
          <h2 className="text-4xl font-rajdhani font-black text-white mb-4">
            Plongez dans les données F1
          </h2>
          <p className="text-gray-400 font-inter mb-8 max-w-2xl mx-auto">
            Explorez plus de 7 années de télémétrie officielle, analysez les performances des pilotes, 
            comparez les stratégies et découvrez les secrets des circuits légendaires.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={() => navigate('/telemetry')}
              className="px-8 py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 rounded-xl font-rajdhani font-black text-lg text-metrik-black hover:shadow-2xl hover:shadow-metrik-turquoise/50 transition-all duration-300 hover:scale-105"
            >
              Commencer l'analyse
            </button>
            <button
              onClick={() => navigate('/track-database')}
              className="px-8 py-4 bg-metrik-card/80 backdrop-blur-xl border border-metrik-turquoise/30 rounded-xl font-rajdhani font-black text-lg text-metrik-turquoise hover:bg-metrik-turquoise/20 hover:shadow-xl hover:shadow-metrik-turquoise/30 transition-all duration-300"
            >
              Explorer les circuits
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-metrik-turquoise/20 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-metrik-turquoise animate-pulse shadow-lg shadow-metrik-turquoise/50" />
              <p className="text-gray-500 text-sm font-inter">
                Real F1 Telemetry Data • 2018-2025
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-metrik-turquoise" />
                <span className="text-xs text-gray-500 font-inter">
                  Built for F1 enthusiasts
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-metrik-turquoise" />
                <span className="text-xs text-gray-500 font-inter">
                  Professional-grade analytics
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}