import { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import { ArrowLeft, Loader2, Play, Pause, RotateCcw, Radio, Flag, Clock, TrendingUp, Zap, Target, XCircle, CloudRain, Cloud, Sun, Wrench, Wind, ArrowUp, ArrowDown, Minus, Route, Users, Circle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrandPrixSelector from '../components/GrandPrixSelector';
import { getRaceData, getPitStops, getRaceEvents, getPositionEvolution, getStrategyComparison } from '../services/backend.service';
import type { RaceData, PitStopsData, RaceEventsData, DriverPosition, PositionEvolution, StrategyComparison } from '../types/pitwall';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import YearSelector from '../components/YearSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonChart from '../components/SkeletonChart';

export default function PitWallPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [loading, setLoading] = useState(false);

  const [raceData, setRaceData] = useState<RaceData | null>(null);
  const [pitStopsData, setPitStopsData] = useState<PitStopsData | null>(null);
  const [eventsData, setEventsData] = useState<RaceEventsData | null>(null);
  const [positionEvolution, setPositionEvolution] = useState<PositionEvolution | null>(null);
  const [strategyData, setStrategyData] = useState<StrategyComparison | null>(null);

  const [currentLap, setCurrentLap] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [activeTab, setActiveTab] = useState<'gaps' | 'positions' | 'strategy'>('gaps');

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

  const loadRaceData = async () => {
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

  // Helper: Get driver abbreviation
  const getDriverAbbr = (fullName: string): string => {
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return parts[parts.length - 1].substring(0, 3).toUpperCase();
    }
    return fullName.substring(0, 3).toUpperCase();
  };

  // Helper: Get team color (F1 2024-2025 official colors)
  const getTeamColor = (team: string): string => {
    const teamLower = team.toLowerCase();
    
    // Red Bull Racing
    if (teamLower.includes('red bull')) return '#3671C6';
    
    // Ferrari
    if (teamLower.includes('ferrari')) return '#E8002D';
    
    // Mercedes
    if (teamLower.includes('mercedes')) return '#27F4D2';
    
    // McLaren
    if (teamLower.includes('mclaren')) return '#FF8000';
    
    // Aston Martin
    if (teamLower.includes('aston')) return '#229971';
    
    // Alpine
    if (teamLower.includes('alpine')) return '#FF87BC';
    
    // Williams
    if (teamLower.includes('williams')) return '#64C4FF';
    
    // AlphaTauri / RB / Visa Cash App RB
    if (teamLower.includes('alphatauri') || teamLower.includes('visa') || teamLower.includes('rb f1')) return '#6692FF';
    
    // Alfa Romeo / Kick Sauber
    if (teamLower.includes('alfa') || teamLower.includes('sauber') || teamLower.includes('kick')) return '#52E252';
    
    // Haas
    if (teamLower.includes('haas')) return '#B6BABD';
    
    // Default color
    return '#FFFFFF';
  };

  // Helper: Detect overtakes between laps
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

  // Check if driver has DRS
  const hasDRS = (position: number, gap: number): boolean => {
    return position > 1 && gap < 1.0;
  };

  // IMPROVED STATS CALCULATIONS
  const statsData = raceData && pitStopsData && eventsData ? {
    // DNF: Count from critical race events (accidents, technical issues)
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
    
    // FASTEST LAP: Find best lap time and driver
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
    
    // Weather: Detect from tire compounds
    weather: (() => {
      if (!pitStopsData) return 'Dry';
      const compounds = pitStopsData.pitStops.map(ps => ps.compound.toUpperCase());
      if (compounds.some(c => c === 'WET')) return 'Wet';
      if (compounds.some(c => c === 'INTERMEDIATE')) return 'Mixed';
      return 'Dry';
    })()
  } : null;

  // Get weather icon component
  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case 'Wet':
        return <CloudRain className="w-5 h-5 text-blue-400" />;
      case 'Mixed':
        return <Cloud className="w-5 h-5 text-gray-400" />;
      default:
        return <Sun className="w-5 h-5 text-yellow-400" />;
    }
  };

  const currentPositions = getCurrentPositions();
  const currentPitStops = getPitStopsForLap(currentLap);
  const currentEvents = getEventsForLap(currentLap);
  const currentOvertakes = detectOvertakes(currentLap);

  // Calculate CUMULATIVE gaps (real time gaps accumulated over all laps)
  const calculateCumulativeGaps = (): Map<string, number> => {
    if (!raceData || currentLap >= raceData.raceData.length) return new Map();
    
    const gaps = new Map<string, number>();
    
    // Find leader for current lap
    const leaderDriver = currentPositions.find(p => p.position === 1)?.driver;
    if (!leaderDriver) return gaps;
    
    // For each driver, calculate their cumulative time difference vs leader
    currentPositions.forEach(pos => {
      if (pos.position === 1) {
        gaps.set(pos.driver, 0);
        return;
      }
      
      // Sum all lap times for this driver and leader up to current lap
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
        : pos.position * 0.5; // Fallback if no data
      
      gaps.set(pos.driver, Math.max(0, gap));
    });
    
    return gaps;
  };

  const cumulativeGaps = calculateCumulativeGaps();
  const maxGap = Math.max(...Array.from(cumulativeGaps.values()), 10);

  return (
    <div className="min-h-screen bg-gradient-to-br from-metrik-black via-metrik-black to-metrik-turquoise/5 text-white pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-turquoise hover:text-white transition-colors font-rajdhani font-bold tracking-wide"
          >
            <ArrowLeft size={20} />
            <span className="uppercase">Back to Home</span>
          </button>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-6xl md:text-7xl font-rajdhani font-black tracking-tight text-white mb-4 drop-shadow-glow">
            PIT WALL
            <span className="block text-3xl md:text-4xl text-metrik-turquoise mt-2 drop-shadow-glow-intense">
              STRATEGY COMMAND CENTER
            </span>
          </h1>
          <p className="text-metrik-silver font-inter text-lg max-w-2xl mx-auto">
            Real-time race analysis • Strategy insights • Position tracking
          </p>
        </div>

        {/* Selectors */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <YearSelector selectedYear={year} onSelectYear={setYear} />
          <GrandPrixSelector
            year={year}
            selectedRound={selectedGP}
            onSelect={setSelectedGP}
          />
          <button
            onClick={loadRaceData}
            disabled={loading}
            className="px-8 py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black font-rajdhani font-black tracking-wider rounded-xl hover:shadow-lg hover:shadow-metrik-turquoise/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-2 uppercase"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Loading...
              </>
            ) : (
              <>
                <Flag size={20} />
                Load Race
              </>
            )}
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="space-y-6">
            <LoadingSpinner />
            <SkeletonChart />
          </div>
        )}

        {/* Main Content */}
        {!loading && raceData && (
          <>
            {/* Race Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                <div className="text-metrik-silver text-sm font-inter mb-1 uppercase tracking-wide">Total Laps</div>
                <div className="text-4xl font-rajdhani font-black text-white">{raceData.totalLaps}</div>
              </div>

              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                <div className="text-metrik-silver text-sm font-inter mb-1 uppercase tracking-wide flex items-center gap-2">
                  <TrendingUp size={16} />
                  Fastest Lap
                </div>
                {statsData?.fastestLap.time ? (
                  <>
                    <div className="text-2xl font-rajdhani font-black text-metrik-turquoise">
                      {formatLapTime(statsData.fastestLap.time)}
                    </div>
                    <div className="text-xs text-metrik-silver font-inter mt-1">
                      {getDriverAbbr(statsData.fastestLap.driver || '')}
                    </div>
                  </>
                ) : (
                  <div className="text-2xl font-rajdhani font-black text-metrik-silver">--</div>
                )}
              </div>

              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                <div className="text-metrik-silver text-sm font-inter mb-1 uppercase tracking-wide flex items-center gap-2">
                  <XCircle size={16} />
                  DNFs
                </div>
                <div className="text-4xl font-rajdhani font-black text-white">
                  {statsData?.dnfCount || 0}
                </div>
              </div>

              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                <div className="text-metrik-silver text-sm font-inter mb-1 uppercase tracking-wide flex items-center gap-2">
                  {statsData && getWeatherIcon(statsData.weather)}
                  Weather
                </div>
                <div className="text-2xl font-rajdhani font-black text-white">
                  {statsData?.weather || 'Unknown'}
                </div>
              </div>
            </div>

            {/* Playback Controls */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Lap Display */}
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-sm text-metrik-silver font-inter mb-1 uppercase tracking-wide">Current Lap</div>
                    <div className="text-5xl font-rajdhani font-black text-metrik-turquoise">
                      {currentLap + 1}
                    </div>
                  </div>
                  <div className="text-3xl text-metrik-silver font-rajdhani font-black">/</div>
                  <div className="text-center">
                    <div className="text-sm text-metrik-silver font-inter mb-1 uppercase tracking-wide">Total</div>
                    <div className="text-4xl font-rajdhani font-black text-white">
                      {raceData.totalLaps}
                    </div>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleReset}
                    className="p-3 bg-metrik-black/50 border border-metrik-turquoise/30 rounded-xl hover:bg-metrik-turquoise/20 hover:border-metrik-turquoise transition-all"
                    title="Reset"
                  >
                    <RotateCcw size={24} />
                  </button>

                  <button
                    onClick={handlePlayPause}
                    className="p-4 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black rounded-xl hover:shadow-lg hover:shadow-metrik-turquoise/50 transition-all"
                  >
                    {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="text-metrik-silver text-sm font-inter">Speed:</span>
                    {[0.5, 1, 2, 4].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSpeed(s)}
                        className={`px-3 py-2 rounded-lg font-rajdhani font-bold transition-all ${
                          speed === s
                            ? 'bg-metrik-turquoise text-metrik-black'
                            : 'bg-metrik-black/50 text-metrik-silver hover:bg-metrik-turquoise/20'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex-1 min-w-[200px]">
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
                             [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 
                             [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-metrik-turquoise
                             [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:shadow-metrik-turquoise/50"
                  />
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-center gap-4">
              {(['gaps', 'positions', 'strategy'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-8 py-3 rounded-xl font-rajdhani font-black tracking-wider uppercase transition-all flex items-center gap-2 ${
                    activeTab === tab
                      ? 'bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black shadow-lg shadow-metrik-turquoise/50'
                      : 'bg-metrik-black/50 border border-metrik-turquoise/30 text-metrik-silver hover:bg-metrik-turquoise/20'
                  }`}
                >
                  {tab === 'gaps' ? (
                    <>
                      <Route size={20} />
                      Race Progression
                    </>
                  ) : tab === 'positions' ? (
                    <>
                      <Users size={20} />
                      Position Evolution
                    </>
                  ) : (
                    <>
                      <Target size={20} />
                      Strategy
                    </>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-8 shadow-lg shadow-metrik-turquoise/20">
              {activeTab === 'gaps' && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2 uppercase">
                    <Route size={28} />
                    Race Progression
                  </h2>

                  {currentPositions.length > 0 ? (
                    <div className="space-y-4">
                      {currentPositions.slice(0, 10).map((pos) => {
                        // Use cumulative gap from the Map
                        const gap = cumulativeGaps.get(pos.driver) || 0;
                        const percentage = maxGap > 0 ? Math.min((gap / maxGap) * 100, 100) : 0;
                        const inBattle = pos.position > 1 && gap < 2.0;
                        const drsEnabled = hasDRS(pos.position, gap);
                        const isOvertaking = currentOvertakes.some(ot => ot.driver === pos.driver);
                        const hasPitStop = currentPitStops.some(ps => ps.driver === pos.driver);
                        
                        // Mini sparkline data (last 5 laps) - cumulative gaps
                        const sparklineData: number[] = [];
                        const leaderDriver = currentPositions.find(p => p.position === 1)?.driver;
                        
                        for (let i = Math.max(0, currentLap - 4); i <= currentLap; i++) {
                          let driverTotal = 0;
                          let leaderTotal = 0;
                          
                          for (let j = 0; j <= i; j++) {
                            const lapData = raceData.raceData[j];
                            if (!lapData) continue;
                            
                            const driverLap = lapData.positions.find(p => p.driver === pos.driver);
                            const leaderLap = lapData.positions.find(p => p.driver === leaderDriver);
                            
                            if (driverLap?.lapTime && driverLap.lapTime > 0) driverTotal += driverLap.lapTime;
                            if (leaderLap?.lapTime && leaderLap.lapTime > 0) leaderTotal += leaderLap.lapTime;
                          }
                          
                          const sparkGap = driverTotal > 0 && leaderTotal > 0 ? Math.max(0, driverTotal - leaderTotal) : 0;
                          sparklineData.push(sparkGap);
                        }

                        return (
                          <div
                            key={pos.driver}
                            className="group relative"
                          >
                            {/* Track Container */}
                            <div className="relative">
                              {/* Driver Info - Left */}
                              <div className="absolute -left-32 top-1/2 -translate-y-1/2 text-right w-28">
                                <div className={`text-xs font-rajdhani font-bold mb-1 ${
                                  pos.position === 1 ? 'text-yellow-400' :
                                  pos.position === 2 ? 'text-gray-300' :
                                  pos.position === 3 ? 'text-orange-400' :
                                  'text-metrik-silver'
                                }`}>
                                  P{pos.position}
                                </div>
                                <div className="text-sm font-rajdhani font-black text-white truncate">
                                  {getDriverAbbr(pos.driver)}
                                </div>
                                <div className="text-xs text-metrik-silver/70 font-inter truncate">
                                  {pos.team}
                                </div>
                              </div>

                              {/* Track Base */}
                              <div className={`relative h-12 rounded-full overflow-hidden transition-all duration-300 ${
                                inBattle ? 'bg-red-500/10 border-2 border-red-500/30' : 'bg-metrik-black/30 border border-metrik-turquoise/20'
                              }`}>
                                {/* Turquoise Track Line */}
                                <div className="absolute inset-0 bg-gradient-to-r from-metrik-turquoise/20 via-metrik-turquoise/10 to-transparent" />
                                
                                {/* Checkpoints */}
                                <div className="absolute inset-y-0 left-1/4 w-px bg-metrik-turquoise/30" />
                                <div className="absolute inset-y-0 left-1/2 w-px bg-metrik-turquoise/40" />
                                <div className="absolute inset-y-0 left-3/4 w-px bg-metrik-turquoise/30" />
                                
                                {/* Checkpoint Labels */}
                                <div className="absolute -bottom-5 left-1/4 -translate-x-1/2 text-xs text-metrik-silver/50 font-rajdhani">25%</div>
                                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-xs text-metrik-silver/50 font-rajdhani">50%</div>
                                <div className="absolute -bottom-5 left-3/4 -translate-x-1/2 text-xs text-metrik-silver/50 font-rajdhani">75%</div>

                                {/* Trail Effect */}
                                <div
                                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-metrik-turquoise/20 to-metrik-turquoise/5 transition-all duration-1000 ease-out"
                                  style={{ width: `${percentage}%` }}
                                />

                                {/* Car Position */}
                                <div
                                  className={`absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-out ${
                                    isOvertaking ? 'animate-pulse' : ''
                                  }`}
                                  style={{ left: `${percentage}%` }}
                                >
                                  {/* Overtake Flash */}
                                  {isOvertaking && (
                                    <div className="absolute inset-0 animate-ping">
                                      <div className="w-8 h-8 rounded-full bg-metrik-turquoise/50" />
                                    </div>
                                  )}

                                  {/* Car Icon */}
                                  <div className={`relative w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                                    pos.position === 1 ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/50' :
                                    pos.position === 2 ? 'bg-gray-300 text-black shadow-lg shadow-gray-300/50' :
                                    pos.position === 3 ? 'bg-orange-400 text-black shadow-lg shadow-orange-400/50' :
                                    'bg-metrik-turquoise text-black shadow-lg shadow-metrik-turquoise/50'
                                  }`}>
                                    {pos.position}
                                  </div>

                                  {/* Battle Zone Indicator */}
                                  {inBattle && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-red-400 animate-bounce">
                                      <Zap size={12} className="animate-pulse" />
                                      <span className="text-xs font-rajdhani font-black">BATTLE</span>
                                    </div>
                                  )}

                                  {/* DRS Indicator */}
                                  {drsEnabled && (
                                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-green-400">
                                      <Wind size={12} />
                                      <span className="text-xs font-rajdhani font-black">DRS</span>
                                    </div>
                                  )}

                                  {/* Pit Stop Indicator */}
                                  {hasPitStop && (
                                    <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-yellow-400">
                                      <Wrench size={12} />
                                      <span className="text-xs font-rajdhani font-black">PIT</span>
                                    </div>
                                  )}

                                  {/* Gap Label */}
                                  <div className="absolute -right-20 top-1/2 -translate-y-1/2 whitespace-nowrap">
                                    {pos.position === 1 ? (
                                      <div className="text-sm font-rajdhani font-black text-metrik-turquoise">
                                        LEADER
                                      </div>
                                    ) : (
                                      <div className="text-sm font-rajdhani font-black text-white">
                                        +{gap.toFixed(3)}s
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Finish Line */}
                                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/20 to-transparent flex items-center justify-center">
                                  <Flag size={16} className="text-white opacity-50" />
                                </div>
                              </div>

                              {/* Mini Sparkline */}
                              <div className="absolute -right-44 top-1/2 -translate-y-1/2 w-32 h-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg width="100%" height="100%" className="overflow-visible">
                                  <polyline
                                    points={sparklineData.map((val, i) => {
                                      const x = (i / (sparklineData.length - 1)) * 100;
                                      const y = 100 - ((val / maxGap) * 80);
                                      return `${x},${y}`;
                                    }).join(' ')}
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    className="text-metrik-turquoise"
                                  />
                                </svg>
                              </div>
                            </div>

                            {/* Hover Tooltip */}
                            <div className="absolute left-0 -top-24 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-full">
                              <div className="backdrop-blur-xl bg-metrik-black/95 border border-metrik-turquoise/50 rounded-xl p-3 shadow-xl shadow-metrik-turquoise/30">
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                  <div>
                                    <div className="text-metrik-silver font-inter">Lap Time</div>
                                    <div className="font-rajdhani font-bold text-white">{formatLapTime(pos.lapTime)}</div>
                                  </div>
                                  <div>
                                    <div className="text-metrik-silver font-inter">Gap</div>
                                    <div className="font-rajdhani font-bold text-metrik-turquoise">
                                      {pos.position === 1 ? '---' : `+${gap.toFixed(3)}s`}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-metrik-silver font-inter">Status</div>
                                    <div className="font-rajdhani font-bold text-white">
                                      {inBattle ? '⚔️ Battle' : drsEnabled ? '💨 DRS' : '🏁 Racing'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-metrik-silver py-12">
                      No gap data available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'positions' && positionEvolution && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2 uppercase">
                    <Users size={28} />
                    Position Evolution - Top 10
                  </h2>

                  {positionEvolution.drivers.length > 0 ? (
                    <div className="relative">
                      {(() => {
                        // Get CURRENT top 10 based on current lap positions
                        const currentEvolution = positionEvolution.evolution[currentLap];
                        const prevEvolution = currentLap > 0 ? positionEvolution.evolution[currentLap - 1] : null;
                        
                        // Get all drivers with their positions at current lap
                        const driversWithPositions = positionEvolution.drivers
                          .map(driver => ({
                            driver,
                            position: currentEvolution?.[driver] || 999,
                            prevPosition: prevEvolution?.[driver] || 999,
                            team: (positionEvolution as any).teams?.[driver] || 'Unknown'
                          }))
                          .filter(d => d.position !== 999)
                          .sort((a, b) => a.position - b.position)
                          .slice(0, 10);
                        
                        const currentTop10 = driversWithPositions.map(d => d.driver);
                        const chartData = positionEvolution.evolution.slice(0, currentLap + 1);

                        return (
                          <>
                            {/* Driver Labels - Aligned with their current position */}
                            <div className="absolute left-0 top-0 w-24 h-[600px] pointer-events-none z-10">
                              {driversWithPositions.map((driverData, idx) => {
                                const { driver, position, prevPosition, team } = driverData;
                                const posChange = prevPosition !== 999 ? prevPosition - position : 0;
                                
                                // Calculate Y position to match chart
                                const chartHeight = 600;
                                const marginTop = 20;
                                const marginBottom = 20;
                                const effectiveHeight = chartHeight - marginTop - marginBottom;
                                
                                // YAxis domain is [1, 20], reversed
                                const positionRatio = (position - 1) / (20 - 1);
                                const yPixels = marginTop + (positionRatio * effectiveHeight);
                                const yPercent = (yPixels / chartHeight) * 100;
                                
                                // Get team color
                                const teamColor = getTeamColor(team);

                                return (
                                  <div 
                                    key={driver} 
                                    className="absolute left-0 flex items-center gap-2 transition-all duration-700 ease-in-out"
                                    style={{ 
                                      top: `${yPercent}%`, 
                                      transform: 'translateY(-50%)'
                                    }}
                                  >
                                    {/* Position Indicator */}
                                    <div 
                                      className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-rajdhani font-black shadow-lg"
                                      style={{ 
                                        backgroundColor: teamColor,
                                        color: teamColor === '#FFFFFF' || teamColor === '#64C4FF' || teamColor === '#27F4D2' ? '#000' : '#FFF',
                                        boxShadow: `0 0 10px ${teamColor}80`
                                      }}
                                    >
                                      {position}
                                    </div>
                                    
                                    {/* Driver Name */}
                                    <span 
                                      className="text-sm font-rajdhani font-black drop-shadow-lg"
                                      style={{ color: teamColor }}
                                    >
                                      {getDriverAbbr(driver)}
                                    </span>
                                    
                                    {/* Position Change Animation */}
                                    {posChange > 0 && (
                                      <div className="flex items-center gap-0.5 text-green-400 animate-bounce">
                                        <ArrowUp size={12} className="animate-pulse" />
                                        <span className="text-xs font-rajdhani font-black">+{posChange}</span>
                                      </div>
                                    )}
                                    {posChange < 0 && (
                                      <div className="flex items-center gap-0.5 text-red-400 animate-bounce">
                                        <ArrowDown size={12} className="animate-pulse" />
                                        <span className="text-xs font-rajdhani font-black">{Math.abs(posChange)}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Chart */}
                            <ResponsiveContainer width="100%" height={600}>
                              <LineChart
                                data={chartData}
                                margin={{ top: 20, right: 30, bottom: 20, left: 110 }}
                              >
                                <CartesianGrid
                                  strokeDasharray="3 3"
                                  stroke="rgba(20, 184, 166, 0.1)"
                                  vertical={false}
                                />
                                <XAxis
                                  dataKey="lap"
                                  stroke="#14b8a6"
                                  tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Rajdhani' }}
                                  label={{ value: 'Lap', position: 'insideBottom', offset: -10, fill: '#14b8a6', fontFamily: 'Rajdhani', fontWeight: 'bold' }}
                                />
                                <YAxis
                                  reversed
                                  domain={[1, 20]}
                                  ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20]}
                                  stroke="#14b8a6"
                                  tick={{ fill: '#94a3b8', fontSize: 12, fontFamily: 'Rajdhani' }}
                                  label={{ value: 'Position', angle: -90, position: 'insideLeft', fill: '#14b8a6', fontFamily: 'Rajdhani', fontWeight: 'bold' }}
                                />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                                    border: '1px solid rgba(20, 184, 166, 0.3)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(12px)',
                                    fontFamily: 'Rajdhani'
                                  }}
                                  labelStyle={{ color: '#14b8a6', fontWeight: 'bold' }}
                                  formatter={(value: any, name: string) => {
                                    const driverTeam = (positionEvolution as any).teams?.[name];
                                    return [`P${value} - ${driverTeam || ''}`, getDriverAbbr(name)];
                                  }}
                                />
                                {currentTop10.map((driver, idx) => {
                                  const driverInfo = driversWithPositions.find(d => d.driver === driver);
                                  const teamColor = driverInfo ? getTeamColor(driverInfo.team) : '#FFFFFF';
                                  
                                  return (
                                    <Line
                                      key={driver}
                                      type="monotone"
                                      dataKey={driver}
                                      stroke={teamColor}
                                      strokeWidth={3}
                                      dot={false}
                                      activeDot={{ r: 6, fill: teamColor, strokeWidth: 0 }}
                                      connectNulls={false}
                                      animationDuration={800}
                                      animationEasing="ease-in-out"
                                    />
                                  );
                                })}
                              </LineChart>
                            </ResponsiveContainer>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="text-center text-metrik-silver py-12">
                      No position data available
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'strategy' && strategyData && (
                <div className="space-y-6">
                  <h2 className="text-3xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2 uppercase">
                    <Clock size={28} />
                    Tire Strategy Comparison
                  </h2>

                  {strategyData.strategies.length > 0 ? (
                    <div className="space-y-6">
                      {strategyData.strategies.map((strategy) => {
                        const totalLaps = strategy.stints.reduce((sum, s) => sum + s.laps, 0);
                        return (
                          <div
                            key={strategy.driver}
                            className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl p-6 hover:shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <div className="font-rajdhani font-black text-white text-xl">
                                  {strategy.driver}
                                </div>
                                <div className="text-sm text-metrik-silver font-inter">
                                  {strategy.team} • {strategy.totalStops} stop{strategy.totalStops !== 1 ? 's' : ''}
                                </div>
                              </div>
                              <div className="text-metrik-turquoise font-rajdhani font-black text-lg">
                                {totalLaps} laps
                              </div>
                            </div>

                            {/* Strategy Bar */}
                            <div className="flex gap-1 h-12 rounded-lg overflow-hidden shadow-lg">
                              {strategy.stints.map((stint, idx) => {
                                const percentage = (stint.laps / totalLaps) * 100;
                                return (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-center text-xs font-rajdhani font-bold text-white relative group transition-all hover:brightness-110"
                                    style={{
                                      width: `${percentage}%`,
                                      backgroundColor: getCompoundColor(stint.compound),
                                      minWidth: stint.laps > 2 ? '40px' : '15px'
                                    }}
                                    title={`Stint ${stint.stint}: ${stint.compound} (${stint.laps} laps, Lap ${stint.startLap}-${stint.startLap + stint.laps - 1})`}
                                  >
                                    {stint.laps > 5 && (
                                      <div className="flex flex-col items-center">
                                        <span className="text-shadow text-base drop-shadow-lg">
                                          {stint.compound.charAt(0)}
                                        </span>
                                        <span className="text-shadow text-xs drop-shadow-lg">
                                          {stint.laps}L
                                        </span>
                                      </div>
                                    )}
                                    {stint.laps >= 3 && stint.laps <= 5 && (
                                      <span className="text-shadow text-sm drop-shadow-lg">
                                        {stint.compound.charAt(0)}{stint.laps}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {/* Timeline markers */}
                            <div className="flex justify-between mt-3 text-xs text-metrik-silver/70 font-rajdhani font-bold">
                              <span>Lap 1</span>
                              {strategy.stints.length > 1 && strategy.stints.slice(0, -1).map((stint, idx) => {
                                const lapNumber = strategy.stints.slice(0, idx + 1).reduce((sum, s) => sum + s.laps, 0);
                                return (
                                  <span key={idx} className="text-metrik-turquoise/80">
                                    {lapNumber}
                                  </span>
                                );
                              })}
                              <span>Lap {totalLaps}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-metrik-silver py-12">
                      No strategy data available
                    </div>
                  )}

                  {/* Compound Legend */}
                  <div className="backdrop-blur-xl bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl p-6 mt-6">
                    <div className="flex items-center justify-center gap-6 text-sm flex-wrap">
                      {['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'].map((compound) => (
                        <div key={compound} className="flex items-center gap-2">
                          <div
                            className="w-5 h-5 rounded shadow-lg"
                            style={{ backgroundColor: getCompoundColor(compound) }}
                          />
                          <span className="text-metrik-silver font-rajdhani font-bold">{compound}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Race Events - Current Lap */}
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
              <h3 className="text-xl font-rajdhani font-black text-metrik-turquoise mb-4 tracking-wide flex items-center gap-2 uppercase">
                <Radio size={20} />
                Current Lap Events
              </h3>
              {currentEvents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentEvents.map((event, idx) => (
                    <div
                      key={idx}
                      className={`rounded-xl p-4 border ${getSeverityColor(event.severity)} backdrop-blur-xl transition-all duration-300 hover:scale-105`}
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
                <div className="text-metrik-silver text-sm font-inter py-8 text-center">
                  No events this lap
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}