import React from 'react';
import { CheckCircle2, Users, Zap, Check, Target, CheckCircle } from 'lucide-react';
import { hasSprintWeekend } from '../data/sprintWeekends';

interface CompactSelectorsProps {
  year: number;
  selectedGP: number;
  sessionType: string;
  driver1: string;
  driver2: string;
  drivers: any[];
  grandsPrix: any[];
  onYearChange: (year: number) => void;
  onGPChange: (gp: number) => void;
  onSessionChange: (session: string) => void;
  onDriver1Change: (driver: string) => void;
  onDriver2Change: (driver: string) => void;
  onCompareFastestLaps: () => void;
  loading: boolean;
  selection1: { driver: string; lapNumber: number } | null;
  selection2: { driver: string; lapNumber: number } | null;
  getDriverColor: (driverCode: string) => string;
  areTeammates: (driver1: string, driver2: string) => boolean;
  isPremium?: boolean; // 🔥 AJOUTÉ
}

const GP_NAMES: { [key: string]: string } = {
  'Sakhir': 'Bahrain Grand Prix',
  'Jeddah': 'Saudi Arabian Grand Prix',
  'Melbourne': 'Australian Grand Prix',
  'Suzuka': 'Japanese Grand Prix',
  'Shanghai': 'Chinese Grand Prix',
  'Miami': 'Miami Grand Prix',
  'Imola': 'Emilia Romagna Grand Prix',
  'Monte Carlo': 'Monaco Grand Prix',
  'Montreal': 'Canadian Grand Prix',
  'Barcelona': 'Spanish Grand Prix',
  'Spielberg': 'Austrian Grand Prix',
  'Silverstone': 'British Grand Prix',
  'Hungaroring': 'Hungarian Grand Prix',
  'Spa-Francorchamps': 'Belgian Grand Prix',
  'Zandvoort': 'Dutch Grand Prix',
  'Monza': 'Italian Grand Prix',
  'Baku': 'Azerbaijan Grand Prix',
  'Marina Bay': 'Singapore Grand Prix',
  'Austin': 'United States Grand Prix',
  'Mexico City': 'Mexico City Grand Prix',
  'São Paulo': 'São Paulo Grand Prix',
  'Las Vegas': 'Las Vegas Grand Prix',
  'Losail': 'Qatar Grand Prix',
  'Yas Island': 'Abu Dhabi Grand Prix',
  'Yas Marina Circuit': 'Abu Dhabi Grand Prix',
};

interface ContextualTipsProps {
  driver1: string;
  driver2: string;
  selection1: { driver: string; lapNumber: number } | null;
  selection2: { driver: string; lapNumber: number } | null;
}

