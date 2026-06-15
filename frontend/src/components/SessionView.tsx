import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Loader2, AlertCircle, Eye, EyeOff, TrendingUp } from 'lucide-react';
import { useTelemetryCache } from '../hooks/useTelemetryCache';

import type { LapSelection } from '../pages/TelemetryPage';

interface SessionViewProps {
  year: number;
  selectedGP: number;
  sessionType: string;
  driver1: string;
  driver2: string;
  onLapClick: (driver: string, lapNumber: number) => void;
  selections: LapSelection[];
  getDriverColor: (driverCode: string) => string;
  areTeammates: (driver1: string, driver2: string) => boolean;
}

interface LapTimeData {
  lapNumber: number;
  lapTime1: number | null;
  lapTime2: number | null;
  hasTelemetry1: boolean;
  hasTelemetry2: boolean;
  compound1?: string | null;
  compound2?: string | null;
  isOutlier1?: boolean;
  isOutlier2?: boolean;
}

interface GPTempoLap {
  Position: number | null;
  Id: string;
  LapNumber: number;
  LapTime: number | null;
  Sector1Time: number | null;
  Sector2Time: number | null;
  Sector3Time: number | null;
  IsPersonalBest: boolean;
  IsHotLap: boolean;
  HasTelemetry: boolean;
  Team: string;
  Driver: string;
  Compound: string | null;
  AirTemp: number | null;
  TrackTemp: number | null;
  WindSpeed: number | null;
}

interface LapData {
  driver: string;
  team: string;
  session: string;
  year: number;
  round: number;
  sessionType: string;
  totalLaps: number;
  laps: GPTempoLap[];
}

// Fonctions pures définies hors composant — références stables, pas recréées à chaque render
const getTyreColor = (compound: string | null | undefined): string => {
  if (!compound || compound === 'None' || compound === 'none') return '#999999';
  const c = compound.toLowerCase();
  if (c.includes('soft') || c === 'c5' || c === 'c6') return '#E74C3C';
  if (c.includes('medium') || c === 'c3' || c === 'c4') return '#F1C40F';
  if (c.includes('hard') || c === 'c1' || c === 'c2') return '#FFFFFF';
  if (c.includes('intermediate') || c.includes('inter')) return '#52E252';
  if (c.includes('wet')) return '#3498DB';
  return '#999999';
};

interface CustomDotExtraProps {
  driver1: string;
  driver2: string;
  driver1Color: string;
  driver2Color: string;
  hoveredLap: number | null;
  selection1: LapSelection | null;
  selection2: LapSelection | null;
  onLapClick: (driver: string, lapNumber: number) => void;
  setHoveredLap: (lap: number | null) => void;
}

// CustomDot sorti du composant — évite que Recharts re-rende tous les dots à chaque render parent
const CustomDot = (props: any) => {
  const {
    cx, cy, payload, dataKey,
    driver1, driver2, driver1Color, driver2Color,
    hoveredLap, selection1, selection2,
    onLapClick, setHoveredLap,
  } = props as any & CustomDotExtraProps;

  const lapTime = payload[dataKey];
  if (!lapTime) return null;

  const isDriver1 = dataKey === 'lapTime1';
  const currentDriver = isDriver1 ? driver1 : driver2;
  const lineColor = isDriver1 ? driver1Color : driver2Color;
  const compound = isDriver1 ? payload.compound1 : payload.compound2;
  const tyreColor = getTyreColor(compound);
  const isHovered = hoveredLap === payload.lapNumber;

  const isSelected =
    (selection1?.driver === currentDriver && selection1?.lapNumber === payload.lapNumber) ||
    (selection2?.driver === currentDriver && selection2?.lapNumber === payload.lapNumber);

  return (
    <g
      onClick={(e) => { e.stopPropagation(); onLapClick(currentDriver, payload.lapNumber); }}
      onMouseEnter={() => setHoveredLap(payload.lapNumber)}
      onMouseLeave={() => setHoveredLap(null)}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={cx} cy={cy} r={15} fill="transparent" stroke="none" />
      <circle
        cx={cx}
        cy={cy}
        r={isSelected ? 9 : isHovered ? 7 : 5}
        fill={tyreColor}
        stroke={isSelected ? '#00E5CC' : lineColor}
        strokeWidth={isSelected ? 3 : isHovered ? 2.5 : 2}
        style={{
          filter: `drop-shadow(0 0 ${isHovered || isSelected ? 10 : 4}px ${tyreColor})`,
          transition: 'r 0.15s ease, stroke-width 0.15s ease',
        }}
      />
    </g>
  );
};

