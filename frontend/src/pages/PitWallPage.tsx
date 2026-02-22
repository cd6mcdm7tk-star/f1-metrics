import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { ArrowLeft, Loader2, Play, Pause, RotateCcw, Radio, Flag, Clock, TrendingUp, Zap, Target, XCircle, CloudRain, Cloud, Sun, Wrench, Wind, ArrowUp, ArrowDown, Route, Users, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrandPrixSelector from '../components/GrandPrixSelector';
import { getRaceData, getPitStops, getRaceEvents, getPositionEvolution, getStrategyComparison } from '../services/backend.service';
import type { RaceData, PitStopsData, RaceEventsData, DriverPosition, PositionEvolution, StrategyComparison } from '../types/pitwall';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import YearSelector from '../components/YearSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonChart from '../components/SkeletonChart';
import { MobileResponsiveChart } from '../components/MobileResponsiveChart';
import { useSubscription } from '../hooks/useSubscription';
import UpgradeModal from '../components/UpgradeModal';

export default function PitWallPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [hoveredGraph, setHoveredGraph] = useState<string | null>(null);

  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [pitStopsData, setPitStopsData] = useState<PitStopsData | null>(null);
  const [eventsData, setEventsData] = useState<RaceEventsData | null>(null);
  const [positionEvolution, setPositionEvolution] = useState<PositionEvolution | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyComparison | null>(null);

  const [currentLap, setCurrentLap] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const { canAccessYear, isPremium, canMakeRequest, incrementRequest } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (isPlaying && raceData) {
      const interval = setInterval(() => {
        setCurrentLap((prev) => {
          if (prev >= raceData.totalLaps - 1) {
            setIsPlaying(false);
            return raceData.totalLaps - 1;
          }
          return prev + 1;
        });
      }, 1000 / speed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, speed, raceData]);

  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // 🔥 AUTO-LOAD: Charger automatiquement les données quand year ou selectedGP change
  useEffect(() => {
    if (year && selectedGP) {
      loadRaceData();
    }
  }, [year, selectedGP]);

  const loadRaceData = async () => {
    if (!canMakeRequest) {
      setShowUpgradeModal(true);
      return;
    }
    
    setLoading(true);
    try {
      const [race, pitStops, events, positions, strategy] = await Promise.all([
        getRaceData(year, selectedGP),
        getPitStops(year, selectedGP),
        getRaceEvents(year, selectedGP),
        getPositionEvolution(year, selectedGP),
        getStrategyComparison(year, selectedGP)
      ]);
      setRaceData(race);
      setPitStopsData(pitStops);
      setEventsData(events);
      setPositionEvolution(positions);
      setStrategyData(strategy);
      setCurrentLap(0);
      setIsPlaying(false);
      incrementRequest();
    } catch (error) {
      console.error('Error loading race data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayPause = () => setIsPlaying(!isPlaying);
  
  const handleReset = () => {
    setCurrentLap(0);
    setIsPlaying(false);
  };

  const getCurrentPositions = (): DriverPosition[] => {
    if (!raceData || currentLap >= raceData.raceData.length) return [];
    return raceData.raceData[currentLap].positions;
  };

  const getPitStopsForLap = (lap: number) => {
    if (!pitStopsData) return [];
    return pitStopsData.pitStops.filter(ps => ps.lap === lap + 1);
  };

  const getEventsForLap = (lap: number) => {
    if (!eventsData) return [];
    return eventsData.events.filter(e => e.lap === lap + 1);
  };

  const getCompoundColor = (compound: string): string => {
    switch (compound.toUpperCase()) {
      case 'SOFT': return '#ff0000';
      case 'MEDIUM': return '#ffd700';
      case 'HARD': return '#ffffff';
      case 'INTERMEDIATE': return '#00ff00';
      case 'WET': return '#0000ff';
      default: return '#888888';
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-400';
      case 'high': return 'bg-orange-500/20 border-orange-500/50 text-orange-400';
      case 'medium': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-400';
      case 'info': return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      default: return 'bg-metrik-silver/20 border-metrik-silver/50 text-metrik-silver';
    }
  };

  const formatLapTime = (seconds: number | null): string => {
    if (!seconds) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getDriverAbbr = (fullName: string): string => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[parts.length - 1].substring(0, 3).toUpperCase();
    }
    return fullName.substring(0, 3).toUpperCase();
  };

  const getTeamColor = (team: string): string => {
    const teamLower = team.toLowerCase();
    if (teamLower.includes('red bull')) return '#3671C6';
    if (teamLower.includes('ferrari')) return '#E8002D';
    if (teamLower.includes('mercedes')) return '#27F4D2';
    if (teamLower.includes('mclaren')) return '#FF8000';
    if (teamLower.includes('aston')) return '#229971';
    if (teamLower.includes('alpine')) return '#FF87BC';
    if (teamLower.includes('williams')) return '#64C4FF';
    if (teamLower.includes('alphatauri') || teamLower.includes('visa') || teamLower.includes('rb f1')) return '#6692FF';
    if (teamLower.includes('alfa') || teamLower.includes('sauber') || teamLower.includes('kick')) return '#52E252';
    if (teamLower.includes('haas')) return '#B6BABD';
    return '#FFFFFF';
  };

  const detectOvertakes = (currentLap: number): Array<{driver: string, oldPos: number, newPos: number}> => {
    if (!raceData || currentLap === 0) return [];
    const prevPositions = raceData.raceData[currentLap - 1]?.positions || [];
    const currPositions = raceData.raceData[currentLap]?.positions || [];
    const overtakes: Array<{driver: string, oldPos: number, newPos: number}> = [];
    
    currPositions.forEach(curr => {
      const prev = prevPositions.find(p => p.driver === curr.driver);
      if (prev && prev.position > curr.position) {
        overtakes.push({
          driver: curr.driver,
          oldPos: prev.position,
          newPos: curr.position
        });
      }
    });
    
    return overtakes;
  };

  const hasDRS = (position: number, gap: number): boolean => {
    return position > 1 && gap < 1.0;
  };

  const statsData = raceData && pitStopsData && eventsData ? {
    dnfCount: (() => {
      if (!eventsData) return 0;
      return eventsData.events.filter(e => 
        e.severity === 'critical' && 
        (e.type.toLowerCase().includes('dnf') || 
         e.type.toLowerCase().includes('retirement') ||
         e.type.toLowerCase().includes('accident') ||
         e.description.toLowerCase().includes('retire'))
      ).length;
    })(),
    
    fastestLap: (() => {
      if (!raceData || raceData.raceData.length === 0) return { time: null, driver: null };
      let bestTime = Infinity;
      let bestDriver = null;
      
      raceData.raceData.forEach(lap => {
        lap.positions.forEach(pos => {
          if (pos.lapTime && pos.lapTime > 0 && pos.lapTime < bestTime) {
            bestTime = pos.lapTime;
            bestDriver = pos.driver;
          }
        });
      });
      
      return {
        time: bestTime === Infinity ? null : bestTime,
        driver: bestDriver
      };
    })(),
    
    weather: (() => {
      if (!pitStopsData) return 'Dry';
      const compounds = pitStopsData.pitStops.map(ps => ps.compound.toUpperCase());
      if (compounds.some(c => c === 'WET')) return 'Wet';
      if (compounds.some(c => c === 'INTERMEDIATE')) return 'Mixed';
      return 'Dry';
    })()
  } : null;

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'Wet':
        return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'Mixed':
        return <Cloud className="w-4 h-4 text-gray-400" />;
      default:
        return <Sun className="w-4 h-4 text-yellow-400" />;
    }
  };

  const currentPositions = getCurrentPositions();
  const currentPitStops = getPitStopsForLap(currentLap);
  const currentEvents = getEventsForLap(currentLap);
  const currentOvertakes = detectOvertakes(currentLap);

  const calculateCumulativeGaps = (): Map<string, number> => {
    if (!raceData || currentLap >= raceData.raceData.length) return new Map();
    
    const gaps = new Map<string, number>();
    const leaderDriver = currentPositions.find(p => p.position === 1)?.driver;
    if (!leaderDriver) return gaps;
    
    currentPositions.forEach(pos => {
      if (pos.position === 1) {
        gaps.set(pos.driver, 0);
        return;
      }
      
      let driverTotalTime = 0;
      let leaderTotalTime = 0;
      
      for (let i = 0; i <= currentLap; i++) {
        const lapData = raceData.raceData[i];
        if (!lapData) continue;
        
        const driverLap = lapData.positions.find(p => p.driver === pos.driver);
        const leaderLap = lapData.positions.find(p => p.driver === leaderDriver);
        
        if (driverLap?.lapTime && driverLap.lapTime > 0) {
          driverTotalTime += driverLap.lapTime;
        }
        if (leaderLap?.lapTime && leaderLap.lapTime > 0) {
          leaderTotalTime += leaderLap.lapTime;
        }
      }
      
      const gap = driverTotalTime > 0 && leaderTotalTime > 0 
        ? driverTotalTime - leaderTotalTime 
        : pos.position * 0.5;
      
      gaps.set(pos.driver, Math.max(0, gap));
    });
    
    return gaps;
  };

  const cumulativeGaps = calculateCumulativeGaps();
  const maxGap = Math.max(...Array.from(cumulativeGaps.values()), 10);

  return (
    <div className="min-h-screen bg-metrik-black text-white">
      {/* Fixed Header - Compact */}
      <div className="fixed top-0 left-0 right-0 bg-metrik-black/95 backdrop-blur-xl border-b border-metrik-turquoise/20 z-50">
        <div className="max-w-[1920px] mx-auto px-6 py-3">
          {/* Title + Back Button */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-metrik-turquoise hover:text-white transition-colors font-rajdhani font-bold"
            >
              <ArrowLeft size={20} />
              <span className="uppercase text-sm">Back</span>
            </button>
            
            <h1 className="text-3xl font-rajdhani font-black tracking-tight text-white">
              PIT WALL
              <span className="text-lg text-metrik-turquoise ml-3">COMMAND CENTER</span>
            </h1>
            
            <div className="w-24" />
          </div>

          {/* Selectors + Stats Cards Row */}
          <div className="flex items-center gap-3">
            {/* Selectors */}
            <div className="flex items-center gap-2">
              <YearSelector selectedYear={year} onSelectYear={setYear} />
              <GrandPrixSelector
                year={year}
                selectedRound={selectedGP}
                onSelect={setSelectedGP}
              />
              
              {/* Loading Indicator */}
              {loading && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded-lg">
                  <Loader2 className="animate-spin w-4 h-4 text-metrik-turquoise" />
                  <span className="text-xs font-rajdhani font-bold text-metrik-turquoise uppercase">Loading Race Data...</span>
                </div>
              )}
            </div>

            {/* Mini Stats Cards */}
            {raceData && (
              <div className="flex items-center gap-2 ml-auto">
                <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/20 rounded-lg px-3 py-1.5">
                  <div className="text-[10px] text-gray-400 uppercase">Laps</div>
                  <div className="text-lg font-rajdhani font-black text-white">{raceData.totalLaps}</div>
                </div>

                <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/20 rounded-lg px-3 py-1.5">
                  <div className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
                    <TrendingUp size={10} />
                    Fastest
                  </div>
                  {statsData?.fastestLap.time ? (
                    <div className="text-sm font-rajdhani font-black text-metrik-turquoise">
                      {formatLapTime(statsData.fastestLap.time)}
                    </div>
                  ) : (
                    <div className="text-sm font-rajdhani font-black text-gray-500">--</div>
                  )}
                </div>

                <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/20 rounded-lg px-3 py-1.5">
                  <div className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
                    <XCircle size={10} />
                    DNFs
                  </div>
                  <div className="text-lg font-rajdhani font-black text-white">
                    {statsData?.dnfCount || 0}
                  </div>
                </div>

                <div className="backdrop-blur-xl bg-metrik-card/80 border border-metrik-turquoise/20 rounded-lg px-3 py-1.5">
                  <div className="text-[10px] text-gray-400 uppercase flex items-center gap-1">
                    {statsData && getWeatherIcon(statsData.weather)}
                    Weather
                  </div>
                  <div className="text-sm font-rajdhani font-black text-white">
                    {statsData?.weather || 'N/A'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Playback Controls - Ultra Compact */}
          {raceData && (
            <div className="mt-3 backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/20 rounded-lg p-3">
              <div className="flex items-center gap-4">
                {/* Lap Display */}
                <div className="flex items-center gap-2">
                  <div className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                    {currentLap + 1}
                  </div>
                  <div className="text-lg text-gray-500 font-rajdhani">/</div>
                  <div className="text-xl font-rajdhani font-black text-white">
                    {raceData.totalLaps}
                  </div>
                </div>

                {/* Controls - Plus visibles */}
                <button
                  onClick={handleReset}
                  className="p-2 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-lg hover:bg-metrik-turquoise/20 hover:scale-110 transition-all"
                  title="Reset"
                >
                  <RotateCcw size={18} className="text-white" />
                </button>

                <button
                  onClick={handlePlayPause}
                  className="p-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-lg hover:shadow-lg hover:shadow-metrik-turquoise/50 hover:scale-110 transition-all"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause size={22} className="text-white" /> : <Play size={22} className="text-white" />}
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-xs font-rajdhani font-bold">Speed:</span>
                  {[0.5, 1, 2, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2.5 py-1.5 text-xs rounded font-rajdhani font-bold transition-all hover:scale-110 ${
                        speed === s
                          ? 'bg-metrik-turquoise text-metrik-black shadow-lg shadow-metrik-turquoise/30'
                          : 'bg-metrik-black/50 text-gray-400 hover:bg-metrik-turquoise/20'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>

                {/* Progress Bar */}
                <div className="flex-1">
                  <input
                    type="range"
                    min="0"
                    max={raceData.totalLaps - 1}
                    value={currentLap}
                    onChange={(e) => setCurrentLap(parseInt(e.target.value))}
                    className="w-full h-2 bg-metrik-black/50 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                             [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-metrik-turquoise
                             [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-metrik-turquoise/50
                             hover:[&::-webkit-slider-thumb]:scale-125 [&::-webkit-slider-thumb]:transition-transform"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Grid 2x2 */}
      <div className="pt-[200px] px-6 pb-6">
        <div className="max-w-[1920px] mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-[calc(100vh-220px)]">
              <div className="text-center">
                {/* Circular Progress */}
                <div className="relative w-32 h-32 mx-auto mb-6">
                  {/* Background Circle */}
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="rgba(0, 210, 190, 0.1)"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress Circle */}
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray="351.86"
                      strokeDashoffset="0"
                      className="transition-all duration-500 ease-out"
                      style={{
                        animation: 'progressAnimation 2s ease-in-out forwards'
                      }}
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00D2BE" />
                        <stop offset="100%" stopColor="#00FFF0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Percentage Text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-3xl font-rajdhani font-black text-metrik-turquoise animate-pulse">
                        <span className="loading-percentage">0</span>%
                      </div>
                      <div className="text-xs text-gray-500 font-rajdhani font-bold uppercase mt-1">
                        Loading
                      </div>
                    </div>
                  </div>
                </div>

                {/* Loading Text */}
                <div className="space-y-2">
                  <div className="text-lg font-rajdhani font-bold text-white animate-pulse">
                    Loading Race Data
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <div className="w-2 h-2 bg-metrik-turquoise rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-metrik-turquoise rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-metrik-turquoise rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          ) : !raceData ? (
            <div className="flex items-center justify-center h-[calc(100vh-220px)]">
              <div className="text-center text-gray-500">
                <Flag size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg font-rajdhani mb-2">Select a Grand Prix to view race data</p>
                <p className="text-sm font-inter text-gray-600">Data will load automatically</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 grid-rows-[65%_35%] gap-4" style={{ height: 'calc(100vh - 220px)' }}>
              {/* TOP LEFT - POSITIONS EVOLUTION (Live Data - Principal) */}
              <div
                className={`group relative backdrop-blur-xl bg-metrik-card/95 border rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                  hoveredGraph === 'positions'
                    ? 'scale-[1.05] z-10 border-metrik-turquoise shadow-2xl shadow-metrik-turquoise/50'
                    : hoveredGraph
                    ? 'opacity-60 scale-[0.97] border-metrik-turquoise/20'
                    : 'border-metrik-turquoise/30 shadow-metrik-turquoise/20'
                }`}
                onMouseEnter={() => setHoveredGraph('positions')}
                onMouseLeave={() => setHoveredGraph(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-metrik-turquoise/5 to-transparent pointer-events-none" />
                
                {/* Header */}
                <div className="sticky top-0 bg-metrik-card/95 backdrop-blur-xl border-b border-metrik-turquoise/20 px-4 py-3 z-10">
                  <h2 className="text-xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2 uppercase">
                    <Users size={20} />
                    Position Evolution
                    <span className="ml-auto text-xs font-inter text-gray-500 normal-case">Live Data</span>
                  </h2>
                </div>

                {/* Content */}
                <div className="p-4 h-[calc(100%-60px)] overflow-y-auto custom-scrollbar">
                  {positionEvolution && positionEvolution.drivers.length > 0 ? (
                    <div className="relative h-full">
                      {(() => {
                        const currentEvolution = positionEvolution.evolution[currentLap];
                        const prevEvolution = currentLap > 0 ? positionEvolution.evolution[currentLap - 1] : null;
                        
                        const driversWithPositions = positionEvolution.drivers
                          .map(driver => ({
                            driver,
                            position: currentEvolution?.[driver] || 999,
                            prevPosition: prevEvolution?.[driver] || 999,
                            team: (positionEvolution as any).teams?.[driver] || 'Unknown'
                          }))
                          .filter(d => d.position !== 999 && d.position !== null && d.position !== undefined)
                          .sort((a, b) => a.position - b.position)
                          .slice(0, 10);
                        
                        const currentTop10 = driversWithPositions.map(d => d.driver);
                        const chartData = positionEvolution.evolution.slice(0, currentLap + 1);

                        // Vérifier si on a des données valides
                        if (driversWithPositions.length === 0 || chartData.length === 0) {
                          return (
                            <div className="flex items-center justify-center h-full text-gray-500">
                              <div className="text-center">
                                <Users size={32} className="mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No valid position data for this lap</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <>
                            {/* Driver Labels */}
                            <div className="absolute left-0 top-0 w-20 h-full pointer-events-none z-10">
                              {driversWithPositions.map((driverData) => {
                                const { driver, position, prevPosition, team } = driverData;
                                const posChange = prevPosition !== 999 ? prevPosition - position : 0;
                                
                                const chartHeight = 500;
                                const marginTop = 20;
                                const marginBottom = 20;
                                const effectiveHeight = chartHeight - marginTop - marginBottom;
                                
                                const positionRatio = (position - 1) / (20 - 1);
                                const yPixels = marginTop + (positionRatio * effectiveHeight);
                                const yPercent = (yPixels / chartHeight) * 100;
                                
                                const teamColor = getTeamColor(team);

                                return (
                                  <div 
                                    key={driver} 
                                    className="absolute left-0 flex items-center gap-1.5 transition-all duration-700 ease-in-out"
                                    style={{ 
                                      top: `${yPercent}%`, 
                                      transform: 'translateY(-50%)'
                                    }}
                                  >
                                    <div 
                                      className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-rajdhani font-black shadow-lg"
                                      style={{ 
                                        backgroundColor: teamColor,
                                        color: teamColor === '#FFFFFF' || teamColor === '#64C4FF' || teamColor === '#27F4D2' ? '#000' : '#FFF',
                                        boxShadow: `0 0 8px ${teamColor}80`
                                      }}
                                    >
                                      {position}
                                    </div>
                                    
                                    <span 
                                      className="text-xs font-rajdhani font-black drop-shadow-lg"
                                      style={{ color: teamColor }}
                                    >
                                      {getDriverAbbr(driver)}
                                    </span>
                                    
                                    {posChange > 0 && (
                                      <div className="flex items-center gap-0.5 text-green-400">
                                        <ArrowUp size={10} />
                                        <span className="text-[10px] font-rajdhani font-black">+{posChange}</span>
                                      </div>
                                    )}
                                    {posChange < 0 && (
                                      <div className="flex items-center gap-0.5 text-red-400">
                                        <ArrowDown size={10} />
                                        <span className="text-[10px] font-rajdhani font-black">{Math.abs(posChange)}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Chart */}
                            <div className="pl-[90px] h-full">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart
                                  data={chartData}
                                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                  <CartesianGrid
                                    strokeDasharray="3 3"
                                    stroke="rgba(20, 184, 166, 0.1)"
                                    vertical={false}
                                  />
                                  <XAxis
                                    dataKey="lap"
                                    stroke="#14b8a6"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Rajdhani' }}
                                  />
                                  <YAxis
                                    reversed
                                    domain={[1, 12]}
                                    ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]}
                                    stroke="#14b8a6"
                                    tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'Rajdhani' }}
                                  />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                      border: '1px solid rgba(20, 184, 166, 0.3)',
                                      borderRadius: '8px',
                                      backdropFilter: 'blur(12px)',
                                      fontFamily: 'Rajdhani',
                                      fontSize: '12px'
                                    }}
                                    labelStyle={{ color: '#14b8a6', fontWeight: 'bold' }}
                                    formatter={(value: any, name: string) => {
                                      // Filtrer les NaN
                                      if (value === null || value === undefined || isNaN(value)) {
                                        return ['--', getDriverAbbr(name)];
                                      }
                                      return [`P${value}`, getDriverAbbr(name)];
                                    }}
                                  />
                                  {currentTop10.map((driver) => {
                                    const driverInfo = driversWithPositions.find(d => d.driver === driver);
                                    const teamColor = driverInfo ? getTeamColor(driverInfo.team) : '#FFFFFF';
                                    
                                    return (
                                      <Line
                                        key={driver}
                                        type="monotone"
                                        dataKey={driver}
                                        stroke={teamColor}
                                        strokeWidth={2.5}
                                        dot={false}
                                        activeDot={{ r: 5, fill: teamColor, strokeWidth: 0 }}
                                        connectNulls={true}
                                        animationDuration={1000 / speed}
                                        animationEasing="linear"
                                        isAnimationActive={isPlaying}
                                      />
                                    );
                                  })}
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No position data available
                    </div>
                  )}
                </div>
              </div>

              {/* TOP RIGHT - RACE PROGRESSION (Live Data - Principal) */}
              <div
                className={`group relative backdrop-blur-xl bg-metrik-card/95 border rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                  hoveredGraph === 'race'
                    ? 'scale-[1.05] z-10 border-metrik-turquoise shadow-2xl shadow-metrik-turquoise/50'
                    : hoveredGraph
                    ? 'opacity-60 scale-[0.97] border-metrik-turquoise/20'
                    : 'border-metrik-turquoise/30 shadow-metrik-turquoise/20'
                }`}
                onMouseEnter={() => setHoveredGraph('race')}
                onMouseLeave={() => setHoveredGraph(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-metrik-turquoise/5 to-transparent pointer-events-none" />
                
                {/* Header */}
                <div className="sticky top-0 bg-metrik-card/95 backdrop-blur-xl border-b border-metrik-turquoise/20 px-4 py-3 z-10">
                  <h2 className="text-xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2 uppercase">
                    <Route size={20} />
                    Race Progression
                    <span className="ml-auto text-xs font-inter text-gray-500 normal-case">Live Data</span>
                  </h2>
                </div>

                {/* Content */}
                <div className="p-4 h-[calc(100%-60px)] overflow-y-auto custom-scrollbar">
                  {currentPositions.length > 0 ? (
                    <div className="space-y-1.5">
                      {currentPositions.slice(0, 10).map((pos) => {
                        const gap = cumulativeGaps.get(pos.driver) || 0;
                        const percentage = maxGap > 0 ? Math.min((gap / maxGap) * 100, 100) : 0;
                        const inBattle = pos.position > 1 && gap < 2.0;
                        const drsEnabled = hasDRS(pos.position, gap);
                        const isOvertaking = currentOvertakes.some(ot => ot.driver === pos.driver);
                        const hasPitStop = currentPitStops.some(ps => ps.driver === pos.driver);

                        return (
                          <div key={pos.driver} className="relative">
                            {/* Track avec infos intégrées */}
                            <div className={`relative h-12 rounded-lg overflow-hidden ${
                              inBattle ? 'bg-red-500/10 border-2 border-red-500/30' : 'bg-metrik-black/30 border border-metrik-turquoise/20'
                            }`}>
                              <div className="absolute inset-0 bg-gradient-to-r from-metrik-turquoise/20 via-metrik-turquoise/10 to-transparent" />
                              
                              {/* Driver Info - Left Side INSIDE card */}
                              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-10">
                                <div className={`text-sm font-rajdhani font-black ${
                                  pos.position === 1 ? 'text-yellow-400' :
                                  pos.position === 2 ? 'text-gray-300' :
                                  pos.position === 3 ? 'text-orange-400' :
                                  'text-metrik-turquoise'
                                }`}>
                                  P{pos.position}
                                </div>
                                <div className="text-sm font-rajdhani font-black text-white">
                                  {getDriverAbbr(pos.driver)}
                                </div>
                                <div className="text-xs text-gray-400 truncate max-w-[100px]">
                                  {pos.team.split(' ')[0]}
                                </div>
                              </div>

                              {/* Progress Line Markers */}
                              <div className="absolute inset-y-0 left-1/4 w-px bg-metrik-turquoise/30" />
                              <div className="absolute inset-y-0 left-1/2 w-px bg-metrik-turquoise/40" />
                              <div className="absolute inset-y-0 left-3/4 w-px bg-metrik-turquoise/30" />

                              {/* Progress Fill */}
                              <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-metrik-turquoise/20 to-metrik-turquoise/5 transition-all duration-1000"
                                style={{ width: `${percentage}%` }}
                              />

                              {/* Position Marker */}
                              <div
                                className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000"
                                style={{ left: `${percentage}%` }}
                              >
                                {/* Position Badge - Only colored for top 3 */}
                                <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg ${
                                  pos.position === 1 ? 'bg-yellow-400 text-black shadow-yellow-400/50' :
                                  pos.position === 2 ? 'bg-gray-300 text-black shadow-gray-300/50' :
                                  pos.position === 3 ? 'bg-orange-400 text-black shadow-orange-400/50' :
                                  'bg-metrik-turquoise/20 border-2 border-metrik-turquoise text-metrik-turquoise shadow-metrik-turquoise/30'
                                }`}>
                                  {pos.position}
                                </div>

                                {inBattle && (
                                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-red-400">
                                    <Zap size={10} className="animate-pulse" />
                                    <span className="text-[10px] font-rajdhani font-black">BATTLE</span>
                                  </div>
                                )}

                                {drsEnabled && (
                                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-green-400">
                                    <Wind size={10} />
                                    <span className="text-[10px] font-rajdhani font-black">DRS</span>
                                  </div>
                                )}

                                {hasPitStop && (
                                  <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 text-yellow-400">
                                    <Wrench size={10} />
                                    <span className="text-[10px] font-rajdhani font-black">PIT</span>
                                  </div>
                                )}

                                {/* Gap Display - Right Side */}
                                <div className="absolute -right-16 top-1/2 -translate-y-1/2 whitespace-nowrap">
                                  {pos.position === 1 ? (
                                    <div className="text-xs font-rajdhani font-black text-metrik-turquoise">
                                      LEAD
                                    </div>
                                  ) : (
                                    <div className="text-xs font-rajdhani font-black text-white">
                                      +{gap.toFixed(2)}s
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Finish Flag */}
                              <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/20 to-transparent flex items-center justify-center">
                                <Flag size={12} className="text-white opacity-50" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No race data available
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM LEFT - STRATEGY COMPOUNDS (Static Data - Secondary) */}
              <div
                className={`group relative backdrop-blur-xl bg-metrik-card/95 border rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                  hoveredGraph === 'strategy'
                    ? 'scale-[1.05] z-10 border-metrik-turquoise shadow-2xl shadow-metrik-turquoise/50'
                    : hoveredGraph
                    ? 'opacity-60 scale-[0.97] border-metrik-turquoise/20'
                    : 'border-metrik-turquoise/30 shadow-metrik-turquoise/20'
                }`}
                onMouseEnter={() => setHoveredGraph('strategy')}
                onMouseLeave={() => setHoveredGraph(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-metrik-turquoise/5 to-transparent pointer-events-none" />
                
                {/* Header */}
                <div className="sticky top-0 bg-metrik-card/95 backdrop-blur-xl border-b border-metrik-turquoise/20 px-4 py-3 z-10">
                  <h2 className="text-xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2 uppercase">
                    <Clock size={20} />
                    Tire Strategy
                    <span className="ml-auto text-xs font-inter text-gray-500 normal-case">Static Data</span>
                  </h2>
                </div>

                {/* Content */}
                <div className="p-4 h-[calc(100%-60px)] overflow-y-auto custom-scrollbar">
                  {strategyData && strategyData.strategies.length > 0 ? (
                    <div className="space-y-2.5">
                      {strategyData.strategies.slice(0, 10).map((strategy) => {
                        const totalLaps = strategy.stints.reduce((sum, s) => sum + s.laps, 0);
                        return (
                          <div
                            key={strategy.driver}
                            className="backdrop-blur-xl bg-metrik-black/30 border border-metrik-turquoise/10 rounded-lg p-2.5 hover:border-metrik-turquoise/30 transition-all"
                          >
                            <div className="flex items-center gap-3">
                              {/* Driver Name - Compact */}
                              <div className="w-16 flex-shrink-0">
                                <div className="font-rajdhani font-black text-white text-sm">
                                  {getDriverAbbr(strategy.driver)}
                                </div>
                              </div>

                              {/* Strategy Bar - Horizontal */}
                              <div className="flex-1 flex gap-0.5 h-7 rounded overflow-hidden">
                                {strategy.stints.map((stint, idx) => {
                                  const percentage = (stint.laps / totalLaps) * 100;
                                  return (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-center text-[10px] font-rajdhani font-bold text-white"
                                      style={{
                                        width: `${percentage}%`,
                                        backgroundColor: getCompoundColor(stint.compound),
                                        minWidth: stint.laps > 2 ? '20px' : '10px'
                                      }}
                                      title={`${stint.compound} (${stint.laps}L)`}
                                    >
                                      {stint.laps > 4 && (
                                        <span className="drop-shadow-lg">{stint.compound.charAt(0)}</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Stops Count - Compact */}
                              <div className="w-8 flex-shrink-0 text-right">
                                <div className="text-xs text-metrik-turquoise font-rajdhani font-bold">
                                  {strategy.totalStops}S
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Legend - Ultra Compact */}
                      <div className="mt-3 backdrop-blur-xl bg-metrik-black/30 border border-metrik-turquoise/10 rounded-lg p-2">
                        <div className="flex items-center justify-center gap-3 text-[10px] flex-wrap">
                          {['SOFT', 'MEDIUM', 'HARD', 'INTER', 'WET'].map((compound) => (
                            <div key={compound} className="flex items-center gap-1">
                              <div
                                className="w-2.5 h-2.5 rounded-sm"
                                style={{ backgroundColor: getCompoundColor(compound) }}
                              />
                              <span className="text-gray-400 font-rajdhani font-bold">{compound}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      No strategy data available
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM RIGHT - LAP EVENTS (Static Data - Secondary) */}
              <div
                className={`group relative backdrop-blur-xl bg-metrik-card/95 border rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-out ${
                  hoveredGraph === 'events'
                    ? 'scale-[1.05] z-10 border-metrik-turquoise shadow-2xl shadow-metrik-turquoise/50'
                    : hoveredGraph
                    ? 'opacity-60 scale-[0.97] border-metrik-turquoise/20'
                    : 'border-metrik-turquoise/30 shadow-metrik-turquoise/20'
                }`}
                onMouseEnter={() => setHoveredGraph('events')}
                onMouseLeave={() => setHoveredGraph(null)}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-metrik-turquoise/5 to-transparent pointer-events-none" />
                
                {/* Header */}
                <div className="sticky top-0 bg-metrik-card/95 backdrop-blur-xl border-b border-metrik-turquoise/20 px-4 py-3 z-10">
                  <h2 className="text-xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2 uppercase">
                    <Radio size={20} />
                    Lap Events
                    <span className="ml-auto text-xs font-inter text-gray-500 normal-case">Static Data</span>
                  </h2>
                </div>

                {/* Content */}
                <div className="p-4 h-[calc(100%-60px)] overflow-y-auto custom-scrollbar">
                  {currentEvents.length > 0 ? (
                    <div className="space-y-2">
                      {currentEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className={`rounded-lg p-3 border ${getSeverityColor(event.severity)} backdrop-blur-xl transition-all hover:scale-[1.02]`}
                        >
                          <div className="text-xs font-rajdhani font-black uppercase tracking-wider mb-1">
                            {event.type.replace('_', ' ')}
                          </div>
                          <div className="text-sm font-inter">
                            {event.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500">
                      <Radio size={32} className="mb-2 opacity-30" />
                      <p className="text-sm font-inter">No events this lap</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal 
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        reason="current_season" 
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 229, 204, 0.05); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 229, 204, 0.3); border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(0, 229, 204, 0.5); }
        
        @keyframes progressAnimation {
          0% { stroke-dashoffset: 351.86; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes counterAnimation {
          0% { content: '0'; }
          10% { content: '10'; }
          20% { content: '20'; }
          30% { content: '30'; }
          40% { content: '40'; }
          50% { content: '50'; }
          60% { content: '60'; }
          70% { content: '70'; }
          80% { content: '80'; }
          90% { content: '90'; }
          100% { content: '100'; }
        }
        
        .loading-percentage::before {
          content: '0';
          animation: counterAnimation 2s steps(10) forwards;
        }
      `}</style>
    </div>
  );
}