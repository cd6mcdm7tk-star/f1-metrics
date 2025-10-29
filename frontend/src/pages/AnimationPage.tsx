import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Gauge, Zap, Trophy, Clock, Target, Activity, Circle, Settings, Wind } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import YearSelector from '../components/YearSelector';
import GrandPrixSelector from '../components/GrandPrixSelector';
import SessionSelector from '../components/SessionSelector';
import DriverSelector from '../components/DriverSelector';
import { getDrivers } from '../services/backend.service';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface AnimationPoint {
  driver1: {
    x: number;
    y: number;
    speed: number;
    throttle?: number;
    brake?: boolean;
    gear?: number;
    drs?: number;
  };
  driver2: {
    x: number;
    y: number;
    speed: number;
    throttle?: number;
    brake?: boolean;
    gear?: number;
    drs?: number;
  };
  gap?: number;
  lapNumber?: number;
  time?: number;
}

interface BattleData {
  animation: AnimationPoint[];
  totalLaps?: number;
  totalTime?: number;
  lapTime1?: number;
  lapTime2?: number;
  driver1?: string;
  driver2?: string;
  // ✅ AJOUT : Vrais temps de secteur
  sector1Time1?: number;
  sector2Time1?: number;
  sector3Time1?: number;
  sector1Time2?: number;
  sector2Time2?: number;
  sector3Time2?: number;
}

