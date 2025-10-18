import React, { useState, useRef, useEffect } from 'react';
import { backendService } from '../services/backend.service';

export default function AnimationPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('HAM');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const data = await backendService.getDrivers(year, round, sessionType);
      setDrivers(data.drivers);
      if (data.drivers.length >= 2) {
        setDriver1(data.drivers[0].code);
        setDriver2(data.drivers[1].code);
      }
      setLoadingDrivers(false);
    } catch (err) {
      console.error(err);
      setLoadingDrivers(false);
    }
  };

  const loadAnimation = async () => {
    try {
      setLoading(true);
      const data = await backendService.getAnimation(year, round, sessionType, driver1, driver2);
      setAnimationData(data);
      setCurrentFrame(0);
      setIsPlaying(false);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animationData && canvasRef.current) {
      drawFrame(currentFrame);
    }
  }, [animationData, currentFrame]);

  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !animationData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { positions_1, positions_2 } = animationData;
    if (!positions_1 || positions_1.length === 0) return;

    // Clear
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find bounds for both drivers
    const allPositions = [...positions_1, ...positions_2];
    const xs = allPositions.map((p: any) => p.x);
    const ys = allPositions.map((p: any) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min((canvas.width - 100) / width, (canvas.height - 100) / height);

    // Normalize
    const normalize = (positions: any[]) => positions.map((p: any) => ({
      x: (p.x - minX) * scale + 50,
      y: canvas.height - ((p.y - minY) * scale + 50),
    }));

    const norm1 = normalize(positions_1);
    const norm2 = normalize(positions_2);

    // Draw track (faded)
    ctx.strokeStyle = 'rgba(192, 192, 192, 0.2)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 1; i < norm1.length; i++) {
      ctx.moveTo(norm1[i - 1].x, norm1[i - 1].y);
      ctx.lineTo(norm1[i].x, norm1[i].y);
    }
    ctx.stroke();

    // Draw paths up to current frame
    const drawPath = (positions: any[], color: string, glowColor: string) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = 6;
      ctx.shadowBlur = 15;
      ctx.shadowColor = glowColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 1; i <= Math.min(frame, positions.length - 1); i++) {
        ctx.moveTo(positions[i - 1].x, positions[i - 1].y);
        ctx.lineTo(positions[i].x, positions[i].y);
      }
      ctx.stroke();
    };

    drawPath(norm1, '#00D176', '#00D176');
    drawPath(norm2, '#00D2BE', '#00D2BE');

    // Draw cars at current position
    const drawCar = (positions: any[], color: string, label: string) => {
      if (frame >= positions.length) return;
      const pos = positions[frame];

      ctx.shadowBlur = 20;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Rajdhani';
      ctx.textAlign = 'center';
      ctx.fillText(label, pos.x, pos.y - 20);
    };

    drawCar(norm1, '#00D176', driver1);
    drawCar(norm2, '#00D2BE', driver2);

    ctx.shadowBlur = 0;
  };

  const play = () => {
    if (!animationData) return;
    setIsPlaying(true);

    const animate = () => {
      setCurrentFrame(prev => {
        const next = prev + 1;
        if (next >= animationData.positions_1.length) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
  };

  const pause = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const reset = () => {
    pause();
    setCurrentFrame(0);
  };

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">ANIMA</span>
            <span className="text-metrik-turquoise">TION</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Simulation de course en temps réel</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-8">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-6">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ANNÉE</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-mono focus:border-metrik-turquoise focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ROUND</label>
              <input
                type="number"
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-mono focus:border-metrik-turquoise focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">SESSION</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-turquoise focus:outline-none transition-colors"
              >
                <option value="Q">Qualifications</option>
                <option value="R">Course</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ACTION</label>
              <button
                onClick={loadDrivers}
                disabled={loadingDrivers}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loadingDrivers ? 'CHARGEMENT...' : '🔄 PILOTES'}
              </button>
            </div>
          </div>

          {drivers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">PILOTE 1</label>
                <select
                  value={driver1}
                  onChange={(e) => setDriver1(e.target.value)}
                  className="w-full px-4 py-3 bg-metrik-dark border border-metrik-success/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-success focus:outline-none transition-colors"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">PILOTE 2</label>
                <select
                  value={driver2}
                  onChange={(e) => setDriver2(e.target.value)}
                  className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-turquoise focus:outline-none transition-colors"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-end">
                <button
                  onClick={loadAnimation}
                  disabled={loading}
                  className="w-full btn-cockpit disabled:opacity-50"
                >
                  {loading ? 'GÉNÉRATION...' : '🎬 GÉNÉRER'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Player Controls */}
        {animationData && (
          <div className="card-cockpit mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise flex items-center gap-2">
                <span>🎮</span> CONTRÔLES
              </h3>
              <div className="text-metrik-text-secondary font-mono text-sm">
                Frame {currentFrame} / {animationData.positions_1.length}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={isPlaying ? pause : play}
                className="btn-cockpit flex-1"
              >
                {isPlaying ? '⏸️ PAUSE' : '▶️ LECTURE'}
              </button>
              
              <button
                onClick={reset}
                className="btn-cockpit-secondary"
              >
                🔄 RESET
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <input
                type="range"
                min="0"
                max={animationData.positions_1.length - 1}
                value={currentFrame}
                onChange={(e) => {
                  pause();
                  setCurrentFrame(parseInt(e.target.value));
                }}
                className="w-full h-2 bg-metrik-dark rounded-lg appearance-none cursor-pointer accent-metrik-turquoise"
              />
            </div>
          </div>
        )}

        {/* Canvas */}
        {animationData && (
          <div className="card-cockpit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise flex items-center gap-2">
                <span>🏁</span> SIMULATION
              </h3>
              <div className="flex items-center gap-6 text-sm font-rajdhani">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-metrik-success rounded-full shadow-glow-turquoise" />
                  <span className="text-metrik-text-secondary">{driver1}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-metrik-turquoise rounded-full shadow-glow-turquoise" />
                  <span className="text-metrik-text-secondary">{driver2}</span>
                </div>
              </div>
            </div>
            <div className="bg-metrik-black border border-metrik-turquoise/20 rounded-lg p-4 flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={600}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        )}

        {!animationData && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Chargez les pilotes, sélectionnez-en 2 et générez l'animation
            </p>
          </div>
        )}
      </div>
    </div>
  );
}