import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';
import { Sparkles, Trophy, TrendingDown, Play, Pause, RotateCcw, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

// ✅ INTERFACE - Support de 1 ou 2 drivers
interface RacePaceData {
  driver: string;
  driverCode?: string;
  driver2?: string;
  driver2Code?: string;
  year: number;
  round: number;
  raceName: string;
  paceData: Array<{
    lapNumber: number;
    lapTime: number | null;
    compound: string | null;
    tyreLife: number;
    stint: number;
    pitOutTime?: boolean;
    pitInTime?: boolean;
  }>;
  paceData2?: Array<{
    lapNumber: number;
    lapTime: number | null;
    compound: string | null;
    tyreLife: number;
    stint: number;
    pitOutTime?: boolean;
    pitInTime?: boolean;
  }>;
}

interface RacePaceChartProps {
  data: RacePaceData;
}

// Official F1 Tire compound colors
const TIRE_COLORS: Record<string, string> = {
  'SOFT': '#FF3333',
  'MEDIUM': '#FDB927',
  'HARD': '#F0F0F0',
  'INTERMEDIATE': '#43B02A',
  'WET': '#0067AD',
  'UNKNOWN': '#888888',
};

export default function RacePaceChart({ data }: RacePaceChartProps) {
  const isDark = true;
  const hasDriver2 = !!data.paceData2 && data.paceData2.length > 0;

  // 🎬 ANIMATION STATE
  const [animationFrame, setAnimationFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAllData, setShowAllData] = useState(false);

  // 🎨 METRIK DELTA COLOR PALETTE
  const colors = {
    bg: isDark ? '#0A0F1E' : '#FFFFFF',
    card: isDark ? 'rgba(15, 23, 41, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    text: isDark ? '#F9FAFB' : '#0F172A',
    textSub: isDark ? '#9CA3AF' : '#6B7280',
    turquoise: '#00E5CC',
    orange: '#FF8700',
    cyan: '#22D3EE',
    grid: isDark ? 'rgba(0, 229, 204, 0.15)' : 'rgba(0, 229, 204, 0.25)',
    border: isDark ? 'rgba(0, 229, 204, 0.3)' : 'rgba(0, 229, 204, 0.4)',
  };

  // 🔥 FILTRAGE INTELLIGENT DES PIT STOPS - Driver 1
  const filterPitStops = (paceData: typeof data.paceData) => {
    const allValidTimes = paceData
      .filter(lap => lap.lapTime && lap.lapTime > 0)
      .map(lap => lap.lapTime as number);

    if (allValidTimes.length === 0) return [];

    const sortedTimes = [...allValidTimes].sort((a, b) => a - b);
    const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
    const pitStopThreshold = median + 7;

    return paceData
      .filter(lap => lap.lapTime && lap.lapTime > 0 && lap.lapTime < pitStopThreshold)
      .map(lap => ({
        lapNumber: lap.lapNumber,
        lapTime: lap.lapTime as number,
        compound: lap.compound || 'UNKNOWN',
        tyreLife: lap.tyreLife || 0,
        stint: lap.stint || 1,
      }));
  };

  const chartData1 = filterPitStops(data.paceData);
  const chartData2 = hasDriver2 ? filterPitStops(data.paceData2!) : [];

  // ✅ MERGE DATA pour avoir les 2 drivers sur le même graphique
  const mergedData = chartData1.map((lap1) => {
    const lap2 = chartData2.find(l => l.lapNumber === lap1.lapNumber);
    return {
      lapNumber: lap1.lapNumber,
      lapTime1: lap1.lapTime,
      lapTime2: lap2?.lapTime || null,
      compound1: lap1.compound,
      compound2: lap2?.compound || null,
      tyreLife1: lap1.tyreLife,
      tyreLife2: lap2?.tyreLife || null,
      stint1: lap1.stint,
      stint2: lap2?.stint || null,
    };
  });

  // Ajouter les laps qui existent seulement pour driver2
  chartData2.forEach((lap2) => {
    if (!mergedData.find(d => d.lapNumber === lap2.lapNumber)) {
      mergedData.push({
        lapNumber: lap2.lapNumber,
        lapTime1: null,
        lapTime2: lap2.lapTime,
        compound1: null,
        compound2: lap2.compound,
        tyreLife1: null,
        tyreLife2: lap2.tyreLife,
        stint1: null,
        stint2: lap2.stint,
      });
    }
  });

  mergedData.sort((a, b) => a.lapNumber - b.lapNumber);

  // 🎬 ANIMATION EFFECT
  useEffect(() => {
    if (!isAnimating || animationFrame >= mergedData.length - 1) {
      if (isAnimating && animationFrame >= mergedData.length - 1) {
        setIsAnimating(false);
        setShowAllData(true);
      }
      return;
    }

    const timer = setTimeout(() => {
      setAnimationFrame(prev => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isAnimating, animationFrame, mergedData.length]);

  // 🎬 DATA VISIBLE
  const visibleData = showAllData ? mergedData : mergedData.slice(0, animationFrame + 1);

  // 📊 CALCULATE STATS pour chaque driver
  const calculateStats = (chartData: typeof chartData1) => {
    const validLapTimes = chartData.map(d => d.lapTime);
    const bestLap = validLapTimes.length > 0 ? Math.min(...validLapTimes) : 0;
    const avgLap = validLapTimes.length > 0 ? validLapTimes.reduce((a, b) => a + b, 0) / validLapTimes.length : 0;
    const worstLap = validLapTimes.length > 0 ? Math.max(...validLapTimes) : 0;

    const first5 = validLapTimes.slice(0, 5);
    const last5 = validLapTimes.slice(-5);
    const avgFirst5 = first5.length > 0 ? first5.reduce((a, b) => a + b, 0) / first5.length : 0;
    const avgLast5 = last5.length > 0 ? last5.reduce((a, b) => a + b, 0) / last5.length : 0;
    const degradation = avgLast5 - avgFirst5;

    return { bestLap, avgLap, worstLap, degradation };
  };

  const stats1 = calculateStats(chartData1);
  const stats2 = hasDriver2 ? calculateStats(chartData2) : null;

  // 🎯 OPTIMIZED Y-AXIS DOMAIN
  const allTimes = [...chartData1.map(d => d.lapTime)];
  if (hasDriver2) allTimes.push(...chartData2.map(d => d.lapTime));
  const bestOverall = Math.min(...allTimes);
  const worstOverall = Math.max(...allTimes);
  const yMin = Math.floor(bestOverall - 0.5);
  const yMax = Math.ceil(worstOverall + 0.5);

  // Format lap time
  const formatLapTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Custom dot avec WIDGET FLOTTANT pendant l'animation
  const CustomDot = (props: any) => {
    const { cx, cy, payload, index, dataKey, key, ...rest } = props; // Extraire key séparément
    const isDriver1 = dataKey === 'lapTime1';
    const isDriver2 = dataKey === 'lapTime2';

    if (!isDriver1 && !isDriver2) return null;

    const lapTime = isDriver1 ? payload.lapTime1 : payload.lapTime2;
    if (!lapTime) return null;

    const compound = isDriver1 ? payload.compound1 : payload.compound2;
    const color = TIRE_COLORS[compound] || TIRE_COLORS['UNKNOWN'];
    const lineColor = isDriver1 ? colors.turquoise : colors.orange;
    const isLastPoint = !showAllData && index === visibleData.length - 1;

    // Trouver le lap précédent pour calculer le delta
    const previousLap = index > 0 ? visibleData[index - 1] : null;
    const previousLapTime = previousLap ? (isDriver1 ? previousLap.lapTime1 : previousLap.lapTime2) : null;
    const delta = previousLapTime ? lapTime - previousLapTime : null;

    return (
      <g>
        <circle
          cx={cx}
          cy={cy}
          r={isLastPoint ? 6 : 4}
          fill={color}
          stroke={lineColor}
          strokeWidth={isLastPoint ? 2.5 : 1.5}
          style={{
            filter: `drop-shadow(0 0 ${isLastPoint ? 8 : 4}px ${lineColor}80)`,
          }}
        />

        {/* 🎬 WIDGET FLOTTANT EN HAUT - POSITION FIXE */}
        {isLastPoint && (
          <g>
            {/* Background rectangle - Position fixe en haut */}
            <rect
              x={isDriver1 ? 40 : 200}
              y={20}
              width={140}
              height={70}
              fill={colors.card}
              stroke={lineColor}
              strokeWidth={2.5}
              rx={10}
              opacity={0.98}
              style={{
                filter: `drop-shadow(0 0 20px ${lineColor}80)`,
              }}
            />

            {/* Lap Number */}
            <text
              x={isDriver1 ? 110 : 270}
              y={43}
              textAnchor="middle"
              fill={colors.textSub}
              fontSize={11}
              fontWeight="700"
              fontFamily="Inter, sans-serif"
            >
              LAP {payload.lapNumber}
            </text>

            {/* Lap Time - GROS */}
            <text
              x={isDriver1 ? 110 : 270}
              y={63}
              textAnchor="middle"
              fill={lineColor}
              fontSize={18}
              fontWeight="900"
              fontFamily="Rajdhani, sans-serif"
            >
              {formatLapTime(lapTime)}
            </text>

            {/* Delta vs Previous */}
            {delta !== null && (
              <text
                x={isDriver1 ? 110 : 270}
                y={81}
                textAnchor="middle"
                fill={delta > 0 ? '#EF4444' : '#10B981'}
                fontSize={12}
                fontWeight="700"
                fontFamily="Rajdhani, sans-serif"
              >
                {delta > 0 ? '+' : ''}{delta.toFixed(3)}s
              </text>
            )}

            {/* Ligne connectant le widget au point */}
            <line
              x1={isDriver1 ? 110 : 270}
              y1={90}
              x2={cx}
              y2={cy}
              stroke={lineColor}
              strokeWidth={2}
              strokeDasharray="4 4"
              opacity={0.5}
            />

            {/* Dot sur le widget */}
            <circle
              cx={isDriver1 ? 110 : 270}
              cy={90}
              r={4}
              fill={lineColor}
            />
          </g>
        )}
      </g>
    );
  };

  return (
    <div 
      className="w-full h-full relative overflow-hidden"
      style={{ backgroundColor: colors.bg }}
    >
      <div 
        className="absolute inset-0 backdrop-blur-xl"
        style={{ 
          background: `linear-gradient(135deg, ${colors.card} 0%, ${colors.bg} 100%)`,
        }}
      />

      <div className="relative z-10 p-4 md:p-8 space-y-3 md:space-y-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-0">
          <div>
            <div className="flex items-center gap-2 md:gap-3 mb-2">
              <h2 
                className="text-xl md:text-4xl font-rajdhani font-black uppercase tracking-wider"
                style={{ 
                  color: colors.text,
                  textShadow: `0 0 20px ${colors.turquoise}40`,
                }}
              >
                Race Pace <span className="hidden sm:inline">{hasDriver2 ? 'Comparison' : 'Evolution'}</span>
              </h2>
              <div 
                className="px-2 md:px-3 py-1 rounded-lg border-2 hidden md:flex"
                style={{ 
                  borderColor: colors.border,
                  backgroundColor: `${colors.turquoise}10`,
                }}
              >
                <span className="text-xs font-rajdhani font-black" style={{ color: colors.turquoise }}>
                  METRIK DELTA
                </span>
              </div>
            </div>

            {/* Driver names */}
            <div className="flex items-center gap-2 md:gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full" style={{ backgroundColor: colors.turquoise }} />
                <p className="text-sm md:text-xl font-inter font-semibold" style={{ color: colors.text }}>
                  {data.driver}
                </p>
              </div>
              {hasDriver2 && data.driver2 && (
                <>
                  <span className="text-sm md:text-xl font-rajdhani font-bold" style={{ color: colors.textSub }}>VS</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 md:w-3 h-2 md:h-3 rounded-full" style={{ backgroundColor: colors.orange }} />
                    <p className="text-sm md:text-xl font-inter font-semibold" style={{ color: colors.text }}>
                      {data.driver2}
                    </p>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs md:text-sm font-inter mt-1" style={{ color: colors.textSub }}>
              {showAllData ? mergedData.length : animationFrame + 1} / {mergedData.length} laps analyzed
            </p>
          </div>

          {/* ANIMATION CONTROLS */}
          <div className="flex items-center gap-2 md:gap-3">
            <button
              onClick={() => {
                setIsAnimating(!isAnimating);
                if (showAllData) {
                  setShowAllData(false);
                  setAnimationFrame(0);
                }
              }}
              className="flex items-center gap-1 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 transition-all hover:scale-105"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.turquoise,
              }}
            >
              {isAnimating ? <Pause size={16} className="md:w-[18px] md:h-[18px]" /> : <Play size={16} className="md:w-[18px] md:h-[18px]" />}
              <span className="text-xs md:text-sm font-rajdhani font-black uppercase">
                {isAnimating ? 'Pause' : 'Animate'}
              </span>
            </button>
            <button
              onClick={() => {
                setIsAnimating(false);
                setShowAllData(false);
                setAnimationFrame(0);
              }}
              className="p-1.5 md:p-2 rounded-lg border-2 transition-all hover:scale-105"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.textSub,
              }}
            >
              <RotateCcw size={16} className="md:w-[18px] md:h-[18px]" />
            </button>
            <button
              onClick={() => {
                setIsAnimating(false);
                setShowAllData(true);
                setAnimationFrame(mergedData.length - 1);
              }}
              className="px-3 md:px-4 py-1.5 md:py-2 rounded-lg border-2 transition-all hover:scale-105 hidden sm:block"
              style={{
                borderColor: colors.border,
                backgroundColor: colors.card,
                color: colors.text,
              }}
            >
              <span className="text-xs md:text-sm font-rajdhani font-black uppercase">
                Show All
              </span>
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {showAllData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            {/* Driver 1 Stats */}
            <div className="space-y-2 md:space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 md:w-3 h-2 md:h-3 rounded-full" style={{ backgroundColor: colors.turquoise }} />
                <span className="text-xs md:text-sm font-rajdhani font-bold uppercase" style={{ color: colors.text }}>
                  {data.driver}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                <div 
                  className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                  style={{ 
                    backgroundColor: colors.card,
                    borderColor: colors.turquoise,
                  }}
                >
                  <div className="flex items-center gap-1 md:gap-2 mb-1">
                    <Trophy size={12} className="md:w-3.5 md:h-3.5" style={{ color: colors.turquoise }} />
                    <div className="text-[10px] md:text-xs font-inter uppercase" style={{ color: colors.textSub }}>Best</div>
                  </div>
                  <div className="text-sm md:text-lg font-rajdhani font-black" style={{ color: colors.turquoise }}>
                    {formatLapTime(stats1.bestLap)}
                  </div>
                </div>
                <div 
                  className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                  style={{ 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }}
                >
                  <div className="text-[10px] md:text-xs font-inter uppercase mb-1" style={{ color: colors.textSub }}>Avg</div>
                  <div className="text-sm md:text-lg font-rajdhani font-black" style={{ color: colors.text }}>
                    {formatLapTime(stats1.avgLap)}
                  </div>
                </div>
                <div 
                  className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                  style={{ 
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  }}
                >
                  <div className="flex items-center gap-1 mb-1">
                    <TrendingDown size={12} className="md:w-3.5 md:h-3.5" style={{ color: stats1.degradation > 0 ? '#EF4444' : '#10B981' }} />
                    <div className="text-[10px] md:text-xs font-inter uppercase" style={{ color: colors.textSub }}>Deg</div>
                  </div>
                  <div 
                    className="text-sm md:text-lg font-rajdhani font-black" 
                    style={{ color: stats1.degradation > 0 ? '#EF4444' : '#10B981' }}
                  >
                    {stats1.degradation > 0 ? '+' : ''}{stats1.degradation.toFixed(2)}s
                  </div>
                </div>
              </div>
            </div>

            {/* Driver 2 Stats */}
            {hasDriver2 && stats2 && (
              <div className="space-y-2 md:space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 md:w-3 h-2 md:h-3 rounded-full" style={{ backgroundColor: colors.orange }} />
                  <span className="text-xs md:text-sm font-rajdhani font-bold uppercase" style={{ color: colors.text }}>
                    {data.driver2}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  <div 
                    className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                    style={{ 
                      backgroundColor: colors.card,
                      borderColor: colors.orange,
                    }}
                  >
                    <div className="flex items-center gap-1 md:gap-2 mb-1">
                      <Trophy size={12} className="md:w-3.5 md:h-3.5" style={{ color: colors.orange }} />
                      <div className="text-[10px] md:text-xs font-inter uppercase" style={{ color: colors.textSub }}>Best</div>
                    </div>
                    <div className="text-sm md:text-lg font-rajdhani font-black" style={{ color: colors.orange }}>
                      {formatLapTime(stats2.bestLap)}
                    </div>
                  </div>
                  <div 
                    className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                    style={{ 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <div className="text-[10px] md:text-xs font-inter uppercase mb-1" style={{ color: colors.textSub }}>Avg</div>
                    <div className="text-sm md:text-lg font-rajdhani font-black" style={{ color: colors.text }}>
                      {formatLapTime(stats2.avgLap)}
                    </div>
                  </div>
                  <div 
                    className="backdrop-blur-xl rounded-lg md:rounded-xl p-2 md:p-3 border-2"
                    style={{ 
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <TrendingDown size={12} className="md:w-3.5 md:h-3.5" style={{ color: stats2.degradation > 0 ? '#EF4444' : '#10B981' }} />
                      <div className="text-[10px] md:text-xs font-inter uppercase" style={{ color: colors.textSub }}>Deg</div>
                    </div>
                    <div 
                      className="text-sm md:text-lg font-rajdhani font-black" 
                      style={{ color: stats2.degradation > 0 ? '#EF4444' : '#10B981' }}
                    >
                      {stats2.degradation > 0 ? '+' : ''}{stats2.degradation.toFixed(2)}s
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CHART */}
        <div 
          className="backdrop-blur-xl rounded-xl md:rounded-2xl p-3 md:p-6 border-2"
          style={{ 
            backgroundColor: colors.card,
            borderColor: colors.border,
            boxShadow: `0 0 30px ${colors.turquoise}20`,
          }}
        >
          <ResponsiveContainer width="100%" height={400} className="md:h-[600px]">
            <LineChart 
              data={visibleData}
              margin={{ top: 100, right: 10, left: 0, bottom: 60 }}
            >
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={colors.grid}
                opacity={0.5}
              />
              <XAxis 
                dataKey="lapNumber" 
                stroke={colors.textSub}
                tick={{ fill: colors.textSub, fontSize: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 }}
                label={{ 
                  value: 'Lap Number', 
                  position: 'insideBottom', 
                  offset: -15, 
                  fill: colors.text,
                  style: { fontSize: 13, fontWeight: 'bold', fontFamily: 'Rajdhani, sans-serif' }
                }}
              />
              <YAxis 
                stroke={colors.textSub}
                tick={{ fill: colors.textSub, fontSize: 11, fontFamily: 'Rajdhani, sans-serif', fontWeight: 700 }}
                tickFormatter={(value) => formatLapTime(value)}
                label={{ 
                  value: 'Lap Time', 
                  angle: -90, 
                  position: 'insideLeft',
                  fill: colors.text,
                  style: { fontSize: 13, fontWeight: 'bold', fontFamily: 'Rajdhani, sans-serif' }
                }}
                domain={[yMin, yMax]}
                width={55}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.turquoise}`,
                  borderRadius: '12px',
                  padding: '12px',
                  boxShadow: `0 0 20px ${colors.turquoise}50`,
                }}
                labelStyle={{ 
                  color: colors.turquoise, 
                  fontWeight: 'bold',
                  fontFamily: 'Rajdhani, sans-serif',
                }}
                formatter={(value: any) => [formatLapTime(value), '']}
                labelFormatter={(label) => `LAP ${label}`}
              />

              {/* Driver 1 Line */}
              <Line 
                type="monotone" 
                dataKey="lapTime1" 
                stroke={colors.turquoise}
                strokeWidth={2.5}
                dot={(props) => <CustomDot {...props} dataKey="lapTime1" />}
                name={data.driver}
                connectNulls
                isAnimationActive={!showAllData}
                animationDuration={500}
                style={{
                  filter: `drop-shadow(0 0 8px ${colors.turquoise}60)`,
                }}
              />

              {/* Driver 2 Line */}
              {hasDriver2 && (
                <Line 
                  type="monotone" 
                  dataKey="lapTime2" 
                  stroke={colors.orange}
                  strokeWidth={2.5}
                  dot={(props) => <CustomDot {...props} dataKey="lapTime2" />}
                  name={data.driver2}
                  connectNulls
                  isAnimationActive={!showAllData}
                  animationDuration={500}
                  style={{
                    filter: `drop-shadow(0 0 8px ${colors.orange}60)`,
                  }}
                />
              )}

              <Legend 
                wrapperStyle={{
                  paddingTop: '20px',
                  fontFamily: 'Rajdhani, sans-serif',
                  fontWeight: 'bold',
                  fontSize: '12px',
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WATERMARK */}
      <div 
        className="absolute bottom-3 md:bottom-6 right-3 md:right-6 flex items-center gap-1 md:gap-2"
        style={{ opacity: 0.4 }}
      >
        <div className="text-xs md:text-sm font-rajdhani font-black tracking-wider" style={{ color: colors.text }}>
          METRIK
        </div>
        <div className="text-xs md:text-sm font-rajdhani font-black tracking-wider" style={{ color: colors.turquoise }}>
          DELTA
        </div>
        <div 
          className="w-6 md:w-8 h-6 md:h-8 rounded-full border-2 flex items-center justify-center"
          style={{ 
            backgroundColor: `${colors.turquoise}20`,
            borderColor: `${colors.turquoise}50`,
          }}
        >
          <Sparkles size={12} className="md:w-3.5 md:h-3.5" style={{ color: colors.turquoise }} />
        </div>
      </div>
    </div>
  );
}