export default function AnimationPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [sessionType, setSessionType] = useState('Q');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');
  const [loading, setLoading] = useState(false);
  const [battleData, setBattleData] = useState<BattleData | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedGP) {
      loadDrivers();
    }
  }, [selectedGP, sessionType, year]);

  useEffect(() => {
    if (battleData) {
      drawFrame(currentFrame);
    }
  }, [battleData, currentFrame]);

  useEffect(() => {
    if (isPlaying && battleData && battleData.animation && battleData.animation.length > 0) {
      let lastTime = performance.now();
      const animate = (currentTime: number) => {
        const deltaTime = currentTime - lastTime;
        if (deltaTime >= 16) {
          lastTime = currentTime;
          setCurrentFrame((prev) => {
            const maxFrames = battleData.animation.length;
            const next = prev + speed;
            if (next >= maxFrames - 1) {
              setIsPlaying(false);
              return maxFrames - 1;
            }
            return next;
          });
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, speed, battleData]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, sessionType);
      setDrivers(data);
      if (data.length > 0) {
        setDriver1(data[0].abbreviation);
        setDriver2(data[1]?.abbreviation || data[0].abbreviation);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadBattle = async () => {
    if (!driver1 || !driver2) return;
    setLoading(true);
    setBattleData(null);
    setIsPlaying(false);
    setCurrentFrame(0);
    setError(null); // Reset error

    try {
      let data;
      if (sessionType === 'R') {
        const response = await fetch(
          `http://localhost:8000/api/animation-race-full/${year}/${selectedGP}/${driver1}/${driver2}`
        );
        if (!response.ok) {
          throw new Error(`Backend error: ${response.status} - ${response.statusText}`);
        }
        data = await response.json();
      } else {
        const response = await fetch(
          `http://localhost:8000/api/animation-enhanced/${year}/${selectedGP}/${sessionType}/${driver1}/${driver2}`
        );
        if (!response.ok) {
          throw new Error(`Backend error: ${response.status} - ${response.statusText}`);
        }
        data = await response.json();
      }
      
      // Validate data structure before setting
      if (data && data.animation && Array.isArray(data.animation) && data.animation.length > 0) {
        setBattleData(data);
        setError(null); // Clear any previous error
      } else {
        console.error('Invalid battle data structure:', data);
        setBattleData(null);
        setError('No animation data available for this session. Please try a different session or driver combination.');
      }
    } catch (error: any) {
      console.error('Error loading battle:', error);
      setBattleData(null);
      setError(error.message || 'Failed to load animation. The backend might not have data for this race/session.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const drawFrame = (frame: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !battleData || !battleData.animation) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frameInt = Math.floor(frame);
    if (frameInt >= battleData.animation.length) return;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const allPoints = battleData.animation.flatMap(point => [
      { X: point.driver1.x, Y: point.driver1.y },
      { X: point.driver2.x, Y: point.driver2.y }
    ]);

    const minX = Math.min(...allPoints.map(p => p.X));
    const maxX = Math.max(...allPoints.map(p => p.X));
    const minY = Math.min(...allPoints.map(p => p.Y));
    const maxY = Math.max(...allPoints.map(p => p.Y));

    const padding = 80;
    const scaleX = (canvas.width - 2 * padding) / (maxX - minX);
    const scaleY = (canvas.height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);

    const offsetX = (canvas.width - (maxX - minX) * scale) / 2;
    const offsetY = (canvas.height - (maxY - minY) * scale) / 2;

    // Grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 100;
    for (let x = Math.floor(minX / gridSize) * gridSize; x <= maxX; x += gridSize) {
      const screenX = (x - minX) * scale + offsetX;
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, canvas.height);
      ctx.stroke();
    }
    for (let y = Math.floor(minY / gridSize) * gridSize; y <= maxY; y += gridSize) {
      const screenY = (y - minY) * scale + offsetY;
      ctx.beginPath();
      ctx.moveTo(0, screenY);
      ctx.lineTo(canvas.width, screenY);
      ctx.stroke();
    }

    // Track line
    ctx.strokeStyle = 'rgba(0, 229, 204, 0.15)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let i = 0; i < battleData.animation.length; i++) {
      const point = battleData.animation[i];
      const x = (point.driver1.x - minX) * scale + offsetX;
      const y = (point.driver1.y - minY) * scale + offsetY;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // ✅ CORRECTION FINALE : Décalage basé sur le gap réel qui fluctue
    const currentPoint = battleData.animation[frameInt];
    const currentGap = currentPoint?.gap || 0;
    
    // Calculer la durée moyenne d'une frame en secondes
    // Le backend échantillonne ~500 points sur toute la distance du tour
    const totalFrames = battleData.animation.length;
    const lapTime1 = battleData.lapTime1 || 90;
    const lapTime2 = battleData.lapTime2 || 90;
    const avgLapTime = (lapTime1 + lapTime2) / 2;
    const secondsPerFrame = avgLapTime / totalFrames;
    
    // Convertir le gap en frames
    const frameOffset = Math.round(currentGap / secondsPerFrame);
    
    // Frame pour driver2 basé sur le gap
    // Gap négatif = driver1 plus rapide = driver2 est EN RETARD
    // Gap positif = driver2 plus rapide = driver2 est EN AVANCE
    let driver2Frame = frameInt - frameOffset; // Signe inversé !
    driver2Frame = Math.max(0, Math.min(driver2Frame, battleData.animation.length - 1));
    
    const driver2Point = battleData.animation[driver2Frame];

    // Trail Driver 1
    const trailLength = 30;
    const startIdx1 = Math.max(0, frameInt - trailLength);
    
    for (let i = startIdx1; i <= frameInt; i++) {
      const point = battleData.animation[i];
      const progress = (i - startIdx1) / trailLength;
      const alpha = progress * 0.8;

      const x1 = (point.driver1.x - minX) * scale + offsetX;
      const y1 = (point.driver1.y - minY) * scale + offsetY;
      ctx.fillStyle = `rgba(0, 229, 204, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x1, y1, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Trail Driver 2 (avec décalage basé sur gap)
    const startIdx2 = Math.max(0, driver2Frame - trailLength);
    
    for (let i = startIdx2; i <= driver2Frame; i++) {
      const point = battleData.animation[i];
      const progress = (i - startIdx2) / trailLength;
      const alpha = progress * 0.8;

      const x2 = (point.driver2.x - minX) * scale + offsetX;
      const y2 = (point.driver2.y - minY) * scale + offsetY;
      ctx.fillStyle = `rgba(255, 165, 0, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x2, y2, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // ✅ AFFICHAGE DU LAP en haut à gauche (design épuré)
    if (sessionType === 'R' && battleData.animation[frameInt].lapNumber) {
      const currentLap = battleData.animation[frameInt].lapNumber;
      const totalLaps = battleData.totalLaps || '?';
      
      // Fond glass morphism
      ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
      ctx.fillRect(20, 20, 130, 55);
      
      // Bordure turquoise subtile
      ctx.strokeStyle = '#00E5CC';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(20, 20, 130, 55);
      
      // Texte "LAP"
      ctx.font = 'bold 12px Rajdhani, sans-serif';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'left';
      ctx.fillText('LAP', 32, 42);
      
      // Numéro du lap
      ctx.font = 'bold 26px Rajdhani, sans-serif';
      ctx.fillStyle = '#00E5CC';
      ctx.fillText(`${currentLap}/${totalLaps}`, 32, 66);
    }

    // Current position Driver 1
    const x1 = (currentPoint.driver1.x - minX) * scale + offsetX;
    const y1 = (currentPoint.driver1.y - minY) * scale + offsetY;

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00E5CC';
    ctx.fillStyle = '#00E5CC';
    ctx.beginPath();
    ctx.arc(x1, y1, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0A0A0A';
    ctx.beginPath();
    ctx.arc(x1, y1, 5, 0, Math.PI * 2);
    ctx.fill();

    // Current position Driver 2 (avec décalage basé sur le gap réel)
    const x2 = (driver2Point.driver2.x - minX) * scale + offsetX;
    const y2 = (driver2Point.driver2.y - minY) * scale + offsetY;

    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FFA500';
    ctx.fillStyle = '#FFA500';
    ctx.beginPath();
    ctx.arc(x2, y2, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0A0A0A';
    ctx.beginPath();
    ctx.arc(x2, y2, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;

    // Labels
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#00E5CC';
    ctx.fillText(driver1, x1 + 15, y1 - 10);
    ctx.fillStyle = '#FFA500';
    ctx.fillText(driver2, x2 + 15, y2 - 10);

    // Start line
    const startPoint = battleData.animation[0];
    const startX = (startPoint.driver1.x - minX) * scale + offsetX;
    const startY = (startPoint.driver1.y - minY) * scale + offsetY;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(startX - 20, startY);
    ctx.lineTo(startX + 20, startY);
    ctx.stroke();
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('START', startX + 25, startY + 5);
  };

  const totalFrames = battleData?.animation?.length || 0;
  const progressPercent = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  // ✅ Calculer le frame décalé pour driver2 basé sur le gap réel
  const currentFrameInt = Math.floor(currentFrame);
  const currentPoint = battleData?.animation?.[currentFrameInt];
  const currentGap = currentPoint?.gap || 0;
  
  // Durée moyenne d'une frame (avec vérifications TypeScript)
  const lapTime1 = battleData?.lapTime1 || 90;
  const lapTime2 = battleData?.lapTime2 || 90;
  const avgLapTime = (lapTime1 + lapTime2) / 2;
  const secondsPerFrame = totalFrames > 0 ? avgLapTime / totalFrames : 0.2;
  const frameOffset = Math.round(currentGap / secondsPerFrame);
  
  // Gap négatif = driver1 plus rapide = driver2 EN RETARD (soustraction !)
  const driver2Frame = Math.max(0, Math.min(currentFrameInt - frameOffset, totalFrames - 1));

  // ✅ CORRECTION : Utilisation des vraies données de secteur
  const battleStats = battleData && battleData.animation && battleData.animation.length > 0 ? {
    finalGap: (() => {
      const lastPoint = battleData.animation[battleData.animation.length - 1];
      return lastPoint?.gap !== undefined ? Math.abs(lastPoint.gap).toFixed(3) : 'N/A';
    })(),
    maxSpeed: (() => {
      let max1 = 0, max2 = 0;
      battleData.animation.forEach(point => {
        if (point.driver1.speed > max1) max1 = point.driver1.speed;
        if (point.driver2.speed > max2) max2 = point.driver2.speed;
      });
      return Math.max(max1, max2);
    })(),
    winner: (() => {
      // ✅ CORRECTION : Utiliser les lap times pour déterminer le vainqueur
      if (battleData.lapTime1 && battleData.lapTime2) {
        return battleData.lapTime1 < battleData.lapTime2 ? driver1 : driver2;
      }
      // Fallback sur le gap si pas de lap times
      const lastPoint = battleData.animation[battleData.animation.length - 1];
      if (!lastPoint?.gap) return 'Even';
      return lastPoint.gap < 0 ? driver1 : driver2;
    })(),
    currentSpeed1: battleData.animation[Math.floor(currentFrame)]?.driver1.speed || 0,
    currentSpeed2: battleData.animation[driver2Frame]?.driver2.speed || 0,
    currentGap: battleData.animation[Math.floor(currentFrame)]?.gap || 0,
    throttle1: battleData.animation[Math.floor(currentFrame)]?.driver1.throttle || 0,
    throttle2: battleData.animation[driver2Frame]?.driver2.throttle || 0,
    brake1: battleData.animation[Math.floor(currentFrame)]?.driver1.brake || false,
    brake2: battleData.animation[driver2Frame]?.driver2.brake || false,
    gear1: battleData.animation[Math.floor(currentFrame)]?.driver1.gear || 0,
    gear2: battleData.animation[driver2Frame]?.driver2.gear || 0,
    drs1: battleData.animation[Math.floor(currentFrame)]?.driver1.drs || 0,
    drs2: battleData.animation[driver2Frame]?.driver2.drs || 0,
    
    // ✅ AJOUT : Vrai delta des lap times (pas le gap instantané)
    lapTimeDelta: battleData.lapTime1 && battleData.lapTime2 
      ? Math.abs(battleData.lapTime1 - battleData.lapTime2) 
      : 0,
    
    // ✅ NOUVEAUX TEMPS DE SECTEUR RÉELS
    sector1_1: battleData.sector1Time1 !== undefined ? battleData.sector1Time1.toFixed(3) : 'N/A',
    sector2_1: battleData.sector2Time1 !== undefined ? battleData.sector2Time1.toFixed(3) : 'N/A',
    sector3_1: battleData.sector3Time1 !== undefined ? battleData.sector3Time1.toFixed(3) : 'N/A',
    sector1_2: battleData.sector1Time2 !== undefined ? battleData.sector1Time2.toFixed(3) : 'N/A',
    sector2_2: battleData.sector2Time2 !== undefined ? battleData.sector2Time2.toFixed(3) : 'N/A',
    sector3_2: battleData.sector3Time2 !== undefined ? battleData.sector3Time2.toFixed(3) : 'N/A',
  } : null;

  const deltaGraphData = battleData && battleData.animation && battleData.animation.length > 0 ?
    (() => {
      const slicedData = battleData.animation
        .slice(Math.max(0, Math.floor(currentFrame) - 100), Math.floor(currentFrame) + 1);
      
      // ✅ Normaliser le gap pour qu'il corresponde au vrai delta des lap times
      const lastAnimationGap = battleData.animation[battleData.animation.length - 1]?.gap || 0;
      const trueLapTimeDelta = battleData.lapTime1 && battleData.lapTime2 
        ? Math.abs(battleData.lapTime1 - battleData.lapTime2) 
        : 0;
      
      // Ratio de normalisation
      const normalizationRatio = lastAnimationGap !== 0 
        ? trueLapTimeDelta / Math.abs(lastAnimationGap)
        : 1;
      
      return slicedData.map((point, idx) => ({
        frame: idx,
        gap: (point.gap || 0) * normalizationRatio
      }));
    })()
    : [];

  return (
    <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors group"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            <span className="font-rajdhani font-bold uppercase tracking-wide">Back</span>
          </button>

          <div className="flex items-center gap-3">
            <Activity className="text-metrik-turquoise" size={32} />
            <h1 className="text-4xl font-rajdhani font-black bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent">
              GPS BATTLE ANIMATION
            </h1>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <YearSelector selectedYear={year} onSelectYear={setYear} />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <GrandPrixSelector
              year={year}
              selectedRound={selectedGP}
              onSelect={setSelectedGP}
            />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <SessionSelector
              selectedSession={sessionType}
              onSelectSession={setSessionType}
            />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <DriverSelector
              drivers={drivers}
              selectedDriver={driver1}
              onSelectDriver={setDriver1}
              label="Driver 1"
            />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <DriverSelector
              drivers={drivers}
              selectedDriver={driver2}
              onSelectDriver={setDriver2}
              label="Driver 2"
            />
          </div>
        </div>

        {/* Load Button */}
        <div className="mb-8">
          <button
            onClick={loadBattle}
            disabled={loading || !driver1 || !driver2}
            className="w-full py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-xl hover:shadow-lg hover:shadow-metrik-turquoise/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-rajdhani font-black text-xl uppercase tracking-wider"
          >
            {loading ? 'Loading...' : 'Load Battle Animation'}
          </button>
        </div>

        {/* Error Message */}
        {error && !loading && (
          <div className="mb-8 backdrop-blur-xl bg-red-500/10 border-2 border-red-500/50 rounded-2xl p-6 shadow-lg shadow-red-500/20">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/20 rounded-xl flex-shrink-0">
                <Zap className="text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-rajdhani font-black text-red-400 mb-2 uppercase tracking-wide">
                  Animation Unavailable
                </h3>
                <p className="text-gray-300 font-inter text-sm leading-relaxed">
                  {error}
                </p>
                <p className="text-gray-400 font-inter text-xs mt-3">
                  💡 Try selecting a different session (Qualifying usually works better) or different drivers.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Battle Stats Cards */}
        {battleData && battleStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {/* Winner Card */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-colors">
                  <Trophy className="text-metrik-turquoise" size={24} />
                </div>
              </div>
              <div className="text-3xl font-rajdhani font-black text-white mb-1">
                {battleStats.winner}
              </div>
              <div className="text-sm text-metrik-silver font-inter uppercase tracking-wide">
                Leader
              </div>
            </div>

            {/* Gap Card */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-colors">
                  <Target className="text-metrik-turquoise" size={24} />
                </div>
              </div>
              <div className="text-3xl font-rajdhani font-black text-white mb-1">
                {battleStats.lapTimeDelta.toFixed(3)}s
              </div>
              <div className="text-sm text-metrik-silver font-inter uppercase tracking-wide">
                Gap
              </div>
            </div>

            {/* Max Speed Card */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-colors">
                  <Zap className="text-metrik-turquoise" size={24} />
                </div>
              </div>
              <div className="text-3xl font-rajdhani font-black text-white mb-1">
                {Math.round(battleStats.maxSpeed)}
              </div>
              <div className="text-sm text-metrik-silver font-inter uppercase tracking-wide">
                Max Speed (km/h)
              </div>
            </div>

            {/* Total Laps / Time */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300 hover:scale-105 group">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-metrik-turquoise/20 rounded-xl group-hover:bg-metrik-turquoise/30 transition-colors">
                  <Clock className="text-metrik-turquoise" size={24} />
                </div>
              </div>
              <div className="text-3xl font-rajdhani font-black text-white mb-1">
                {sessionType === 'R' ? battleData.totalLaps || 'N/A' : '1'}
              </div>
              <div className="text-sm text-metrik-silver font-inter uppercase tracking-wide">
                {sessionType === 'R' ? 'Total Laps' : 'Lap'}
              </div>
            </div>
          </div>
        )}

        {battleData && (
          <div className="space-y-6">
            {/* Main Grid: Canvas + Real-Time Telemetry Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Canvas - Takes 2 columns */}
              <div className="lg:col-span-2">
                <div className="backdrop-blur-xl bg-metrik-black/95 border-2 border-metrik-turquoise/40 rounded-2xl p-4 shadow-2xl shadow-metrik-turquoise/30">
                  <canvas
                    ref={canvasRef}
                    width={1200}
                    height={800}
                    className="w-full h-auto rounded-xl bg-metrik-black"
                  />
                </div>
              </div>

              {/* Real-Time Telemetry Panel - Takes 1 column */}
              <div className="space-y-4">
                {/* Telemetry Cards Grid */}
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-4 shadow-lg shadow-metrik-turquoise/20">
                  <h3 className="text-sm font-rajdhani font-bold text-metrik-turquoise mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    REAL-TIME TELEMETRY
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Throttle 1 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        <div className="text-xs text-gray-500">{driver1} Throttle</div>
                      </div>
                      <div className="text-2xl font-rajdhani font-black text-cyan-400">
                        {Math.round(battleStats?.throttle1 || 0)}%
                      </div>
                      <div className="mt-2 h-2 bg-metrik-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all duration-100"
                          style={{ width: `${battleStats?.throttle1 || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Throttle 2 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Gauge className="w-4 h-4 text-orange-400" />
                        <div className="text-xs text-gray-500">{driver2} Throttle</div>
                      </div>
                      <div className="text-2xl font-rajdhani font-black text-orange-400">
                        {Math.round(battleStats?.throttle2 || 0)}%
                      </div>
                      <div className="mt-2 h-2 bg-metrik-black/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-orange-500 to-orange-400 transition-all duration-100"
                          style={{ width: `${battleStats?.throttle2 || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Brake 1 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className="w-4 h-4 text-cyan-400" />
                        <div className="text-xs text-gray-500">{driver1} Brake</div>
                      </div>
                      <div className={`text-2xl font-rajdhani font-black ${battleStats?.brake1 ? 'text-red-500' : 'text-gray-600'}`}>
                        {battleStats?.brake1 ? 'ON' : 'OFF'}
                      </div>
                      {battleStats?.brake1 && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>

                    {/* Brake 2 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Circle className="w-4 h-4 text-orange-400" />
                        <div className="text-xs text-gray-500">{driver2} Brake</div>
                      </div>
                      <div className={`text-2xl font-rajdhani font-black ${battleStats?.brake2 ? 'text-red-500' : 'text-gray-600'}`}>
                        {battleStats?.brake2 ? 'ON' : 'OFF'}
                      </div>
                      {battleStats?.brake2 && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      )}
                    </div>

                    {/* Gear 1 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-cyan-400" />
                        <div className="text-xs text-gray-500">{driver1} Gear</div>
                      </div>
                      <div className="text-2xl font-rajdhani font-black text-cyan-400">
                        {battleStats?.gear1 || 'N'}
                      </div>
                    </div>

                    {/* Gear 2 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Settings className="w-4 h-4 text-orange-400" />
                        <div className="text-xs text-gray-500">{driver2} Gear</div>
                      </div>
                      <div className="text-2xl font-rajdhani font-black text-orange-400">
                        {battleStats?.gear2 || 'N'}
                      </div>
                    </div>

                    {/* DRS 1 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-cyan-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind className="w-4 h-4 text-cyan-400" />
                        <div className="text-xs text-gray-500">{driver1} DRS</div>
                      </div>
                      <div className={`text-xl font-rajdhani font-black ${(battleStats?.drs1 && battleStats.drs1 > 0) ? 'text-green-500' : 'text-gray-600'}`}>
                        {(battleStats?.drs1 && battleStats.drs1 > 0) ? 'ACTIVE' : 'OFF'}
                      </div>
                      {battleStats?.drs1 && battleStats.drs1 > 0 && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>

                    {/* DRS 2 */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-orange-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind className="w-4 h-4 text-orange-400" />
                        <div className="text-xs text-gray-500">{driver2} DRS</div>
                      </div>
                      <div className={`text-xl font-rajdhani font-black ${(battleStats?.drs2 && battleStats.drs2 > 0) ? 'text-green-500' : 'text-gray-600'}`}>
                        {(battleStats?.drs2 && battleStats.drs2 > 0) ? 'ACTIVE' : 'OFF'}
                      </div>
                      {battleStats?.drs2 && battleStats.drs2 > 0 && (
                        <div className="mt-2 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Sector Times - ✅ CORRECTION APPLIQUÉE */}
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-4 shadow-lg shadow-metrik-turquoise/20">
                  <h3 className="text-sm font-rajdhani font-bold text-metrik-turquoise mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    SECTOR TIMES
                  </h3>
                  <div className="space-y-3">
                    {/* Driver 1 Sectors */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-cyan-500/20">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        {driver1}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs text-gray-600">S1</div>
                          <div className="text-sm font-rajdhani font-bold text-cyan-400">
                            {battleStats?.sector1_1}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">S2</div>
                          <div className="text-sm font-rajdhani font-bold text-cyan-400">
                            {battleStats?.sector2_1}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">S3</div>
                          <div className="text-sm font-rajdhani font-bold text-cyan-400">
                            {battleStats?.sector3_1}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Driver 2 Sectors */}
                    <div className="bg-metrik-black/30 rounded-lg p-3 border border-orange-500/20">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        {driver2}
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-xs text-gray-600">S1</div>
                          <div className="text-sm font-rajdhani font-bold text-orange-400">
                            {battleStats?.sector1_2}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">S2</div>
                          <div className="text-sm font-rajdhani font-bold text-orange-400">
                            {battleStats?.sector2_2}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600">S3</div>
                          <div className="text-sm font-rajdhani font-bold text-orange-400">
                            {battleStats?.sector3_2}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Delta Graph */}
                {deltaGraphData.length > 0 && (
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-4 shadow-lg shadow-metrik-turquoise/20">
                    <h3 className="text-sm font-rajdhani font-bold text-metrik-turquoise mb-4 uppercase tracking-wider flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      GAP EVOLUTION
                    </h3>
                    <ResponsiveContainer width="100%" height={150}>
                      <LineChart data={deltaGraphData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis
                          dataKey="frame"
                          stroke="#666"
                          tick={{ fontSize: 10 }}
                          hide
                        />
                        <YAxis
                          stroke="#666"
                          tick={{ fontSize: 10 }}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '1px solid #00E5CC',
                            borderRadius: '8px'
                          }}
                          labelStyle={{ color: '#00E5CC' }}
                          formatter={(value: number) => [`${value.toFixed(3)}s`, 'Gap']}
                        />
                        <Line
                          type="monotone"
                          dataKey="gap"
                          stroke="#00E5CC"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, fill: '#00E5CC' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Driver Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Driver 1 Card */}
              <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-metrik-black/95 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-lg shadow-cyan-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-rajdhani font-black text-cyan-400">
                      {driver1}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">
                      Driver 1
                    </div>
                  </div>
                  <div className="p-4 bg-cyan-500/20 rounded-xl">
                    <Gauge className="text-cyan-400" size={32} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                    <span className="text-gray-400">Current Speed</span>
                    <span className="text-2xl font-rajdhani font-black text-white">
                      {Math.round(battleStats?.currentSpeed1 || 0)} km/h
                    </span>
                  </div>
                  {battleData.lapTime1 && (
                    <div className="flex justify-between items-center py-2 border-b border-cyan-500/10">
                      <span className="text-gray-400">Lap Time</span>
                      <span className="text-xl font-rajdhani font-bold text-cyan-400">
                        {battleData.lapTime1.toFixed(3)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Driver 2 Card */}
              <div className="backdrop-blur-xl bg-gradient-to-br from-orange-500/10 to-metrik-black/95 border-2 border-orange-500/50 rounded-2xl p-6 shadow-lg shadow-orange-500/20">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-3xl font-rajdhani font-black text-orange-400">
                      {driver2}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">
                      Driver 2
                    </div>
                  </div>
                  <div className="p-4 bg-orange-500/20 rounded-xl">
                    <Gauge className="text-orange-400" size={32} />
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-orange-500/10">
                    <span className="text-gray-400">Current Speed</span>
                    <span className="text-2xl font-rajdhani font-black text-white">
                      {Math.round(battleStats?.currentSpeed2 || 0)} km/h
                    </span>
                  </div>
                  {battleData.lapTime2 && (
                    <div className="flex justify-between items-center py-2 border-b border-orange-500/10">
                      <span className="text-gray-400">Lap Time</span>
                      <span className="text-xl font-rajdhani font-bold text-orange-400">
                        {battleData.lapTime2.toFixed(3)}s
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-rajdhani font-bold text-metrik-silver">
                  Frame {Math.floor(currentFrame)} / {totalFrames}
                </span>
                <span className="text-sm font-rajdhani font-bold text-metrik-turquoise">
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 bg-metrik-black/50 rounded-full overflow-hidden border border-metrik-turquoise/30">
                <div
                  className="h-full bg-gradient-to-r from-metrik-turquoise to-cyan-500 transition-all duration-100 shadow-lg shadow-metrik-turquoise/50"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Controls */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
              <div className="flex items-center justify-center gap-6 flex-wrap">
                <button
                  onClick={handleReset}
                  className="p-3 bg-metrik-turquoise/20 hover:bg-metrik-turquoise/30 text-metrik-turquoise rounded-xl transition-all duration-300 hover:scale-110"
                  title="Reset"
                >
                  <RotateCcw size={24} />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="px-8 py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-xl hover:shadow-lg hover:shadow-metrik-turquoise/50 transition-all duration-300 hover:scale-110 font-rajdhani font-black uppercase tracking-wider flex items-center gap-2"
                >
                  {isPlaying ? (
                    <>
                      <Pause size={20} />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play size={20} />
                      Play
                    </>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  <span className="text-metrik-silver font-rajdhani font-bold uppercase tracking-wider">Speed:</span>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-4 py-2 rounded-xl font-rajdhani font-bold transition-all duration-300 ${
                          speed === s
                            ? 'bg-metrik-turquoise text-metrik-black shadow-lg shadow-metrik-turquoise/50'
                            : 'bg-metrik-turquoise/20 text-metrik-turquoise hover:bg-metrik-turquoise/30'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
            <div className="w-20 h-20 border-4 border-metrik-turquoise/20 border-t-metrik-turquoise rounded-full animate-spin mb-6" />
            <p className="text-metrik-silver font-rajdhani text-xl">Loading Battle Animation...</p>
          </div>
        )}

        {!loading && !battleData && (
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
            <Gauge className="text-metrik-silver/50 mb-6" size={64} />
            <p className="text-metrik-silver font-rajdhani text-xl text-center">
              Select drivers and click "Load Battle Animation" to start
            </p>
          </div>
        )}
      </div>
    </div>
  );
}