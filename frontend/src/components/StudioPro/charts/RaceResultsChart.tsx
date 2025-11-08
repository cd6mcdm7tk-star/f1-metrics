import { Sparkles, Flag, Trophy } from 'lucide-react';

interface RaceResult {
  position: number;
  driver: string;
  driverCode: string;
  team: string;
  bestLapTime: number | null;
  pitStops: number;
  tireStrategy: string[];
  status: string;
  gap: number | null;
  gapType: string;
  totalLaps: number;
}

interface RaceResultsData {
  year: number;
  round: number;
  raceName: string;
  circuitName: string;
  results: RaceResult[];
}

interface RaceResultsChartProps {
  data: RaceResultsData;
}

const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'Oracle Red Bull Racing': '#3671C6',
  'Mercedes': '#27F4D2',
  'Mercedes-AMG Petronas': '#27F4D2',
  'Ferrari': '#E8002D',
  'Scuderia Ferrari': '#E8002D',
  'McLaren': '#FF8700',
  'McLaren F1 Team': '#FF8700',
  'Aston Martin': '#229971',
  'Aston Martin Aramco': '#229971',
  'Alpine': '#FF87BC',
  'BWT Alpine F1 Team': '#FF87BC',
  'Williams': '#64C4FF',
  'Williams Racing': '#64C4FF',
  'RB': '#6692FF',
  'Racing Bulls': '#6692FF',
  'Visa Cash App RB': '#6692FF',
  'Kick Sauber': '#52E252',
  'Sauber': '#52E252',
  'Haas F1 Team': '#B6BABD',
  'Haas': '#B6BABD',
};

const TIRE_COLORS: Record<string, string> = {
  'SOFT': '#E8002D',
  'MEDIUM': '#FFD700',
  'HARD': '#F0F0F0',
  'INTERMEDIATE': '#43B02A',
  'WET': '#0067AD',
};

