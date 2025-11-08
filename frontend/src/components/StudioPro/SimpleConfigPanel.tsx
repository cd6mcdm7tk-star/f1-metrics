import { ArrowLeft, Users, Calendar, Trophy, ChevronDown } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import type { StudioConfig } from '../../pages/StudioProPage';
import YearSelector from '../YearSelector';
import GrandPrixSelector from '../GrandPrixSelector';

interface SimpleConfigPanelProps {
  config: StudioConfig;
  onChange: (config: StudioConfig) => void;
  onBack: () => void;
}

export default function SimpleConfigPanel({ config, onChange, onBack }: SimpleConfigPanelProps) {
  const [availableDrivers, setAvailableDrivers] = useState<any[]>([]);
  const [selectedDriver1, setSelectedDriver1] = useState('');
  const [selectedDriver2, setSelectedDriver2] = useState('');
  const [isLoadingDrivers, setIsLoadingDrivers] = useState(false);
  
  // Dropdown states
  const [isDriver1Open, setIsDriver1Open] = useState(false);
  const [isDriver2Open, setIsDriver2Open] = useState(false);
  const driver1Ref = useRef<HTMLDivElement>(null);
  const driver2Ref = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (driver1Ref.current && !driver1Ref.current.contains(event.target as Node)) {
        setIsDriver1Open(false);
      }
      if (driver2Ref.current && !driver2Ref.current.contains(event.target as Node)) {
        setIsDriver2Open(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch available drivers when year/round changes
  useEffect(() => {
    const needsDrivers = ['track-telemetry', 'race-pace', 'head-to-head'].includes(config.contentType || '');
    
    if (config.year && config.round && needsDrivers) {
      fetchDrivers();
    }
  }, [config.year, config.round, config.contentType]);

  const fetchDrivers = async () => {
    setIsLoadingDrivers(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const needsQualifying = config.contentType === 'quali-table' || config.contentType === 'track-telemetry';
      const session = needsQualifying ? 'Q' : 'R';
      
      const url = `${API_URL}/api/drivers/${config.year}/${config.round}/${session}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      setAvailableDrivers(data);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      setAvailableDrivers([]);
    } finally {
      setIsLoadingDrivers(false);
    }
  };

  const requiresDrivers = () => {
    return ['track-telemetry', 'race-pace', 'head-to-head'].includes(config.contentType || '');
  };

  const handleDriverSelect = (driver: string, position: 1 | 2) => {
    if (position === 1) {
      setSelectedDriver1(driver);
      onChange({ 
        ...config, 
        drivers: driver && selectedDriver2 ? [driver, selectedDriver2] : [driver].filter(Boolean) 
      });
    } else {
      setSelectedDriver2(driver);
      onChange({ 
        ...config, 
        drivers: selectedDriver1 && driver ? [selectedDriver1, driver] : [selectedDriver1].filter(Boolean) 
      });
    }
  };

  return (
    <div className="space-y-3 md:space-y-4 h-full overflow-y-auto">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-all font-rajdhani font-bold hover:translate-x-[-4px]"
      >
        <ArrowLeft size={16} className="md:w-[18px] md:h-[18px]" />
        <span className="text-xs md:text-sm uppercase tracking-wider">Change Type</span>
      </button>

      {/* Config Card */}
      <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 md:p-5 space-y-4 md:space-y-5 shadow-lg shadow-metrik-turquoise/10">
        <h3 className="text-lg md:text-xl font-rajdhani font-black uppercase tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-metrik-turquoise to-cyan-300">
          Configure
        </h3>

        {/* Year Selector */}
        {config.contentType !== 'head-to-head' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wider">
              <Calendar size={12} className="md:w-3.5 md:h-3.5 text-metrik-turquoise" />
              Season
            </label>
            <YearSelector
              selectedYear={config.year}
              onSelectYear={(year) => onChange({ ...config, year })}
            />
          </div>
        )}

        {config.contentType === 'head-to-head' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wider">
              <Calendar size={12} className="md:w-3.5 md:h-3.5 text-metrik-turquoise" />
              Season (Full Season)
            </label>
            <YearSelector
              selectedYear={config.year}
              onSelectYear={(year) => onChange({ ...config, year, round: 1 })}
            />
          </div>
        )}

        {/* Grand Prix Selector */}
        {config.contentType !== 'head-to-head' && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wider">
              <Trophy size={12} className="md:w-3.5 md:h-3.5 text-metrik-turquoise" />
              Grand Prix
            </label>
            <GrandPrixSelector
              year={config.year}
              selectedRound={config.round}
              onSelect={(round) => onChange({ ...config, round })}
            />
          </div>
        )}

        {/* Drivers (only for certain types) */}
        {requiresDrivers() && (
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-xs font-rajdhani font-bold text-metrik-silver uppercase tracking-wider">
              <Users size={12} className="md:w-3.5 md:h-3.5 text-metrik-turquoise" />
              Drivers {(config.contentType === 'track-telemetry' || config.contentType === 'head-to-head') && '(2 required)'}
            </label>

            {/* Driver 1 Dropdown */}
            <div className="relative" ref={driver1Ref}>
              <button
                onClick={() => setIsDriver1Open(!isDriver1Open)}
                className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 bg-metrik-surface/80 border border-metrik-turquoise/30 rounded-lg hover:border-metrik-turquoise/50 transition-all focus:outline-none focus:ring-2 focus:ring-metrik-turquoise/20"
              >
                <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                  {selectedDriver1 && availableDrivers.find(d => d.abbreviation === selectedDriver1) ? (
                    <>
                      <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-metrik-turquoise/20 border border-metrik-turquoise/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[10px] md:text-xs font-rajdhani font-black text-metrik-turquoise">
                          {selectedDriver1}
                        </span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-xs md:text-sm font-rajdhani font-bold text-white truncate">
                          {availableDrivers.find(d => d.abbreviation === selectedDriver1)?.fullName}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-silver">
                      Select Driver 1
                    </div>
                  )}
                </div>
                <ChevronDown 
                  size={12} 
                  className={`md:w-3.5 md:h-3.5 text-metrik-turquoise transition-transform duration-300 flex-shrink-0 ${isDriver1Open ? 'rotate-180' : ''}`} 
                />
              </button>

              {/* Driver 1 Dropdown Menu */}
              {isDriver1Open && (
                <div className="absolute z-50 w-full mt-2 max-h-64 overflow-y-auto backdrop-blur-xl bg-metrik-card/98 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl">
                  <button
                    onClick={() => {
                      setSelectedDriver1('');
                      handleDriverSelect('', 1);
                      setIsDriver1Open(false);
                    }}
                    className="w-full px-3 md:px-4 py-2.5 md:py-3 text-left hover:bg-metrik-turquoise/10 transition-all border-b border-metrik-turquoise/20 sticky top-0 bg-metrik-card/98 z-10"
                  >
                    <div className="text-sm md:text-sm font-rajdhani font-bold text-metrik-silver">
                      Clear selection • {availableDrivers.length} drivers
                    </div>
                  </button>

                  {isLoadingDrivers && (
                    <div className="w-full px-3 md:px-4 py-6 text-center">
                      <div className="w-6 h-6 mx-auto border-2 border-metrik-turquoise border-t-transparent rounded-full animate-spin" />
                      <p className="mt-2 text-xs text-metrik-silver">Loading drivers...</p>
                    </div>
                  )}

                  {!isLoadingDrivers && availableDrivers.length === 0 && (
                    <div className="w-full px-3 md:px-4 py-6 text-center text-metrik-silver text-sm">
                      No drivers available
                    </div>
                  )}

                  {availableDrivers.map((driver) => (
                    <button
                      key={driver.abbreviation}
                      onClick={() => {
                        setSelectedDriver1(driver.abbreviation);
                        handleDriverSelect(driver.abbreviation, 1);
                        setIsDriver1Open(false);
                      }}
                      className={`w-full px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3 hover:bg-metrik-turquoise/10 transition-all ${
                        selectedDriver1 === driver.abbreviation ? 'bg-metrik-turquoise/20' : ''
                      }`}
                    >
                      <div className="w-7 h-7 md:w-7 md:h-7 rounded-full bg-metrik-turquoise/20 border border-metrik-turquoise/50 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs md:text-xs font-rajdhani font-black text-metrik-turquoise">
                          {driver.abbreviation}
                        </span>
                      </div>
                      <div className="text-left min-w-0 flex-1">
                        <div className="text-sm md:text-sm font-rajdhani font-bold text-white truncate">
                          {driver.fullName}
                        </div>
                        <div className="text-xs md:text-xs font-inter text-metrik-silver truncate">
                          {driver.team}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Driver 2 Dropdown */}
            {(config.contentType === 'track-telemetry' || config.contentType === 'race-pace' || config.contentType === 'head-to-head') && (
              <div className="relative" ref={driver2Ref}>
                <button
                  onClick={() => setIsDriver2Open(!isDriver2Open)}
                  className="w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 bg-metrik-surface/80 border border-orange-500/30 rounded-lg hover:border-orange-500/50 transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                    {selectedDriver2 && availableDrivers.find(d => d.abbreviation === selectedDriver2) ? (
                      <>
                        <div className="w-6 h-6 md:w-7 md:h-7 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] md:text-xs font-rajdhani font-black text-orange-500">
                            {selectedDriver2}
                          </span>
                        </div>
                        <div className="text-left min-w-0 flex-1">
                          <div className="text-xs md:text-sm font-rajdhani font-bold text-white truncate">
                            {availableDrivers.find(d => d.abbreviation === selectedDriver2)?.fullName}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-xs md:text-sm font-rajdhani font-bold text-metrik-silver">
                        {(config.contentType === 'track-telemetry' || config.contentType === 'head-to-head') ? 'Select Driver 2' : 'Select Driver 2 (optional)'}
                      </div>
                    )}
                  </div>
                  <ChevronDown 
                    size={12} 
                    className={`md:w-3.5 md:h-3.5 text-orange-500 transition-transform duration-300 flex-shrink-0 ${isDriver2Open ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Driver 2 Dropdown Menu */}
                {isDriver2Open && (
                  <div className="absolute z-50 w-full mt-2 max-h-64 overflow-y-auto backdrop-blur-xl bg-metrik-card/98 border-2 border-orange-500/50 rounded-xl shadow-2xl">
                    <button
                      onClick={() => {
                        setSelectedDriver2('');
                        handleDriverSelect('', 2);
                        setIsDriver2Open(false);
                      }}
                      className="w-full px-3 md:px-4 py-2.5 md:py-3 text-left hover:bg-orange-500/10 transition-all border-b border-orange-500/20 sticky top-0 bg-metrik-card/98 z-10"
                    >
                      <div className="text-sm md:text-sm font-rajdhani font-bold text-metrik-silver">
                        Clear selection • {availableDrivers.filter(d => d.abbreviation !== selectedDriver1).length} drivers
                      </div>
                    </button>

                    {availableDrivers
                      .filter(d => d.abbreviation !== selectedDriver1)
                      .map((driver) => (
                        <button
                          key={driver.abbreviation}
                          onClick={() => {
                            setSelectedDriver2(driver.abbreviation);
                            handleDriverSelect(driver.abbreviation, 2);
                            setIsDriver2Open(false);
                          }}
                          className={`w-full px-3 md:px-4 py-2.5 md:py-3 flex items-center gap-2 md:gap-3 hover:bg-orange-500/10 transition-all ${
                            selectedDriver2 === driver.abbreviation ? 'bg-orange-500/20' : ''
                          }`}
                        >
                          <div className="w-7 h-7 md:w-7 md:h-7 rounded-full bg-orange-500/20 border border-orange-500/50 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs md:text-xs font-rajdhani font-black text-orange-500">
                              {driver.abbreviation}
                            </span>
                          </div>
                          <div className="text-left min-w-0 flex-1">
                            <div className="text-sm md:text-sm font-rajdhani font-bold text-white truncate">
                              {driver.fullName}
                            </div>
                            <div className="text-xs md:text-xs font-inter text-metrik-silver truncate">
                              {driver.team}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info Badge */}
        <div className="pt-2 md:pt-3 border-t border-metrik-turquoise/20">
          <div className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-metrik-silver font-inter">
            <div className="w-1.5 md:w-2 h-1.5 md:h-2 rounded-full bg-metrik-turquoise animate-pulse" />
            <span>Chart updates automatically</span>
          </div>
        </div>
      </div>
    </div>
  );
}