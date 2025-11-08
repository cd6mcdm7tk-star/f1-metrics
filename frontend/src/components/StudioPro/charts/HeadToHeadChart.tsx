import { Sparkles, Trophy, Target, Zap, Flag, Award, TrendingDown } from 'lucide-react';

interface DriverStats {
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  qualiWins: number;
  raceWins: number;
  avgRacePosition: number;
  avgQualiPosition: number;
  fastestLaps: number;
  dnfs: number;
}

interface DriverData {
  code: string;
  name: string;
  team: string;
  stats: DriverStats;
}

interface HeadToHeadData {
  year: number;
  totalRaces: number;
  driver1: DriverData;
  driver2: DriverData;
}

interface HeadToHeadChartProps {
  data: HeadToHeadData;
}

const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'Oracle Red Bull Racing': '#3671C6',
  'Mercedes': '#27F4D2',
  'Ferrari': '#E8002D',
  'McLaren': '#FF8700',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'RB': '#6692FF',
  'Racing Bulls': '#6692FF',
  'Kick Sauber': '#52E252',
  'Sauber': '#52E252',
  'Haas F1 Team': '#B6BABD',
};

export default function HeadToHeadChart({ data }: HeadToHeadChartProps) {
  const isDark = true;

  const colors = {
    bg: isDark ? '#15171C' : '#FFFFFF',
    card: isDark ? '#1E2128' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#000000',
    textSub: isDark ? '#9CA3AF' : '#6B7280',
    turquoise: '#00E5CC',
    border: isDark ? '#2D3139' : '#E5E7EB',
  };

  const getTeamColor = (team: string) => TEAM_COLORS[team] || colors.turquoise;

  const driver1Color = getTeamColor(data.driver1.team);
  const driver2Color = getTeamColor(data.driver2.team);

  const allStats = [
    { key: 'wins', label: 'Race Wins', icon: Trophy },
    { key: 'podiums', label: 'Podiums', icon: Trophy },
    { key: 'poles', label: 'Pole Positions', icon: Zap },
    { key: 'points', label: 'Championship Points', icon: Target },
    { key: 'fastestLaps', label: 'Fastest Laps', icon: Award },
    { key: 'avgRacePosition', label: 'Avg Race Position', icon: Flag, decimal: true },
    { key: 'avgQualiPosition', label: 'Avg Quali Position', icon: Zap, decimal: true },
    { key: 'raceWins', label: 'Race Head-to-Head', icon: Trophy, highlight: true },
    { key: 'qualiWins', label: 'Quali Head-to-Head', icon: Zap, highlight: true },
    { key: 'dnfs', label: 'DNFs', icon: TrendingDown },
  ];

  const overallWinner = data.driver1.stats.points > data.driver2.stats.points ? data.driver1 : data.driver2;

  return (
    <div className="w-full min-h-screen relative" style={{ backgroundColor: colors.bg }}>
      <div className="max-w-[1400px] mx-auto p-8 md:p-12 space-y-3 md:space-y-4">
        
        {/* Header - RESPONSIVE */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-3 md:p-4 rounded-xl" style={{ backgroundColor: colors.card, borderLeft: `4px solid ${colors.turquoise}` }}>
          <div>
            <h1 className="text-lg md:text-2xl font-rajdhani font-black uppercase" style={{ color: colors.text }}>
              HEAD-TO-HEAD
            </h1>
            <p className="text-xs md:text-sm font-inter" style={{ color: colors.textSub }}>
              {data.year} Season • {data.totalRaces} races
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <Trophy size={24} className="md:w-8 md:h-8" style={{ color: colors.turquoise }} />
            <div className="text-left md:text-right">
              <div className="text-[10px] md:text-xs uppercase font-rajdhani font-bold" style={{ color: colors.textSub }}>
                Overall Winner
              </div>
              <div className="text-lg md:text-xl font-rajdhani font-black" style={{ color: getTeamColor(overallWinner.team) }}>
                {overallWinner.code}
              </div>
            </div>
          </div>
        </div>

        {/* Driver Headers - RESPONSIVE 2 Columns */}
        <div className="grid grid-cols-2 gap-2 md:gap-4">
          <div className="p-3 md:p-5 rounded-lg md:rounded-xl" style={{ backgroundColor: colors.card, border: `2px md:border-3 solid ${driver1Color}` }}>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-2xl font-rajdhani font-black flex-shrink-0" style={{ backgroundColor: driver1Color, color: '#FFF' }}>
                {data.driver1.code}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-sm md:text-xl font-rajdhani font-black" style={{ color: colors.text, wordBreak: 'break-word' }}>
                  {data.driver1.name}
                </div>
                <div className="text-[10px] md:text-sm font-rajdhani font-bold uppercase" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                  {data.driver1.team}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 md:p-5 rounded-lg md:rounded-xl" style={{ backgroundColor: colors.card, border: `2px md:border-3 solid ${driver2Color}` }}>
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-2xl font-rajdhani font-black flex-shrink-0" style={{ backgroundColor: driver2Color, color: '#FFF' }}>
                {data.driver2.code}
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <div className="text-sm md:text-xl font-rajdhani font-black" style={{ color: colors.text, wordBreak: 'break-word' }}>
                  {data.driver2.name}
                </div>
                <div className="text-[10px] md:text-sm font-rajdhani font-bold uppercase" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                  {data.driver2.team}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Statistics - RESPONSIVE LAYOUT */}
        <div className="p-3 md:p-5 rounded-xl" style={{ backgroundColor: colors.card, border: `2px solid ${colors.border}` }}>
          <h2 className="text-base md:text-lg font-rajdhani font-black uppercase mb-3 md:mb-4" style={{ color: colors.text }}>
            Complete Statistics
          </h2>

          <div className="space-y-2 md:space-y-3">
            {allStats.map((stat) => {
              const val1 = data.driver1.stats[stat.key as keyof DriverStats];
              const val2 = data.driver2.stats[stat.key as keyof DriverStats];
              const Icon = stat.icon;

              const inverse = ['avgRacePosition', 'avgQualiPosition', 'dnfs'].includes(stat.key);
              let winner: 'left' | 'right' | 'tie';
              
              if (inverse) {
                winner = val1 < val2 ? 'left' : val1 > val2 ? 'right' : 'tie';
              } else {
                winner = val1 > val2 ? 'left' : val1 < val2 ? 'right' : 'tie';
              }

              return (
                <div 
                  key={stat.key} 
                  className="space-y-2"
                  style={{
                    paddingTop: stat.highlight ? '8px' : '0',
                    marginTop: stat.highlight ? '8px' : '0',
                    borderTop: stat.highlight ? `2px solid ${colors.turquoise}40` : 'none',
                  }}
                >
                  {/* Stat Label - MOBILE FIRST */}
                  <div className="flex items-center justify-center gap-1.5 md:hidden">
                    <Icon size={12} style={{ color: stat.highlight ? colors.turquoise : colors.textSub }} />
                    <span className="text-[10px] font-rajdhani font-bold uppercase text-center" style={{ color: stat.highlight ? colors.turquoise : colors.textSub }}>
                      {stat.label}
                    </span>
                  </div>

                  {/* MOBILE: Stack vertically */}
                  <div className="flex md:hidden items-center justify-between gap-2">
                    {/* Driver 1 Value */}
                    <div className="flex-1 text-right">
                      <div 
                        className="inline-block px-2 py-1.5 rounded-lg w-full max-w-[120px]"
                        style={{
                          backgroundColor: winner === 'left' ? driver1Color : 'transparent',
                          border: `2px solid ${driver1Color}`,
                        }}
                      >
                        <span 
                          className="text-base font-rajdhani font-black" 
                          style={{ color: winner === 'left' ? '#FFF' : driver1Color }}
                        >
                          {stat.decimal ? val1.toFixed(1) : val1}
                        </span>
                      </div>
                    </div>

                    {/* Driver 2 Value */}
                    <div className="flex-1 text-left">
                      <div 
                        className="inline-block px-2 py-1.5 rounded-lg w-full max-w-[120px]"
                        style={{
                          backgroundColor: winner === 'right' ? driver2Color : 'transparent',
                          border: `2px solid ${driver2Color}`,
                        }}
                      >
                        <span 
                          className="text-base font-rajdhani font-black" 
                          style={{ color: winner === 'right' ? '#FFF' : driver2Color }}
                        >
                          {stat.decimal ? val2.toFixed(1) : val2}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DESKTOP: Grid 12 columns */}
                  <div className="hidden md:grid grid-cols-12 gap-3 items-center">
                    {/* Driver 1 Value */}
                    <div className="col-span-4 text-right">
                      <div 
                        className="inline-block px-4 py-2 rounded-lg min-w-[100px]"
                        style={{
                          backgroundColor: winner === 'left' ? driver1Color : 'transparent',
                          border: `2px solid ${driver1Color}`,
                        }}
                      >
                        <span 
                          className="text-xl font-rajdhani font-black" 
                          style={{ color: winner === 'left' ? '#FFF' : driver1Color }}
                        >
                          {stat.decimal ? val1.toFixed(1) : val1}
                        </span>
                      </div>
                    </div>

                    {/* Stat Label */}
                    <div className="col-span-4 flex items-center justify-center gap-2">
                      <Icon size={16} style={{ color: stat.highlight ? colors.turquoise : colors.textSub }} />
                      <span className="text-sm font-rajdhani font-bold uppercase text-center" style={{ color: stat.highlight ? colors.turquoise : colors.textSub }}>
                        {stat.label}
                      </span>
                    </div>

                    {/* Driver 2 Value */}
                    <div className="col-span-4 text-left">
                      <div 
                        className="inline-block px-4 py-2 rounded-lg min-w-[100px]"
                        style={{
                          backgroundColor: winner === 'right' ? driver2Color : 'transparent',
                          border: `2px solid ${driver2Color}`,
                        }}
                      >
                        <span 
                          className="text-xl font-rajdhani font-black" 
                          style={{ color: winner === 'right' ? '#FFF' : driver2Color }}
                        >
                          {stat.decimal ? val2.toFixed(1) : val2}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Watermark - RESPONSIVE */}
      <div className="absolute bottom-2 right-3 md:bottom-4 md:right-6 flex items-center gap-1.5 md:gap-2 opacity-40">
        <span className="text-[10px] md:text-sm font-black tracking-wider font-rajdhani" style={{ color: colors.text }}>METRIK</span>
        <span className="text-[10px] md:text-sm font-black tracking-wider font-rajdhani" style={{ color: colors.turquoise }}>DELTA</span>
        <Sparkles size={12} className="md:w-3.5 md:h-3.5" style={{ color: colors.turquoise }} />
      </div>
    </div>
  );
}