import { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Sparkles, Trophy, Zap } from 'lucide-react';

interface TelemetryBattleData {
  telemetry: Array<{
    distance: number;
    speed1: number;
    speed2: number;
    throttle1: number;
    throttle2: number;
    brake1: boolean;
    brake2: boolean;
    gear1: number;
    gear2: number;
    drs1: number;
    drs2: number;
    x: number | null;
    y: number | null;
  }>;
  lapTime1: number;
  lapTime2: number;
  driver1: string;
  driver2: string;
}

interface TelemetryBattleChartProps {
  data: TelemetryBattleData;
}

export default function TelemetryBattleChart({ data }: TelemetryBattleChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  
  // 🛡️ PROTECTION : Vérifier que data existe
  if (!data || !data.telemetry || data.telemetry.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] md:h-[600px] text-metrik-silver">
        <div className="text-center px-4">
          <p className="text-lg md:text-xl font-rajdhani font-bold mb-2">No telemetry data available</p>
          <p className="text-xs md:text-sm">Please select 2 drivers and generate the chart</p>
        </div>
      </div>
    );
  }
  
  // 🎨 METRIK DELTA COLOR PALETTE
  const colors = {
    bg: '#0A0F1E',
    card: 'rgba(15, 23, 41, 0.95)',
    text: '#F9FAFB',
    textSub: '#9CA3AF',
    turquoise: '#00E5CC',
    cyan: '#22D3EE',
    grid: 'rgba(0, 229, 204, 0.15)',
    border: 'rgba(0, 229, 204, 0.3)',
  };

  // Driver colors
  const driver1Color = colors.turquoise;
  const driver2Color = '#FF8700';

  // Format telemetry data
  const chartData = useMemo(() => {
    if (!data || !data.telemetry || data.telemetry.length === 0) {
      return [];
    }
    
    return data.telemetry.map((point, index) => ({
      index,
      distance: point.distance,
      speed1: point.speed1,
      speed2: point.speed2,
      throttle1: point.throttle1,
      throttle2: point.throttle2,
      brake1: point.brake1 ? 100 : 0,
      brake2: point.brake2 ? 100 : 0,
      gear1: point.gear1,
      gear2: point.gear2,
      x: point.x,
      y: point.y,
    }));
  }, [data]);

  // Calculate track bounds for SVG
  const trackBounds = useMemo(() => {
    const xValues = chartData.filter(d => d.x !== null).map(d => d.x as number);
    const yValues = chartData.filter(d => d.y !== null).map(d => d.y as number);
    
    if (xValues.length === 0 || yValues.length === 0) {
      return { minX: 0, maxX: 100, minY: 0, maxY: 100, width: 100, height: 100 };
    }
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [chartData]);

  // Format lap times
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Calculate delta
  const delta = Math.abs(data.lapTime1 - data.lapTime2);
  const isFasterDriver1 = data.lapTime1 < data.lapTime2;

  // Current point for cursor
  const currentPoint = hoveredIndex !== null ? chartData[hoveredIndex] : null;

  return (
    <div 
      className="w-full h-full p-4 md:p-8 rounded-xl md:rounded-2xl backdrop-blur-xl shadow-2xl relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${colors.bg} 0%, rgba(0, 229, 204, 0.05) 100%)`,
        border: `2px solid ${colors.border}`,
        boxShadow: `0 0 40px ${colors.turquoise}20`,
      }}
    >
      {/* GLASS MORPHISM BACKGROUND */}
      <div className="absolute inset-0 bg-gradient-to-br from-metrik-turquoise/5 to-transparent pointer-events-none" />

      {/* HEADER */}
      <div className="relative mb-3 md:mb-6 pb-3 md:pb-4 border-b-2" style={{ borderColor: colors.border }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
          {/* Title */}
          <div>
            <h2 
              className="text-xl md:text-3xl font-rajdhani font-black uppercase tracking-wider flex items-center gap-2 md:gap-3"
              style={{ 
                color: colors.text,
                textShadow: `0 0 20px ${colors.turquoise}50`
              }}
            >
              <Zap className="text-metrik-turquoise" size={20} />
              <span>TELEMETRY</span>
              <span className="hidden md:inline">BATTLE</span>
            </h2>
            <p className="text-xs md:text-sm font-inter mt-1" style={{ color: colors.textSub }}>
              Fastest Lap Comparison
            </p>
          </div>

          {/* Lap Time Comparison */}
          <div className="flex items-center gap-2 md:gap-4 text-sm md:text-base">
            {/* Driver 1 */}
            <div 
              className="px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl backdrop-blur-md"
              style={{
                background: colors.card,
                border: `2px solid ${isFasterDriver1 ? driver1Color : colors.border}`,
                boxShadow: isFasterDriver1 ? `0 0 15px ${driver1Color}40` : 'none',
              }}
            >
              <div className="text-xs font-inter uppercase tracking-wider" style={{ color: driver1Color }}>
                {data.driver1}
              </div>
              <div className="text-sm md:text-xl font-rajdhani font-black flex items-center gap-1 md:gap-2" style={{ color: driver1Color }}>
                {isFasterDriver1 && <Trophy size={12} className="md:w-4 md:h-4" />}
                <span className="text-xs md:text-xl">{formatTime(data.lapTime1)}</span>
              </div>
            </div>

            {/* Delta */}
            <div 
              className="text-sm md:text-lg font-rajdhani font-black px-2 md:px-3 py-1 rounded-lg"
              style={{ 
                color: isFasterDriver1 ? driver1Color : driver2Color,
                background: `${isFasterDriver1 ? driver1Color : driver2Color}15`,
              }}
            >
              +{delta.toFixed(3)}s
            </div>

            {/* Driver 2 */}
            <div 
              className="px-2 md:px-4 py-1.5 md:py-2 rounded-lg md:rounded-xl backdrop-blur-md"
              style={{
                background: colors.card,
                border: `2px solid ${!isFasterDriver1 ? driver2Color : colors.border}`,
                boxShadow: !isFasterDriver1 ? `0 0 15px ${driver2Color}40` : 'none',
              }}
            >
              <div className="text-xs font-inter uppercase tracking-wider" style={{ color: driver2Color }}>
                {data.driver2}
              </div>
              <div className="text-sm md:text-xl font-rajdhani font-black flex items-center gap-1 md:gap-2" style={{ color: driver2Color }}>
                {!isFasterDriver1 && <Trophy size={12} className="md:w-4 md:h-4" />}
                <span className="text-xs md:text-xl">{formatTime(data.lapTime2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TRACK VISUALIZATION */}
      <div className="relative mb-3 md:mb-4">
        <h3 
          className="text-xs md:text-sm font-rajdhani font-bold uppercase tracking-wider mb-2"
          style={{ color: colors.text }}
        >
          🏎️ TRACK DOMINANCE
        </h3>
        <div 
          className="w-full rounded-lg md:rounded-xl p-4 md:p-8 relative overflow-hidden h-[200px] md:h-[380px]"
          style={{
            background: '#000000',
            border: `2px solid ${colors.border}`,
          }}
        >
          <svg
            viewBox={`${trackBounds.minX - 120} ${trackBounds.minY - 120} ${trackBounds.width + 240} ${trackBounds.height + 240}`}
            className="w-full h-full"
            style={{ transform: 'scaleY(-1)' }}
            preserveAspectRatio="xMidYMid meet"
          >
            {/* CONTOUR BLANC */}
            <path
              d={chartData
                .filter(d => d.x !== null && d.y !== null)
                .map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`)
                .join(' ')}
              fill="none"
              stroke="white"
              strokeWidth="60"
              strokeOpacity="1"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* FOND NOIR */}
            <path
              d={chartData
                .filter(d => d.x !== null && d.y !== null)
                .map((d, i) => `${i === 0 ? 'M' : 'L'} ${d.x} ${d.y}`)
                .join(' ')}
              fill="none"
              stroke="#000000"
              strokeWidth="45"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* SEGMENTS COLORÉS */}
            {chartData.map((point, i) => {
              if (i === 0 || point.x === null || point.y === null) return null;
              
              const prevPoint = chartData[i - 1];
              if (prevPoint.x === null || prevPoint.y === null) return null;
              
              const driver1Ahead = point.speed1 > point.speed2;
              const segmentColor = driver1Ahead ? driver1Color : driver2Color;
              
              return (
                <line
                  key={i}
                  x1={prevPoint.x}
                  y1={prevPoint.y}
                  x2={point.x}
                  y2={point.y}
                  stroke={segmentColor}
                  strokeWidth="36"
                  strokeOpacity="1"
                  strokeLinecap="round"
                />
              );
            })}

            {/* POINT BLANC CURSOR */}
            {currentPoint && currentPoint.x !== null && currentPoint.y !== null && (
              <g>
                <circle cx={currentPoint.x} cy={currentPoint.y} r="120" fill="white" opacity="0.2" />
                <circle cx={currentPoint.x} cy={currentPoint.y} r="80" fill="white" opacity="0.4" />
                <circle cx={currentPoint.x} cy={currentPoint.y} r="50" fill="white" opacity="0.6" />
                <circle cx={currentPoint.x} cy={currentPoint.y} r="40" fill="white" opacity="1" />
                <circle cx={currentPoint.x} cy={currentPoint.y} r="40" fill="none" stroke={colors.turquoise} strokeWidth="6" />
                <circle cx={currentPoint.x} cy={currentPoint.y} r="14" fill={colors.turquoise} />
              </g>
            )}
          </svg>
        </div>
      </div>

      {/* SYNCHRONIZED CHARTS - RESPONSIVE */}
      <div className="space-y-2 md:space-y-3">
        {/* SPEED CHART */}
        <div>
          <h3 
            className="text-xs md:text-sm font-rajdhani font-bold uppercase tracking-wider mb-1 md:mb-2 flex items-center gap-2"
            style={{ color: colors.text }}
          >
            <div className="w-1 h-3 md:h-4 rounded-full bg-gradient-to-b from-metrik-turquoise to-orange-500" />
            SPEED
          </h3>
          <ResponsiveContainer width="100%" height={120}>
            <LineChart 
              data={chartData} 
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
              onMouseMove={(e: any) => {
                if (e && e.activeTooltipIndex !== undefined) {
                  setHoveredIndex(e.activeTooltipIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} strokeWidth={1} />
              <XAxis dataKey="distance" hide />
              <YAxis 
                stroke={colors.textSub}
                tick={{ fill: colors.textSub, fontSize: 9 }}
                width={45}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: colors.bg, 
                  border: `2px solid ${colors.turquoise}`,
                  borderRadius: '8px',
                  fontSize: '10px',
                }}
              />
              {hoveredIndex !== null && (
                <ReferenceLine 
                  x={chartData[hoveredIndex]?.distance} 
                  stroke="white" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}
              <Line 
                type="monotone" 
                dataKey="speed1" 
                stroke={driver1Color}
                strokeWidth={2}
                dot={false}
                name={data.driver1}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="speed2" 
                stroke={driver2Color}
                strokeWidth={2}
                dot={false}
                name={data.driver2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* THROTTLE & BRAKE - TOUJOURS EMPILÉS VERTICALEMENT */}
        <div className="space-y-2 md:space-y-3">
          {/* THROTTLE */}
          <div>
            <h3 
              className="text-xs md:text-sm font-rajdhani font-bold uppercase tracking-wider mb-1 md:mb-2"
              style={{ color: colors.text }}
            >
              🟢 THROTTLE
            </h3>
            <ResponsiveContainer width="100%" height={120} className="md:h-[150px]">
              <LineChart 
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    setHoveredIndex(e.activeTooltipIndex);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="distance" hide />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: colors.textSub, fontSize: 9 }} 
                  width={45}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: colors.bg, 
                    border: `2px solid ${colors.turquoise}`,
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
                {hoveredIndex !== null && (
                  <ReferenceLine 
                    x={chartData[hoveredIndex]?.distance} 
                    stroke="white" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="throttle1" 
                  stroke={driver1Color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="throttle2" 
                  stroke={driver2Color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* BRAKE */}
          <div>
            <h3 
              className="text-xs md:text-sm font-rajdhani font-bold uppercase tracking-wider mb-1 md:mb-2"
              style={{ color: colors.text }}
            >
              🔴 BRAKING
            </h3>
            <ResponsiveContainer width="100%" height={120} className="md:h-[150px]">
              <LineChart 
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                onMouseMove={(e: any) => {
                  if (e && e.activeTooltipIndex !== undefined) {
                    setHoveredIndex(e.activeTooltipIndex);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="distance" hide />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fill: colors.textSub, fontSize: 9 }} 
                  width={45}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: colors.bg, 
                    border: `2px solid ${colors.turquoise}`,
                    borderRadius: '8px',
                    fontSize: '10px',
                  }}
                />
                {hoveredIndex !== null && (
                  <ReferenceLine 
                    x={chartData[hoveredIndex]?.distance} 
                    stroke="white" 
                    strokeWidth={2}
                    strokeDasharray="3 3"
                  />
                )}
                <Line 
                  type="stepAfter" 
                  dataKey="brake1" 
                  stroke={driver1Color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="brake2" 
                  stroke={driver2Color}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GEAR */}
        <div>
          <h3 
            className="text-xs md:text-sm font-rajdhani font-bold uppercase tracking-wider mb-1 md:mb-2"
            style={{ color: colors.text }}
          >
            ⚙️ GEAR
          </h3>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart 
              data={chartData}
              margin={{ top: 5, right: 10, left: 0, bottom: 15 }}
              onMouseMove={(e: any) => {
                if (e && e.activeTooltipIndex !== undefined) {
                  setHoveredIndex(e.activeTooltipIndex);
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis 
                dataKey="distance" 
                stroke={colors.textSub}
                tick={{ fill: colors.textSub, fontSize: 9 }}
                label={{ value: 'Distance (m)', position: 'insideBottom', offset: -8, fill: colors.text, fontSize: 9 }}
              />
              <YAxis 
                domain={[0, 8]} 
                tick={{ fill: colors.textSub, fontSize: 9 }} 
                width={45}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: colors.bg, 
                  border: `2px solid ${colors.turquoise}`,
                  borderRadius: '8px',
                  fontSize: '10px',
                }}
              />
              {hoveredIndex !== null && (
                <ReferenceLine 
                  x={chartData[hoveredIndex]?.distance} 
                  stroke="white" 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                />
              )}
              <Line 
                type="stepAfter" 
                dataKey="gear1" 
                stroke={driver1Color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="stepAfter" 
                dataKey="gear2" 
                stroke={driver2Color}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* WATERMARK */}
      <div 
        className="absolute bottom-2 md:bottom-4 right-2 md:right-4 flex items-center gap-1 md:gap-2 opacity-60"
        style={{ color: colors.turquoise }}
      >
        <Sparkles size={12} className="md:w-3.5 md:h-3.5" />
        <span className="text-[10px] md:text-xs font-rajdhani font-black tracking-wider">
          METRIK DELTA
        </span>
      </div>
    </div>
  );
}