function ContextualTips({ driver1, driver2, selection1, selection2 }: ContextualTipsProps) {
  const getState = () => {
    if (!driver1 && !driver2) return 'no_drivers';
    if ((driver1 && !driver2) || (!driver1 && driver2)) return 'one_driver';
    if (driver1 && driver2 && !selection1 && !selection2) return 'two_drivers';
    if ((selection1 && !selection2) || (!selection1 && selection2)) return 'one_lap';
    if (selection1 && selection2) return 'two_laps';
    return 'no_drivers';
  };

  const state = getState();

  const tips = {
    no_drivers: {
      icon: <Zap size={12} className="sm:w-3.5 sm:h-3.5 text-metrik-turquoise flex-shrink-0" />,
      title: 'Quick Start',
      items: [
        'Select 2 drivers to begin',
        'Use "Compare Fastest Laps" for instant analysis'
      ]
    },
    one_driver: {
      icon: <Check size={12} className="sm:w-3.5 sm:h-3.5 text-metrik-turquoise flex-shrink-0" />,
      title: driver1 || driver2 || 'Driver Selected',
      items: [
        'Pick a second driver to continue',
        'Click any lap in the graph to compare'
      ]
    },
    two_drivers: {
      icon: <Users size={12} className="sm:w-3.5 sm:h-3.5 text-metrik-turquoise flex-shrink-0" />,
      title: `${driver1} vs ${driver2} ready`,
      items: [
        'Click any lap point to view telemetry',
        'Or use "Compare Fastest Laps" button'
      ]
    },
    one_lap: {
      icon: <Target size={12} className="sm:w-3.5 sm:h-3.5 text-metrik-turquoise flex-shrink-0" />,
      title: `${selection1?.driver || selection2?.driver} - Lap ${selection1?.lapNumber || selection2?.lapNumber} selected`,
      items: [
        'Click another lap to compare',
        'Same driver comparison allowed'
      ]
    },
    two_laps: {
      icon: <CheckCircle size={12} className="sm:w-3.5 sm:h-3.5 text-metrik-turquoise flex-shrink-0" />,
      title: 'Comparison ready',
      items: [
        'Switch to Telemetry tab to analyze',
        'Click [X] to clear and select new laps'
      ]
    }
  };

  const currentTip = tips[state];

  return (
    <div className="mt-3 sm:mt-4 p-2.5 sm:p-3 bg-metrik-black/40 border border-metrik-turquoise/20 rounded-lg">
      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
        {currentTip.icon}
        <h4 className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wide">
          {currentTip.title}
        </h4>
      </div>
      <div className="space-y-0.5 sm:space-y-1">
        {currentTip.items.map((item, index) => (
          <p key={index} className="text-[10px] sm:text-xs text-metrik-silver/70 font-rajdhani leading-relaxed">
            • {item}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function CompactSelectors({
  year,
  selectedGP,
  sessionType,
  driver1,
  driver2,
  drivers,
  grandsPrix,
  onYearChange,
  onGPChange,
  onSessionChange,
  onDriver1Change,
  onDriver2Change,
  onCompareFastestLaps,
  loading,
  selection1,
  selection2,
  getDriverColor,
  areTeammates,
  isPremium = false, // 🔥 AJOUTÉ avec default
}: CompactSelectorsProps) {
  
  const selectedGPData = grandsPrix.find(gp => gp.round === selectedGP);
  const isReadyToCompare = driver1 && driver2 && driver1 !== driver2;
  const isSprintWeekend = hasSprintWeekend(year, selectedGP);

  const getDriver2Color = () => {
    if (driver1 && driver2 && areTeammates(driver1, driver2)) {
      return '#FFFFFF';
    }
    return getDriverColor(driver2);
  };

  const getGPName = (gp: any): string => {
    if (!gp) return '';
    if (gp.location && GP_NAMES[gp.location]) {
      return GP_NAMES[gp.location];
    }
    if (gp.country) {
      if (gp.country.includes('Grand Prix')) {
        return gp.country;
      }
      return `${gp.country} Grand Prix`;
    }
    return gp.location || `Round ${gp.round}`;
  };

  const selectStyle = {
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2300E5CC' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.75rem center',
  };

  return (
    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4 md:p-6">
      {/* LAYOUT RESPONSIVE - 1 col mobile, 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
        
        {/* COLONNE GAUCHE - SELECTORS */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4">
            <div className="w-0.5 sm:w-1 h-4 sm:h-5 lg:h-6 bg-metrik-turquoise rounded" />
            <h3 className="text-[11px] sm:text-xs lg:text-sm font-rajdhani font-bold text-white uppercase tracking-wide">
              Event Selection
            </h3>
          </div>

          {/* Year + Session Grid - RESPONSIVE */}
          <div className="grid grid-cols-2 gap-2 sm:gap-2.5 lg:gap-3">
            {/* Year */}
            <div>
              <label className="block text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wide mb-1 sm:mb-1.5 lg:mb-2">
                Year
              </label>
              <select
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="w-full h-9 sm:h-10 lg:h-11 px-2.5 sm:px-3 lg:px-4 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white text-xs sm:text-sm font-rajdhani font-bold focus:border-metrik-turquoise focus:outline-none hover:border-metrik-turquoise/50 transition-all appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option value={2026}>2026 {!isPremium && '🔒'}</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
                <option value={2021}>2021</option>
                <option value={2020}>2020</option>
                <option value={2019}>2019</option>
                <option value={2018}>2018</option>
              </select>
            </div>

            {/* Session */}
            <div>
              <label className="block text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wide mb-1 sm:mb-1.5 lg:mb-2">
                Session
              </label>
              <select
                value={sessionType}
                onChange={(e) => onSessionChange(e.target.value)}
                className="w-full h-9 sm:h-10 lg:h-11 px-2.5 sm:px-3 lg:px-4 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white text-xs sm:text-sm font-rajdhani font-bold focus:border-metrik-turquoise focus:outline-none hover:border-metrik-turquoise/50 transition-all appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option value="" disabled>Pick session</option>
                <option value="Q">Qualifying</option>
                <option value="R">Race</option>
                {isSprintWeekend && (
                  <>
                    <option value="SQ">Sprint Shootout</option>
                    <option value="S">Sprint</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Grand Prix - 🔥 iOS FIX MINIMAL */}
          <div>
            <label className="block text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wide mb-1 sm:mb-1.5 lg:mb-2">
              Grand Prix
            </label>
            {/* 🔥 Wrapper avec key incluant year - Force iOS à re-render quand year change */}
            <div key={`gp-${year}-${grandsPrix.length}`}>
              <select
                value={selectedGP}
                onChange={(e) => onGPChange(Number(e.target.value))}
                className="w-full h-9 sm:h-10 lg:h-11 px-2.5 sm:px-3 lg:px-4 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white text-xs sm:text-sm font-rajdhani font-bold focus:border-metrik-turquoise focus:outline-none hover:border-metrik-turquoise/50 transition-all appearance-none cursor-pointer"
                style={selectStyle}
              >
                <option value="" disabled>Pick an event</option>
                {grandsPrix && grandsPrix.length > 0 && grandsPrix.map((gp) => {
                  if (!gp || typeof gp !== 'object') return null;
                  return (
                    <option key={`${year}-${gp.round}`} value={gp.round}>
                      {getGPName(gp)}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Tips Contextuels */}
          <ContextualTips 
            driver1={driver1}
            driver2={driver2}
            selection1={selection1}
            selection2={selection2}
          />
        </div>

        {/* COLONNE DROITE - DRIVER PILLS */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-0.5 sm:w-1 h-4 sm:h-5 lg:h-6 bg-metrik-turquoise rounded" />
              <h3 className="text-[11px] sm:text-xs lg:text-sm font-rajdhani font-bold text-white uppercase tracking-wide">
                Driver Selection
              </h3>
            </div>
            {(driver1 || driver2) && (
              <button
                onClick={() => {
                  onDriver1Change('');
                  onDriver2Change('');
                }}
                className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver hover:text-metrik-turquoise uppercase tracking-wide transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          {/* Pills Grid - RESPONSIVE: 3 cols mobile, 4 cols tablet, 5 cols desktop */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-1.5 sm:gap-2">
            {drivers.map((driver) => {
              const isDriver1Selected = driver1 === driver.abbreviation;
              const isDriver2Selected = driver2 === driver.abbreviation;
              const isSelected = isDriver1Selected || isDriver2Selected;
              const driverColor = getDriverColor(driver.abbreviation);
              const displayColor = isDriver2Selected ? getDriver2Color() : driverColor;

              return (
                <button
                  key={driver.abbreviation}
                  onClick={() => {
                    if (isDriver1Selected) {
                      onDriver1Change('');
                    } else if (isDriver2Selected) {
                      onDriver2Change('');
                    } else if (!driver1) {
                      onDriver1Change(driver.abbreviation);
                    } else if (!driver2) {
                      onDriver2Change(driver.abbreviation);
                    } else {
                      onDriver1Change(driver.abbreviation);
                    }
                  }}
                  disabled={loading}
                  className={`
                    relative h-9 sm:h-10 rounded-lg font-rajdhani font-black text-xs sm:text-sm uppercase tracking-wide
                    transition-all duration-200 flex items-center justify-center
                    ${isSelected
                      ? 'shadow-lg scale-105'
                      : 'bg-metrik-black/40 border border-metrik-silver/20 text-metrik-silver/60 hover:text-metrik-silver hover:border-metrik-silver/40 hover:scale-105'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                  style={isSelected ? {
                    backgroundColor: `${displayColor}20`,
                    borderWidth: '2px',
                    borderColor: displayColor,
                    color: displayColor,
                    boxShadow: `0 0 15px ${displayColor}30`,
                  } : {}}
                >
                  {/* Badge numéro */}
                  {isSelected && (
                    <div
                      className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-black"
                      style={{
                        backgroundColor: displayColor,
                        color: '#000',
                        boxShadow: `0 0 8px ${displayColor}50`,
                      }}
                    >
                      {isDriver1Selected ? '1' : '2'}
                    </div>
                  )}
                  {driver.abbreviation}
                </button>
              );
            })}
          </div>

          {/* Button Compare */}
          <div className="pt-1 sm:pt-2">
            {isReadyToCompare ? (
              <button
                onClick={onCompareFastestLaps}
                disabled={loading}
                className={`
                  w-full h-10 sm:h-11 lg:h-12 bg-gradient-to-r from-metrik-turquoise to-metrik-cyan rounded-lg 
                  font-rajdhani font-black text-xs sm:text-sm uppercase tracking-wider
                  hover:scale-105 transition-all duration-200 flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                style={{
                  boxShadow: '0 0 20px rgba(0, 229, 204, 0.3)',
                  color: '#0A0E27',
                }}
              >
                <Users size={16} className="sm:w-4.5 sm:h-4.5" />
                <span className="hidden sm:inline">COMPARE FASTEST LAPS</span>
                <span className="sm:hidden">COMPARE LAPS</span>
              </button>
            ) : (
              <div className="w-full h-10 sm:h-11 lg:h-12 bg-metrik-black/40 border-2 border-metrik-silver/20 rounded-lg flex items-center justify-center px-2">
                <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver/50 uppercase tracking-wider text-center">
                  Select 2 drivers to compare
                </span>
              </div>
            )}
          </div>

          {/* Info ligne */}
          {(driver1 || driver2) && (
            <div className="pt-2 sm:pt-3 border-t border-metrik-turquoise/20 flex flex-col sm:flex-row items-center justify-around gap-2 sm:gap-0 text-xs">
              {driver1 ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div 
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: getDriverColor(driver1) }}
                  />
                  <span className="font-rajdhani font-bold text-metrik-silver text-[10px] sm:text-xs">
                    Driver 1:
                  </span>
                  <span className="font-rajdhani font-black text-base sm:text-lg" style={{ color: getDriverColor(driver1) }}>
                    {driver1}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-metrik-silver/30" />
                  <span className="font-rajdhani font-bold text-metrik-silver/40 text-[10px] sm:text-xs">
                    Driver 1: —
                  </span>
                </div>
              )}

              <div className="text-metrik-silver/30 font-bold text-xs sm:text-sm">VS</div>

              {driver2 ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div 
                    className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: getDriver2Color() }}
                  />
                  <span className="font-rajdhani font-bold text-metrik-silver text-[10px] sm:text-xs">
                    Driver 2:
                  </span>
                  <span className="font-rajdhani font-black text-base sm:text-lg" style={{ color: getDriver2Color() }}>
                    {driver2}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-metrik-silver/30" />
                  <span className="font-rajdhani font-bold text-metrik-silver/40 text-[10px] sm:text-xs">
                    Driver 2: —
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}