const MAX_LAPS = 4;

export default function SessionView({
  year,
  selectedGP,
  sessionType,
  driver1,
  driver2,
  onLapClick,
  selections,
  getDriverColor,
  areTeammates
}: SessionViewProps) {
  const selection1 = selections[0] || null;
  const selection2 = selections[1] || null;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lapTimesData, setLapTimesData] = useState<LapTimeData[]>([]);
  const [allLapTimesData, setAllLapTimesData] = useState<LapTimeData[]>([]);
  const [hoveredLap, setHoveredLap] = useState<number | null>(null);
  const [showOutliers, setShowOutliers] = useState(false);
  
  const [lapData1, setLapData1] = useState<LapData | null>(null);
  const [lapData2, setLapData2] = useState<LapData | null>(null);

  // 🎨 ANIMATION STATE
  const [animationKey, setAnimationKey] = useState(0);
  const prevDriver1Ref = useRef<string>(driver1);
  const prevDriver2Ref = useRef<string>(driver2);

  // 🔥 CACHE HOOK
  const { getCached, setCached, getSessionLapsKey } = useTelemetryCache();

  // 🔥 DEBOUNCE TIMER REF
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const driver1Color = driver1 ? getDriverColor(driver1) : '#999999';
  const driver2Color = (driver1 && driver2 && areTeammates(driver1, driver2)) ? '#FFFFFF' : (driver2 ? getDriverColor(driver2) : '#999999');


  useEffect(() => {
    setLapData1(null);
    setLapData2(null);
    setLapTimesData([]);
    setAllLapTimesData([]);
    setShowOutliers(false);
  }, [year, selectedGP, sessionType]);

  // 🎨 DÉTECTER CHANGEMENT DE DRIVERS → Trigger animation
  useEffect(() => {
    if (prevDriver1Ref.current !== driver1 || prevDriver2Ref.current !== driver2) {
      setAnimationKey(prev => prev + 1);
      prevDriver1Ref.current = driver1;
      prevDriver2Ref.current = driver2;
    }
  }, [driver1, driver2]);


  // 🔥 FONCTION DE CHARGEMENT AVEC CACHE
  const loadDriversData = useCallback(async () => {
    if (!driver1 && !driver2) {
      setLapTimesData([]);
      setAllLapTimesData([]);
      setLapData1(null);
      setLapData2(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL_EU || import.meta.env.VITE_API_URL;

      const promises: Promise<void>[] = [];
      
      // 🔥 CHARGER DRIVER1 AVEC CACHE
      if (driver1) {
        const cacheKey = getSessionLapsKey(year, selectedGP, sessionType, driver1);
        const cached = getCached<LapData>(cacheKey);
        
        if (cached) {
          setLapData1(cached);
        } else {
          promises.push(
            fetch(`${API_BASE_URL}/api/session-laps/${year}/${selectedGP}/${sessionType}/${driver1}`)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${driver1}`);
                return response.json();
              })
              .then((data: LapData) => {
                setLapData1(data);
                setCached(cacheKey, data);
              })
          );
        }
      } else {
        setLapData1(null);
      }

      // 🔥 CHARGER DRIVER2 AVEC CACHE
      if (driver2) {
        const cacheKey = getSessionLapsKey(year, selectedGP, sessionType, driver2);
        const cached = getCached<LapData>(cacheKey);
        
        if (cached) {
          setLapData2(cached);
        } else {
          promises.push(
            fetch(`${API_BASE_URL}/api/session-laps/${year}/${selectedGP}/${sessionType}/${driver2}`)
              .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch ${driver2}`);
                return response.json();
              })
              .then((data: LapData) => {
                setLapData2(data);
                setCached(cacheKey, data);
              })
          );
        }
      } else {
        setLapData2(null);
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }

    } catch (err) {
      console.error('Error loading driver data:', err);
      setError('Failed to load lap times');
    } finally {
      setLoading(false);
    }
  }, [driver1, driver2, year, selectedGP, sessionType, getCached, setCached, getSessionLapsKey]);

  // 🔥 DEBOUNCE - Attendre 300ms après le dernier changement
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      loadDriversData();
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [loadDriversData]);

  // 🔥 Merger les données des 2 drivers
  useEffect(() => {
    if (!lapData1 && !lapData2) {
      setAllLapTimesData([]);
      setLapTimesData([]);
      return;
    }

    const laps1 = lapData1?.laps || [];
    const laps2 = lapData2?.laps || [];

    const allLapNumbers = new Set([
      ...laps1.map(l => l.LapNumber),
      ...laps2.map(l => l.LapNumber)
    ]);

    const merged: LapTimeData[] = Array.from(allLapNumbers)
      .sort((a, b) => a - b)
      .map(lapNum => {
        const lap1 = laps1.find(l => l.LapNumber === lapNum);
        const lap2 = laps2.find(l => l.LapNumber === lapNum);
        return {
          lapNumber: lapNum,
          lapTime1: lap1?.LapTime || null,
          lapTime2: lap2?.LapTime || null,
          hasTelemetry1: lap1?.HasTelemetry || false,
          hasTelemetry2: lap2?.HasTelemetry || false,
          compound1: lap1?.Compound || null,
          compound2: lap2?.Compound || null,
        };
      });

    const allValidTimes = merged
      .flatMap(lap => [lap.lapTime1, lap.lapTime2])
      .filter((t): t is number => t !== null);

    if (allValidTimes.length === 0) {
      setAllLapTimesData([]);
      setLapTimesData([]);
      return;
    }

    const bestLap = Math.min(...allValidTimes);
    const minRelevant = bestLap - 1;
    const maxRelevant = bestLap + 5;

    const withOutliers = merged.map(lap => {
      const time1OutOfRange = lap.lapTime1 !== null && (lap.lapTime1 < minRelevant || lap.lapTime1 > maxRelevant);
      const time2OutOfRange = lap.lapTime2 !== null && (lap.lapTime2 < minRelevant || lap.lapTime2 > maxRelevant);
      return { ...lap, isOutlier1: time1OutOfRange, isOutlier2: time2OutOfRange };
    });

    setAllLapTimesData(withOutliers);
  }, [lapData1, lapData2]);

  // 🔥 Toggle outliers
  useEffect(() => {
    if (allLapTimesData.length === 0) return;

    const allValidTimes = allLapTimesData
      .flatMap(lap => [lap.lapTime1, lap.lapTime2])
      .filter((t): t is number => t !== null);

    if (allValidTimes.length === 0) {
      setLapTimesData([]);
      return;
    }

    const bestLap = Math.min(...allValidTimes);
    const minRelevant = bestLap - 1;
    const maxRelevant = bestLap + 5;

    if (showOutliers) {
      setLapTimesData(allLapTimesData);
    } else {
      const filtered = allLapTimesData.map(lap => {
        const time1InRange = lap.lapTime1 !== null && lap.lapTime1 >= minRelevant && lap.lapTime1 <= maxRelevant;
        const time2InRange = lap.lapTime2 !== null && lap.lapTime2 >= minRelevant && lap.lapTime2 <= maxRelevant;
        return {
          ...lap,
          lapTime1: time1InRange ? lap.lapTime1 : null,
          lapTime2: time2InRange ? lap.lapTime2 : null
        };
      }).filter(lap => lap.lapTime1 !== null || lap.lapTime2 !== null);

      setLapTimesData(filtered);
    }
  }, [showOutliers, allLapTimesData]);

  const formatLapTime = (seconds: number | null): string => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // 🔥 yDomain memoizé — recalculé seulement quand lapTimesData change
  const yDomain = useMemo((): [number, number] => {
    const allValidTimes = lapTimesData
      .flatMap(lap => [lap.lapTime1, lap.lapTime2])
      .filter((t): t is number => t !== null);

    if (allValidTimes.length === 0) return [0, 120];

    return [Math.floor(Math.min(...allValidTimes) - 0.5), Math.ceil(Math.max(...allValidTimes) + 0.5)];
  }, [lapTimesData]);


  if (!driver1 && !driver2) {
    return (
      <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-8 sm:p-12">
        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 text-center">
          <TrendingUp className="text-metrik-silver/30" size={40} />
          <h3 className="text-lg sm:text-xl font-rajdhani font-bold text-metrik-silver/50">
            Pick one driver to see data
          </h3>
          <p className="text-xs sm:text-sm text-metrik-silver/40 font-rajdhani">
            Select a driver from the grid above to view lap times
          </p>
        </div>
      </div>
    );
  }

  if (loading && !lapData1 && !lapData2) {
    return (
      <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-metrik-turquoise mx-auto mb-3 sm:mb-4" size={40} />
          <p className="text-metrik-silver font-rajdhani text-base sm:text-lg">Loading lap times...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-3 sm:mb-4" size={40} />
          <p className="text-red-500 font-rajdhani text-base sm:text-lg mb-2">Error loading data</p>
          <p className="text-metrik-silver text-xs sm:text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (lapTimesData.length === 0 && !loading) {
    return (
      <div className="flex items-center justify-center h-[400px] sm:h-[600px]">
        <p className="text-metrik-silver font-rajdhani text-base sm:text-lg">No lap times available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* GRAPH CARD */}
      <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4 relative">
        
        {/* Toggle Outliers Button */}
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-10">
          <button
            onClick={() => setShowOutliers(!showOutliers)}
            className="flex items-center gap-1.5 sm:gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-metrik-black/80 border border-metrik-turquoise/30 rounded-lg text-xs sm:text-sm font-rajdhani font-bold text-metrik-silver hover:text-white hover:border-metrik-turquoise/60 transition-all"
          >
            {showOutliers ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="hidden sm:inline">{showOutliers ? 'Hide outliers' : 'Show outliers'}</span>
            <span className="sm:hidden">{showOutliers ? 'Hide' : 'Show'}</span>
          </button>
        </div>

        {/* Graph container */}
        <div className="h-[350px] sm:h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={lapTimesData}
              key={animationKey}
              margin={{
                top: 40,
                right: 30,
                left: 10,
                bottom: 35,
              }}
            >
              {/* Watermark */}
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{
                  fontSize: '36px',
                  fontFamily: 'Rajdhani',
                  fontWeight: 900,
                  fill: '#FFFFFF',
                  opacity: 0.03,
                  pointerEvents: 'none'
                }}
              >
                METRIK DELTA
              </text>

              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
              
              <XAxis 
                dataKey="lapNumber"
                stroke="#666"
                tick={{ fill: '#999', fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 600 }}
                padding={{ left: 15, right: 15 }}
                label={{ 
                  value: 'Lap number', 
                  position: 'insideBottom', 
                  offset: -18,
                  fill: '#999',
                  style: { fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 600 }
                }}
              />
              
              <YAxis 
                stroke="#666"
                tick={{ fill: '#999', fontSize: 10, fontFamily: 'Rajdhani', fontWeight: 600 }}
                tickFormatter={(value) => {
                  const mins = Math.floor(value / 60);
                  const secs = Math.floor(value % 60);
                  return `${mins}:${secs.toString().padStart(2, '0')}`;
                }}
                label={{ 
                  value: 'Lap time', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: 5,
                  fill: '#999',
                  style: { fontSize: 11, fontFamily: 'Rajdhani', fontWeight: 600 }
                }}
                domain={yDomain}
                width={55}
              />
              
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0a0a0a',
                  border: '1px solid #00E5CC',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '11px'
                }}
                labelStyle={{ 
                  color: '#00E5CC', 
                  fontWeight: 'bold',
                  fontFamily: 'Rajdhani',
                  fontSize: '12px',
                  marginBottom: '3px'
                }}
                formatter={(value: any, name: string) => {
                  const driverCode = name === 'lapTime1' ? driver1 : driver2;
                  return [formatLapTime(value), driverCode];
                }}
                labelFormatter={(label) => `Lap ${label}`}
              />

              {hoveredLap && (
                <ReferenceLine 
                  x={hoveredLap} 
                  stroke="#666" 
                  strokeWidth={1}
                  strokeDasharray="3 3"
                />
              )}

              {/* 🎨 LIGNE DRIVER1 AVEC ANIMATION */}
              {driver1 && (
                <Line
                  type="monotone"
                  dataKey="lapTime1"
                  stroke={driver1Color}
                  strokeWidth={1.5}
                  dot={<CustomDot
                    dataKey="lapTime1"
                    driver1={driver1} driver2={driver2}
                    driver1Color={driver1Color} driver2Color={driver2Color}
                    hoveredLap={hoveredLap} selection1={selection1} selection2={selection2}
                    onLapClick={onLapClick} setHoveredLap={setHoveredLap}
                  />}
                  activeDot={false}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={700}
                  animationEasing="ease-out"
                  animationBegin={0}
                />
              )}

              {/* 🎨 LIGNE DRIVER2 */}
              {driver2 && (
                <Line
                  type="monotone"
                  dataKey="lapTime2"
                  stroke={driver2Color}
                  strokeWidth={1.5}
                  dot={<CustomDot
                    dataKey="lapTime2"
                    driver1={driver1} driver2={driver2}
                    driver1Color={driver1Color} driver2Color={driver2Color}
                    hoveredLap={hoveredLap} selection1={selection1} selection2={selection2}
                    onLapClick={onLapClick} setHoveredLap={setHoveredLap}
                  />}
                  activeDot={false}
                  connectNulls={true}
                  isAnimationActive={true}
                  animationDuration={700}
                  animationEasing="ease-out"
                  animationBegin={150}
                />
              )}

              {/* Légende drivers */}
              {driver1 && (
                <text x={65} y={15} style={{ fontSize: '13px', fontFamily: 'Rajdhani', fontWeight: 700, fill: driver1Color }}>
                  ← {driver1}
                </text>
              )}
              {driver2 && (
                <text x={65} y={driver1 ? 32 : 15} style={{ fontSize: '13px', fontFamily: 'Rajdhani', fontWeight: 700, fill: driver2Color }}>
                  ← {driver2}
                </text>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LAP TABLE — with sector times */}
      <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl overflow-hidden">
        {/* Selection hint */}
        <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-metrik-turquoise/10 bg-metrik-black/30">
          <span className="text-[10px] font-rajdhani font-bold text-metrik-silver/60 uppercase tracking-wider">
            Laps — click to compare ({selections.length}/{MAX_LAPS} selected)
          </span>
          <span className="text-[10px] text-metrik-silver/40 font-rajdhani">
            S = Sector • ● = Tyre compound
          </span>
        </div>

        {[
          { driver: driver1, lapData: lapData1, driverColor: driver1Color, timeKey: 'lapTime1' as const, telKey: 'hasTelemetry1' as const, compKey: 'compound1' as const },
          { driver: driver2, lapData: lapData2, driverColor: driver2Color, timeKey: 'lapTime2' as const, telKey: 'hasTelemetry2' as const, compKey: 'compound2' as const },
        ].map(({ driver, lapData, driverColor, timeKey, telKey, compKey }) => {
          if (!driver || !lapData) return null;
          const driverLaps = lapData.laps || [];

          return (
            <div key={driver} className="border-b last:border-b-0 border-metrik-turquoise/10">
              {/* Driver header */}
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-metrik-black/20">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: driverColor }} />
                <span className="text-xs sm:text-sm font-rajdhani font-bold" style={{ color: driverColor }}>
                  {driver}
                </span>
                <span className="text-[10px] text-metrik-silver/50 font-rajdhani">• {lapData.team}</span>
              </div>

              {/* Lap table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[10px] sm:text-xs font-rajdhani min-w-[500px]">
                  <thead>
                    <tr className="text-metrik-silver/50 border-b border-metrik-silver/10">
                      <th className="text-left px-3 py-1.5 font-bold uppercase tracking-wider w-12">Lap</th>
                      <th className="text-right px-2 py-1.5 font-bold uppercase tracking-wider">Time</th>
                      <th className="text-right px-2 py-1.5 font-bold uppercase tracking-wider text-metrik-silver/40">S1</th>
                      <th className="text-right px-2 py-1.5 font-bold uppercase tracking-wider text-metrik-silver/40">S2</th>
                      <th className="text-right px-2 py-1.5 font-bold uppercase tracking-wider text-metrik-silver/40">S3</th>
                      <th className="px-3 py-1.5 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {driverLaps.filter(l => l.LapTime !== null).map((lap) => {
                      const isSelected = selections.some(s => s.driver === driver && s.lapNumber === lap.LapNumber);
                      const selIdx = selections.findIndex(s => s.driver === driver && s.lapNumber === lap.LapNumber);
                      const hasTelemetry = lap.HasTelemetry;
                      const isRef = selIdx === 0;

                      return (
                        <tr
                          key={lap.LapNumber}
                          onClick={() => hasTelemetry && onLapClick(driver, lap.LapNumber)}
                          className={`border-b border-metrik-silver/5 transition-all duration-150 ${
                            !hasTelemetry
                              ? 'opacity-30 cursor-not-allowed'
                              : isSelected
                                ? 'bg-metrik-turquoise/10 cursor-pointer'
                                : 'hover:bg-metrik-black/40 cursor-pointer'
                          }`}
                        >
                          {/* Lap number + compound */}
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {isSelected && (
                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black flex-shrink-0 ${isRef ? 'bg-metrik-turquoise text-black' : 'bg-metrik-silver/30 text-white'}`}>
                                  {selIdx + 1}
                                </span>
                              )}
                              <span className={`font-bold ${isSelected ? 'text-white' : 'text-metrik-silver'}`}>
                                {lap.LapNumber}
                              </span>
                              {lap.Compound && lap.Compound !== 'None' && (
                                <span className="font-black text-[9px]" style={{ color: getTyreColor(lap.Compound) }}>
                                  {lap.Compound.charAt(0).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Lap time */}
                          <td className="px-2 py-2 text-right">
                            <span className={`font-bold ${lap.IsPersonalBest ? 'text-purple-400' : isSelected ? 'text-white' : 'text-metrik-silver'}`}>
                              {formatLapTime(lap.LapTime)}
                            </span>
                            {lap.IsPersonalBest && <span className="ml-1 text-purple-400/70">PB</span>}
                          </td>

                          {/* Sectors */}
                          <td className="px-2 py-2 text-right text-metrik-silver/60">
                            {lap.Sector1Time ? formatSector(lap.Sector1Time) : '—'}
                          </td>
                          <td className="px-2 py-2 text-right text-metrik-silver/60">
                            {lap.Sector2Time ? formatSector(lap.Sector2Time) : '—'}
                          </td>
                          <td className="px-2 py-2 text-right text-metrik-silver/60">
                            {lap.Sector3Time ? formatSector(lap.Sector3Time) : '—'}
                          </td>

                          {/* Action indicator */}
                          <td className="px-3 py-2">
                            {hasTelemetry && (
                              <div className={`w-1.5 h-1.5 rounded-full mx-auto ${isSelected ? 'bg-metrik-turquoise' : 'bg-metrik-silver/20'}`} />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatSector(s: number): string {
  return s.toFixed(3);
}