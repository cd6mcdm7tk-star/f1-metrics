import { Sparkles, Flag } from 'lucide-react';

interface GridResult {
  position: number;
  driver: string;
  driverCode: string;
  team: string;
  time: number;
  gap: number | null;
}

interface StartingGridData {
  year: number;
  round: number;
  raceName: string;
  circuitName: string;
  results: GridResult[];
}

interface StartingGridChartProps {
  data: StartingGridData;
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

export default function StartingGridChart({ data }: StartingGridChartProps) {
  const isDark = true;

  const colors = {
    bg: isDark ? '#15171C' : '#FFFFFF',
    card: isDark ? '#1E2128' : '#F8F9FA',
    text: isDark ? '#FFFFFF' : '#000000',
    textSub: isDark ? '#9CA3AF' : '#6B7280',
    turquoise: '#00E5CC',
    border: isDark ? '#2D3139' : '#E5E7EB',
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const getTeamColor = (team: string) => {
    return TEAM_COLORS[team] || colors.turquoise;
  };

  // Séparer colonnes gauche (impair) et droite (pair) pour DESKTOP
  const leftColumn = data.results.filter((_, idx) => idx % 2 === 0);
  const rightColumn = data.results.filter((_, idx) => idx % 2 === 1);

  const poleDriver = data.results[0];

  return (
    <div 
      className="w-full min-h-screen relative"
      style={{ backgroundColor: colors.bg }}
    >
      <div className="max-w-[1000px] mx-auto p-8 md:p-12 space-y-3 md:space-y-6">
        
        {/* BANNIÈRE - RESPONSIVE */}
        <div 
          className="rounded-lg md:rounded-xl p-3 md:p-6"
          style={{
            backgroundColor: colors.card,
            borderLeft: `3px md:border-4 solid ${colors.turquoise}`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-0">
            {/* Left: Title + Info */}
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
                  STARTING GRID
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

            {/* Right: Pole */}
            <div className="flex items-baseline gap-1.5 md:gap-2">
              <span className="text-xs md:text-sm font-rajdhani font-black uppercase tracking-wider" style={{ color: colors.textSub }}>
                POLE:
              </span>
              <span className="text-base md:text-xl font-rajdhani font-black" style={{ color: colors.text }}>
                {poleDriver.driverCode}
              </span>
              <span className="text-sm md:text-base font-rajdhani font-bold" style={{ color: colors.turquoise }}>
                {formatTime(poleDriver.time)}
              </span>
            </div>
          </div>
        </div>

        {/* STARTING GRID - RESPONSIVE */}
        {/* MOBILE: 1 colonne */}
        <div className="md:hidden space-y-2">
          {data.results.map((result) => (
            <div
              key={result.position}
              className="rounded-lg p-3 transition-all duration-200"
              style={{
                backgroundColor: colors.card,
                border: `2px solid ${colors.turquoise}`,
                boxShadow: `0 2px 8px ${colors.turquoise}20`,
              }}
            >
              <div className="flex items-center gap-2">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-lg font-black font-rajdhani flex-shrink-0"
                  style={{
                    backgroundColor: colors.card,
                    color: colors.text,
                    border: `2px solid ${colors.border}`,
                  }}
                >
                  {result.position}
                </div>

                <div 
                  className="w-1 h-9 rounded-full flex-shrink-0"
                  style={{ 
                    backgroundColor: getTeamColor(result.team),
                    boxShadow: `0 0 8px ${getTeamColor(result.team)}50`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 mb-0.5">
                    <div className="text-base font-black uppercase truncate font-rajdhani" style={{ color: colors.text }}>
                      {result.driverCode}
                    </div>
                    <div className="text-xs font-bold truncate font-rajdhani" style={{ color: colors.textSub }}>
                      {result.driver}
                    </div>
                  </div>
                  <div className="text-[10px] font-bold uppercase truncate mb-0.5 font-rajdhani" style={{ color: colors.textSub }}>
                    {result.team}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <div className="text-sm font-black font-rajdhani" style={{ color: colors.text }}>
                      {formatTime(result.time)}
                    </div>
                    {result.gap && (
                      <div className="text-[10px] font-bold font-rajdhani" style={{ color: colors.textSub }}>
                        +{result.gap.toFixed(3)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP: 2 colonnes décalées */}
        <div className="hidden md:grid grid-cols-2 gap-8">
          
          {/* COLONNE GAUCHE */}
          <div className="space-y-3">
            {leftColumn.map((result) => (
              <div
                key={result.position}
                className="rounded-lg p-4 transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.turquoise}`,
                  boxShadow: `0 4px 12px ${colors.turquoise}20`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-black font-rajdhani flex-shrink-0"
                    style={{
                      backgroundColor: colors.card,
                      color: colors.text,
                      border: `2px solid ${colors.border}`,
                    }}
                  >
                    {result.position}
                  </div>

                  <div 
                    className="w-1.5 h-12 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: getTeamColor(result.team),
                      boxShadow: `0 0 10px ${getTeamColor(result.team)}50`,
                    }}
                  />

                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <div className="text-lg font-black uppercase font-rajdhani" style={{ color: colors.text, wordBreak: 'break-word' }}>
                        {result.driverCode}
                      </div>
                      <div className="text-sm font-bold font-rajdhani" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                        {result.driver}
                      </div>
                    </div>
                    <div className="text-xs font-bold uppercase mb-1 font-rajdhani" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                      {result.team}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-base font-black font-rajdhani" style={{ color: colors.text }}>
                        {formatTime(result.time)}
                      </div>
                      {result.gap && (
                        <div className="text-xs font-bold font-rajdhani" style={{ color: colors.textSub }}>
                          +{result.gap.toFixed(3)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* COLONNE DROITE - DÉCALÉE */}
          <div className="space-y-3" style={{ marginTop: '40px' }}>
            {rightColumn.map((result) => (
              <div
                key={result.position}
                className="rounded-lg p-4 transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: colors.card,
                  border: `2px solid ${colors.turquoise}`,
                  boxShadow: `0 4px 12px ${colors.turquoise}20`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl font-black font-rajdhani flex-shrink-0"
                    style={{
                      backgroundColor: colors.card,
                      color: colors.text,
                      border: `2px solid ${colors.border}`,
                    }}
                  >
                    {result.position}
                  </div>

                  <div 
                    className="w-1.5 h-12 rounded-full flex-shrink-0"
                    style={{ 
                      backgroundColor: getTeamColor(result.team),
                      boxShadow: `0 0 10px ${getTeamColor(result.team)}50`,
                    }}
                  />

                  <div className="flex-1 min-w-0 pr-3">
                    <div className="flex items-baseline gap-2 mb-1">
                      <div className="text-lg font-black uppercase font-rajdhani" style={{ color: colors.text, wordBreak: 'break-word' }}>
                        {result.driverCode}
                      </div>
                      <div className="text-sm font-bold font-rajdhani" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                        {result.driver}
                      </div>
                    </div>
                    <div className="text-xs font-bold uppercase mb-1 font-rajdhani" style={{ color: colors.textSub, wordBreak: 'break-word' }}>
                      {result.team}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-base font-black font-rajdhani" style={{ color: colors.text }}>
                        {formatTime(result.time)}
                      </div>
                      {result.gap && (
                        <div className="text-xs font-bold font-rajdhani" style={{ color: colors.textSub }}>
                          +{result.gap.toFixed(3)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
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