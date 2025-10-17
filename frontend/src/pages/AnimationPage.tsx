import React, { useState, useRef, useEffect } from 'react';
import { backendService } from '../services/backend.service';

export default function AnimationPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('Q');
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('HAM');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [animationData, setAnimationData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

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
      const data = await backendService.getRaceAnimation(year, round, sessionType, driver1, driver2);
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
    if (!animationData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const circuit = animationData.circuit;
    const frame = animationData.animation[currentFrame];
    
    if (!frame) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const allX = circuit.map((p: any) => p.x);
    const allY = circuit.map((p: any) => p.y);
    const minX = Math.min(...allX);
    const maxX = Math.max(...allX);
    const minY = Math.min(...allY);
    const maxY = Math.max(...allY);
    
    const padding = 50;
    const scaleX = (canvas.width - 2 * padding) / (maxX - minX);
    const scaleY = (canvas.height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const toCanvasX = (x: number) => (x - minX) * scale + padding;
    const toCanvasY = (y: number) => canvas.height - ((y - minY) * scale + padding);

    ctx.strokeStyle = '#4B5563';
    ctx.lineWidth = 3;
    ctx.beginPath();
    circuit.forEach((point: any, i: number) => {
      const x = toCanvasX(point.x);
      const y = toCanvasY(point.y);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    const drawCar = (x: number, y: number, color: string, label: string) => {
      const cx = toCanvasX(x);
      const cy = toCanvasY(y);
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.stroke();
      
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, cx, cy - 20);
    };

    drawCar(frame.driver1.x, frame.driver1.y, '#00D176', driver1);
    drawCar(frame.driver2.x, frame.driver2.y, '#0EA5E9', driver2);

  }, [animationData, currentFrame, driver1, driver2]);

  useEffect(() => {
    if (isPlaying && animationData) {
      const interval = 1000 / (30 * speed);
      animationRef.current = window.setInterval(() => {
        setCurrentFrame(prev => {
          if (prev >= animationData.animation.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
      
      return () => {
        if (animationRef.current) clearInterval(animationRef.current);
      };
    }
  }, [isPlaying, speed, animationData]);

  const togglePlay = () => {
    if (currentFrame >= animationData.animation.length - 1) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const restart = () => {
    setCurrentFrame(0);
    setIsPlaying(false);
  };

  const getCurrentDelta = () => {
    if (!animationData || !animationData.animation[currentFrame]) return 0;
    return animationData.animation[currentFrame].delta;
  };

  const getProgress = () => {
    if (!animationData) return 0;
    return (currentFrame / (animationData.animation.length - 1)) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🎬 Animation de Course</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2">Année</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Round</label>
              <input
                type="number"
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Session</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              >
                <option value="Q">Qualifications</option>
                <option value="R">Course</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadDrivers}
                disabled={loadingDrivers}
                className="w-full px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loadingDrivers ? 'Chargement...' : '🔄 Charger les pilotes'}
              </button>
            </div>
          </div>

          {drivers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">Pilote 1</label>
                <select
                  value={driver1}
                  onChange={(e) => setDriver1(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code} ({d.team})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Pilote 2</label>
                <select
                  value={driver2}
                  onChange={(e) => setDriver2(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code} ({d.team})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadAnimation}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '🎬 Charger'}
                </button>
              </div>
            </div>
          )}
        </div>

        {animationData && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <canvas
                ref={canvasRef}
                width={1000}
                height={600}
                className="w-full bg-gray-900 rounded-lg"
              />
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-green-600 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{driver1}</div>
                  <div className="text-3xl font-mono">{animationData.lap_time1.toFixed(3)}s</div>
                </div>
                <div className="bg-purple-600 rounded-lg p-4 text-center">
                  <div className="text-lg font-bold">Delta</div>
                  <div className="text-3xl font-mono">
                    {getCurrentDelta() > 0 ? '+' : ''}{getCurrentDelta().toFixed(3)}s
                  </div>
                </div>
                <div className="bg-blue-600 rounded-lg p-4 text-center">
                  <div className="text-xl font-bold">{driver2}</div>
                  <div className="text-3xl font-mono">{animationData.lap_time2.toFixed(3)}s</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="bg-gray-700 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-orange-600 h-full transition-all duration-100"
                    style={{ width: `${getProgress()}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-4 items-center justify-center">
                <button
                  onClick={restart}
                  className="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors font-bold"
                >
                  ⏮️ Restart
                </button>
                <button
                  onClick={togglePlay}
                  className="px-8 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-colors font-bold text-xl"
                >
                  {isPlaying ? '⏸️ Pause' : '▶️ Play'}
                </button>
                <div className="flex items-center gap-2">
                  <label className="text-sm">Vitesse:</label>
                  <select
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="px-4 py-2 bg-gray-700 rounded-lg"
                  >
                    <option value="0.5">0.5x</option>
                    <option value="1">1x</option>
                    <option value="2">2x</option>
                    <option value="5">5x</option>
                    <option value="10">10x</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {!animationData && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Charge les pilotes, sélectionne-les et clique sur "Charger" pour voir l'animation !
          </div>
        )}
      </div>
    </div>
  );
}