export default function RaceResultsChart({ data }: RaceResultsChartProps) {
  const isDark = true;

  const colors = {
    bg: isDark ? '#15171C' : '#FFFFFF',
    card: isDark ? '#1E2128' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#000000',
    textSub: isDark ? '#9CA3AF' : '#6B7280',
    turquoise: '#00E5CC',
    border: isDark ? '#2D3139' : '#E5E7EB',
    gold: '#FFD700',
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getTeamColor = (team: string) => {
    return TEAM_COLORS[team] || colors.turquoise;
  };

  const getTireColor = (compound: string) => {
    return TIRE_COLORS[compound.toUpperCase()] || colors.textSub;
  };

  const winner = data.results[0];

  return (
    <div 
      className="w-full min-h-screen relative"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="max-w-[1200px] mx-auto p-8 md:p-12 space-y-3 md:space-y-6">
        
        {/* BANNIÈRE - RESPONSIVE */}
        <div 
          className="rounded-lg md:rounded-xl p-3 md:p-6"
          style={{
            backgroundColor: colors.card,
            borderLeft: `3px md:border-4 solid ${colors.turquoise}`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            <div className="flex items-center gap-3 md:gap-5">
              <div 
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ 
                  backgroundColor: `${colors.turquoise}15`,
                  border: `2px solid ${colors.turquoise}`,
                }}
              >
                <Flag size={20} className="md:w-6 md:h-6" style={{ color: colors.turquoise }} />
              </div>

              <div>
                <h1 className="text-lg md:text-2xl font-rajdhani font-black uppercase tracking-wide mb-0.5 md:mb-1" style={{ color: colors.text }}>
                  RACE RESULTS
                </h1>
                <div className="flex flex-wrap items-center gap-1.5 md:gap-3 text-xs md:text-sm font-rajdhani font-bold" style={{ color: colors.textSub }}>
                  <span className="truncate max-w-[120px] md:max-w-none">{data.raceName}</span>
                  <span className="hidden md:inline">•</span>
                  <span className="truncate max-w-[120px] md:max-w-none">{data.circuitName}</span>
                  <span>•</span>
                  <span style={{ color: colors.turquoise }}>{data.year} R{data.round}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <Trophy size={20} className="md:w-6 md:h-6" style={{ color: colors.gold }} />
              <div>
                <div className="text-[10px] md:text-xs font-rajdhani font-black uppercase tracking-wider" style={{ color: colors.textSub }}>
                  WINNER
                </div>
                <div className="text-base md:text-xl font-rajdhani font-black" style={{ color: colors.text }}>
                  {winner.driverCode}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MOBILE: Cards Layout */}
        <div className="md:hidden space-y-2">
          {data.results.map((result) => {
            const teamColor = getTeamColor(result.team);
            const isWinner = result.position === 1;

            return (
              <div
                key={result.position}
                className="rounded-lg p-3"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${isWinner ? colors.gold : colors.border}`,
                  boxShadow: isWinner ? `0 0 12px ${colors.gold}40` : 'none',
                }}
              >
                {/* Position + Driver */}
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base font-black font-rajdhani flex-shrink-0"
                    style={{
                      backgroundColor: isWinner ? colors.gold : colors.card,
                      color: isWinner ? '#000' : colors.text,
                      border: `2px solid ${isWinner ? colors.gold : colors.border}`,
                    }}
                  >
                    {result.position}
                  </div>

                  <div 
                    className="w-1 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: teamColor }}
                  />

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black uppercase font-rajdhani" style={{ color: colors.text }}>
                      {result.driverCode}
                    </div>
                    <div className="text-[10px] font-bold uppercase truncate font-rajdhani" style={{ color: colors.textSub }}>
                      {result.team}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  {/* Best Lap */}
                  <div>
                    <div className="text-[10px] font-rajdhani font-bold uppercase mb-0.5" style={{ color: colors.textSub }}>
                      Best Lap
                    </div>
                    <div className="text-xs font-black font-rajdhani" style={{ color: colors.text }}>
                      {formatTime(result.bestLapTime)}
                    </div>
                  </div>

                  {/* Gap */}
                  <div>
                    <div className="text-[10px] font-rajdhani font-bold uppercase mb-0.5" style={{ color: colors.textSub }}>
                      Gap
                    </div>
                    <div className="text-xs font-bold font-rajdhani" style={{ color: colors.text }}>
                      {result.position === 1 ? '—' : 
                       result.gapType === 'laps' ? `+${result.gap}L` :
                       result.gapType === 'time' && result.gap !== null ? `+${result.gap.toFixed(1)}s` : '—'}
                    </div>
                  </div>

                  {/* Stops */}
                  <div>
                    <div className="text-[10px] font-rajdhani font-bold uppercase mb-0.5" style={{ color: colors.textSub }}>
                      Stops
                    </div>
                    <div className="text-xs font-black font-rajdhani" style={{ color: colors.text }}>
                      {result.pitStops}
                    </div>
                  </div>
                </div>

                {/* Tire Strategy */}
                <div className="flex items-center justify-center gap-1 mt-2 pt-2" style={{ borderTop: `1px solid ${colors.border}` }}>
                  {result.tireStrategy.map((tire, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full border"
                      style={{
                        backgroundColor: getTireColor(tire),
                        borderColor: colors.border,
                      }}
                      title={tire}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP: Table Layout */}
        <div 
          className="hidden md:block rounded-xl overflow-hidden"
          style={{
            backgroundColor: colors.card,
            border: `2px solid ${colors.border}`,
          }}
        >
          {/* Header */}
          <div 
            className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-rajdhani font-black uppercase tracking-wider"
            style={{
              backgroundColor: `${colors.turquoise}15`,
              borderBottom: `2px solid ${colors.border}`,
              color: colors.turquoise,
            }}
          >
            <div className="col-span-1 text-center">POS</div>
            <div className="col-span-3">DRIVER</div>
            <div className="col-span-2 text-center">BEST LAP</div>
            <div className="col-span-2 text-center">STRATEGY</div>
            <div className="col-span-1 text-center">STOPS</div>
            <div className="col-span-2 text-center">GAP</div>
            <div className="col-span-1 text-center">LAPS</div>
          </div>

          {/* Rows */}
          <div>
            {data.results.map((result, idx) => {
              const teamColor = getTeamColor(result.team);
              const isWinner = result.position === 1;

              return (
                <div
                  key={result.position}
                  className="grid grid-cols-12 gap-3 px-6 py-4 transition-all duration-200 hover:bg-opacity-50"
                  style={{
                    backgroundColor: idx % 2 === 0 ? colors.card : `${colors.border}30`,
                    borderBottom: idx < data.results.length - 1 ? `1px solid ${colors.border}` : 'none',
                  }}
                >
                  {/* Position */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl font-black font-rajdhani"
                      style={{
                        backgroundColor: isWinner ? colors.gold : colors.card,
                        color: isWinner ? '#000' : colors.text,
                        border: `2px solid ${isWinner ? colors.gold : colors.border}`,
                        boxShadow: isWinner ? `0 0 16px ${colors.gold}60` : 'none',
                      }}
                    >
                      {result.position}
                    </div>
                  </div>

                  {/* Driver */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div 
                      className="w-1.5 h-10 rounded-full"
                      style={{ backgroundColor: teamColor }}
                    />
                    <div className="flex-1 min-w-0 pr-3">
                      <div className="text-base font-black uppercase font-rajdhani" style={{ color: colors.text, wordBreak: 'break-word' }}>
                        {result.driverCode}
                      </div>
                      <div className="text-xs font-bold uppercase font-rajdhani" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                        {result.team}
                      </div>
                    </div>
                  </div>

                  {/* Best Lap */}
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-sm font-black font-rajdhani" style={{ color: colors.text }}>
                      {formatTime(result.bestLapTime)}
                    </div>
                  </div>

                  {/* Tire Strategy */}
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    {result.tireStrategy.map((tire, i) => (
                      <div
                        key={i}
                        className="w-6 h-6 rounded-full border-2"
                        style={{
                          backgroundColor: getTireColor(tire),
                          borderColor: colors.border,
                        }}
                        title={tire}
                      />
                    ))}
                  </div>

                  {/* Pit Stops */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="text-sm font-black font-rajdhani" style={{ color: colors.text }}>
                      {result.pitStops}
                    </div>
                  </div>

                  {/* Gap */}
                  <div className="col-span-2 flex items-center justify-center">
                    <div className="text-sm font-bold font-rajdhani" style={{ color: colors.textSub }}>
                      {result.position === 1 ? '—' : 
                       result.gapType === 'laps' ? `+${result.gap} ${result.gap > 1 ? 'laps' : 'lap'}` :
                       result.gapType === 'time' && result.gap !== null ? `+${result.gap.toFixed(3)}s` : '—'}
                    </div>
                  </div>

                  {/* Total Laps */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="text-sm font-bold font-rajdhani" style={{ color: colors.textSub }}>
                      {result.totalLaps}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Watermark - RESPONSIVE */}
      <div className="absolute bottom-2 right-3 md:bottom-6 md:right-8 flex items-center gap-1.5 md:gap-2 opacity-40">
        <span className="text-[10px] md:text-sm font-black tracking-wider font-rajdhani" style={{ color: colors.text }}>
          METRIK
        </span>
        <span className="text-[10px] md:text-sm font-black tracking-wider font-rajdhani" style={{ color: colors.turquoise }}>
          DELTA
        </span>
        <div 
          className="w-6 h-6 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center"
          style={{ 
            backgroundColor: `${colors.turquoise}15`,
            borderColor: `${colors.turquoise}60`,
          }}
        >
          <Sparkles size={10} className="md:w-3.5 md:h-3.5" style={{ color: colors.turquoise }} />
        </div>
      </div>
    </div>
  );
}