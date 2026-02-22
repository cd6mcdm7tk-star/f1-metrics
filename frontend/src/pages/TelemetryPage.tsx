import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Gauge, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import { useSubscription } from '../hooks/useSubscription';
import { useTelemetryCache } from '../hooks/useTelemetryCache';
import UpgradeModal from '../components/UpgradeModal';
import {
  getDrivers,
  getGrandsPrix,
  getTelemetryComparison
} from '../services/backend.service';
import type { TelemetryData } from '../types/telemetry';
import CompactSelectors from '../components/CompactSelectors';
import SessionView from '../components/SessionView';
import TelemetryView from '../components/TelemetryView';

interface LapSelection {
  driver: string;
  lapNumber: number;
}

export default function TelemetryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [sessionType, setSessionType] = useState('Q');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');
  const [loading, setLoading] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const { canAccessYear, isPremium, canMakeRequest, incrementRequest } = useSubscription();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [grandsPrix, setGrandsPrix] = useState<any[]>([]);
  
  const [activeTab, setActiveTab] = useState<'session' | 'telemetry'>('session');
  
  const [selection1, setSelection1] = useState<LapSelection | null>(null);
  const [selection2, setSelection2] = useState<LapSelection | null>(null);
  const [telemetryReady, setTelemetryReady] = useState(false);
  const [selectedLapsCount, setSelectedLapsCount] = useState(0);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);

  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});

  // 🔥 CACHE HOOK
  const { getCached, setCached, getTelemetryKey } = useTelemetryCache();

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  const getTeamColor = (teamName: string): string => {
    const name = teamName.toLowerCase();
    
    const teamColors: Record<string, string> = {
      'red bull': '#3671C6',
      'ferrari': '#E8002D',
      'mercedes': '#27F4D2',
      'mclaren': '#FF8700',
      'alpine': '#FF87BC',
      'aston martin': '#229971',
      'rb': '#6692FF',
      'alphatauri': '#6692FF',
      'haas': '#B6BABD',
      'kick sauber': '#00E701',
      'sauber': '#00E701',
      'alfa romeo': '#C92D4B',
      'williams': '#00A0DE',
      'racing point': '#F596C8',
      'renault': '#FFF500',
      'cadillac': '#003DA5',
      'audi': '#BB0A30',
    };
    
    for (const [key, color] of Object.entries(teamColors)) {
      if (name.includes(key)) {
        return color;
      }
    }
    
    return '#00E5CC';
  };

  const getDriverColor = (driverCode: string): string => {
    const teamName = driverTeams[driverCode] || 'Unknown';
    return getTeamColor(teamName);
  };

  const areTeammates = (driver1: string, driver2: string): boolean => {
    const team1 = driverTeams[driver1];
    const team2 = driverTeams[driver2];
    
    if (!team1 || !team2) return false;
    
    return team1.toLowerCase() === team2.toLowerCase();
  };

  useEffect(() => {
  // Si user change pour 2026 et n'est pas PRO → bloquer
  if (year >= 2026 && !isPremium) {
    setShowUpgradeModal(true);
    setYear(2025); // Retour à 2025
  }
}, [year, isPremium]);

  useEffect(() => {
    setSelectedGP(1);
    setSessionType('Q');
    setTelemetryData(null);
    setActiveTab('session');
    setTelemetryReady(false);
    setSelectedLapsCount(0);
    setSelection1(null);
    setSelection2(null);
    setDriver1('');
    setDriver2('');
    loadDrivers();
  }, [year]);

  useEffect(() => {
    loadDrivers();
    setSelection1(null);
    setSelection2(null);
    setTelemetryData(null);
    setTelemetryReady(false);
    setSelectedLapsCount(0);
  }, [year, selectedGP, sessionType]);

  useEffect(() => {
    const fetchGrandsPrix = async () => {
      try {
        const data = await getGrandsPrix(year);
        setGrandsPrix(data.grands_prix || []);
      } catch (error) {
        console.error('Error loading grands prix:', error);
      }
    };
    fetchGrandsPrix();
  }, [year]);

  // 🔥 AUTO-LOAD + PREFETCH dès qu'on a 2 sélections
  useEffect(() => {
    if (selection1 && selection2) {
      loadTelemetry();
    }
  }, [selection1, selection2]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, sessionType);
      setDrivers(data);
      
      const teamsMap: Record<string, string> = {};
      data.forEach((driver: any) => {
        if (driver.abbreviation && driver.team) {
          teamsMap[driver.abbreviation] = driver.team;
        }
      });
      setDriverTeams(teamsMap);
      
      if (data.length > 0) {
        setDriver1(data[0].abbreviation);
        setDriver2(data[1]?.abbreviation || data[0].abbreviation);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  // 🔥 CHARGEMENT TÉLÉMÉTRIE AVEC CACHE + PREFETCH
  const loadTelemetry = async () => {
    if (!selection1 || !selection2) return;
    
    if (!canMakeRequest) {
      setShowUpgradeModal(true);
      return;
    }

    // 🔥 VÉRIFIER CACHE AVANT TOUT
    const cacheKey = getTelemetryKey(
      year,
      selectedGP,
      sessionType,
      selection1.driver,
      selection1.lapNumber,
      selection2.driver,
      selection2.lapNumber
    );

    const cached = getCached<TelemetryData>(cacheKey);
    
    if (cached) {
      // ✅ CACHE HIT - Instantané !
      console.log('⚡ Telemetry loaded from cache (instant!)');
      setTelemetryData(cached);
      setTelemetryReady(true);
      setSelectedLapsCount(2);
      setActiveTab('telemetry');
      
      // Prefetch en arrière-plan quand même
      prefetchFastestLaps();
      return;
    }

    // ❌ CACHE MISS - Charger depuis API
    setLoading(true);
    setTelemetryReady(false);
    
    try {
      const data = await getTelemetryComparison(
        year, 
        selectedGP, 
        sessionType, 
        selection1.driver,
        selection2.driver,
        selection1.lapNumber,
        selection2.lapNumber
      );
      
      setTelemetryData(data);
      setTelemetryReady(true);
      setSelectedLapsCount(2);
      setActiveTab('telemetry');
      
      // 💾 SAUVER EN CACHE
      setCached(cacheKey, data);
      
      incrementRequest();

      // 🔥 PREFETCH FASTEST LAPS EN ARRIÈRE-PLAN
      prefetchFastestLaps();
      
    } catch (error) {
      console.error('Error loading telemetry:', error);
      setTelemetryReady(false);
      setSelectedLapsCount(0);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 PREFETCH INTELLIGENT - Fastest laps en arrière-plan
  const prefetchFastestLaps = async () => {
    if (!driver1 || !driver2) return;

    const fastestKey = getTelemetryKey(
      year,
      selectedGP,
      sessionType,
      driver1,
      undefined, // fastest
      driver2,
      undefined  // fastest
    );

    // Vérifier si déjà en cache
    const alreadyCached = getCached<TelemetryData>(fastestKey);
    if (alreadyCached) {
      console.log('✅ Fastest laps already cached');
      return;
    }

    // Charger en arrière-plan (silencieux)
    console.log('🔄 Prefetching fastest laps in background...');
    
    try {
      const data = await getTelemetryComparison(
        year,
        selectedGP,
        sessionType,
        driver1,
        driver2,
        undefined, // fastest lap
        undefined  // fastest lap
      );

      // Sauver en cache silencieusement
      setCached(fastestKey, data);
      console.log('✅ Fastest laps prefetched and cached!');
      
    } catch (error) {
      console.error('⚠️ Prefetch failed (non-blocking):', error);
    }
  };

  const handleLapClick = (driver: string, lapNumber: number) => {
    if (selection1?.driver === driver && selection1?.lapNumber === lapNumber) {
      setSelection1(null);
      setTelemetryData(null);
      setTelemetryReady(false);
      setSelectedLapsCount(0);
      showToast(`${driver} Lap ${lapNumber} removed`);
      return;
    }
    
    if (selection2?.driver === driver && selection2?.lapNumber === lapNumber) {
      setSelection2(null);
      setTelemetryData(null);
      setTelemetryReady(false);
      setSelectedLapsCount(0);
      showToast(`${driver} Lap ${lapNumber} removed`);
      return;
    }
    
    if (!selection1) {
      setSelection1({ driver, lapNumber });
      showToast(`${driver} Lap ${lapNumber} added`);
    } else if (!selection2) {
      setSelection2({ driver, lapNumber });
      showToast(`${driver} Lap ${lapNumber} added`);
    } else {
      setSelection1({ driver, lapNumber });
      showToast(`${driver} Lap ${lapNumber} replaced`);
    }
  };

  // 🔥 FASTEST LAPS - Utilise le cache si disponible
  const handleCompareFastestLaps = () => {
    setSelection1(null);
    setSelection2(null);
    
    showToast(`Comparing fastest laps: ${driver1} vs ${driver2}`);
    
    if (driver1 && driver2 && canMakeRequest) {
      loadTelemetryFastestLaps();
    }
  };

  const loadTelemetryFastestLaps = async () => {
    if (!driver1 || !driver2) return;
    
    if (!canMakeRequest) {
      setShowUpgradeModal(true);
      return;
    }

    // 🔥 VÉRIFIER CACHE
    const cacheKey = getTelemetryKey(
      year,
      selectedGP,
      sessionType,
      driver1,
      undefined,
      driver2,
      undefined
    );

    const cached = getCached<TelemetryData>(cacheKey);
    
    if (cached) {
      // ✅ CACHE HIT - Instantané grâce au prefetch !
      console.log('⚡ Fastest laps loaded from cache (prefetched!)');
      setTelemetryData(cached);
      setTelemetryReady(true);
      setSelectedLapsCount(2);
      setActiveTab('telemetry');
      return;
    }

    // ❌ CACHE MISS
    setLoading(true);
    setTelemetryReady(false);
    
    try {
      const data = await getTelemetryComparison(
        year, 
        selectedGP, 
        sessionType, 
        driver1, 
        driver2,
        undefined,
        undefined
      );
      
      setTelemetryData(data);
      setTelemetryReady(true);
      setSelectedLapsCount(2);
      setActiveTab('telemetry');
      
      // 💾 SAUVER EN CACHE
      setCached(cacheKey, data);
      
      incrementRequest();
    } catch (error) {
      console.error('Error loading telemetry:', error);
      setTelemetryReady(false);
      setSelectedLapsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = (slot: 1 | 2) => {
    if (slot === 1) {
      setSelection1(null);
    } else {
      setSelection2(null);
    }
    setTelemetryData(null);
    setTelemetryReady(false);
    setSelectedLapsCount(0);
  };

  return (
    <>
      <SEO 
        path="/telemetry"
        title={t('telemetry.title') + ' - METRIK DELTA'}
        description={t('telemetry.title')}
        keywords="f1 telemetry, télémétrie f1, telemetría f1, f1 data analysis, analyse données f1"
      />
      <div className="min-h-screen bg-metrik-black text-white">
        <div className="container mx-auto px-3 sm:px-6 py-4 sm:py-8">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors group"
            >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={18} />
              <span className="font-rajdhani font-bold uppercase tracking-wide text-sm sm:text-base">Back</span>
            </button>
            <div className="flex items-center gap-2 sm:gap-3">
              <Gauge className="text-metrik-turquoise" size={24} />
              <h1 className="text-2xl sm:text-4xl font-rajdhani font-black bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent">
                TELEMETRY ANALYSIS
              </h1>
            </div>
          </div>

          {/* TABS NAVIGATION */}
          <div className="bg-metrik-black border border-metrik-turquoise/20 rounded-xl mb-4 sm:mb-6 overflow-hidden">
            <div className="flex items-stretch">
              {/* Tab Session View */}
              <button
                onClick={() => setActiveTab('session')}
                className={`
                  relative flex-1 px-4 py-3 sm:px-8 sm:py-4 font-rajdhani font-bold text-xs sm:text-sm uppercase tracking-wider
                  transition-all duration-300
                  ${activeTab === 'session' 
                    ? 'text-metrik-turquoise' 
                    : 'text-metrik-silver/70 hover:text-white'
                  }
                `}
              >
                <span className="hidden sm:inline">Session View</span>
                <span className="sm:hidden">Session</span>
                {activeTab === 'session' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />
                )}
              </button>

              <div className="w-px bg-metrik-turquoise/10" />

              {/* Tab Telemetry */}
              <button
                onClick={() => {
                  if (telemetryReady) {
                    setActiveTab('telemetry');
                  }
                }}
                disabled={!telemetryReady}
                className={`
                  relative flex-1 px-4 py-3 sm:px-8 sm:py-4 font-rajdhani font-bold text-xs sm:text-sm uppercase tracking-wider
                  transition-all duration-300
                  ${!telemetryReady 
                    ? 'cursor-not-allowed text-metrik-silver/30' 
                    : activeTab === 'telemetry' 
                      ? 'text-metrik-turquoise' 
                      : 'text-metrik-silver/70 hover:text-white'
                  }
                `}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span>Telemetry</span>
                  
                  {selectedLapsCount > 0 && (
                    <span className="px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-black rounded-full bg-orange-500/90 text-white">
                      {selectedLapsCount}
                    </span>
                  )}
                  
                  {loading && (
                    <Loader2 className="animate-spin text-metrik-turquoise" size={12} />
                  )}
                </div>
                
                {activeTab === 'telemetry' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />
                )}
              </button>
            </div>
          </div>

          {/* CompactSelectors */}
          {activeTab === 'session' && (
            <CompactSelectors
              year={year}
              onYearChange={(newYear) => {
              // Bloquer 2026 pour FREE users
             if (newYear >= 2026 && !canAccessYear(newYear)) {
            setShowUpgradeModal(true);
            return;
            }
            setYear(newYear);
         }}
              selectedGP={selectedGP}
              sessionType={sessionType}
              driver1={driver1}
              driver2={driver2}
              drivers={drivers}
              grandsPrix={grandsPrix}
              onGPChange={setSelectedGP}
              onSessionChange={setSessionType}
              onDriver1Change={setDriver1}
              onDriver2Change={setDriver2}
              onCompareFastestLaps={handleCompareFastestLaps}
              loading={loading}
              selection1={selection1}
              selection2={selection2} 
              getDriverColor={getDriverColor}
              areTeammates={areTeammates}
            />
          )}

          {/* INDICATEUR SÉLECTIONS */}
          {activeTab === 'session' && (selection1 || selection2) && (
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-6">
                {/* Selection 1 */}
                {selection1 ? (
                  <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 bg-metrik-black/50 border border-metrik-turquoise/50 rounded-lg">
                    <div 
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getDriverColor(selection1.driver) }}
                    />
                    <span className="font-rajdhani font-bold text-sm sm:text-base">
                      {selection1.driver} - Lap {selection1.lapNumber}
                    </span>
                    <button
                      onClick={() => clearSelection(1)}
                      className="ml-auto text-metrik-silver hover:text-white transition-colors"
                    >
                      <X size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 sm:px-4 bg-metrik-black/30 border border-metrik-silver/20 rounded-lg text-center">
                    <span className="font-rajdhani text-metrik-silver text-sm sm:text-base">Select first lap</span>
                  </div>
                )}
                
                <span className="text-metrik-silver font-rajdhani font-bold text-center text-sm sm:text-base">VS</span>
                
                {/* Selection 2 */}
                {selection2 ? (
                  <div className="flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 bg-metrik-black/50 border border-metrik-turquoise/50 rounded-lg">
                    <div 
                      className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: getDriverColor(selection2.driver) }}
                    />
                    <span className="font-rajdhani font-bold text-sm sm:text-base">
                      {selection2.driver} - Lap {selection2.lapNumber}
                    </span>
                    <button
                      onClick={() => clearSelection(2)}
                      className="ml-auto text-metrik-silver hover:text-white transition-colors"
                    >
                      <X size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="px-3 py-2 sm:px-4 bg-metrik-black/30 border border-metrik-silver/20 rounded-lg text-center">
                    <span className="font-rajdhani text-metrik-silver text-sm sm:text-base">Select second lap</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CONTENU SELON TAB ACTIF */}
          <div className={activeTab === 'session' ? 'mt-6 sm:mt-8' : 'mt-0'}>
            {activeTab === 'session' ? (
              driver1 || driver2 ? (
                <SessionView
                  year={year}
                  selectedGP={selectedGP}
                  sessionType={sessionType}
                  driver1={driver1}
                  driver2={driver2}
                  onLapClick={handleLapClick}
                  selection1={selection1}
                  selection2={selection2}
                  getDriverColor={getDriverColor}
                  areTeammates={areTeammates}
                />
              ) : (
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-12 sm:p-20 text-center">
                  <Gauge className="text-metrik-silver/50 mx-auto mb-3 sm:mb-4" size={48} />
                  <p className="text-metrik-silver font-rajdhani text-base sm:text-xl">
                    Select at least one driver to view lap times
                  </p>
                </div>
              )
            ) : (
              telemetryData ? (
                <TelemetryView
                  telemetryData={telemetryData}
                  driver1={selection1?.driver || driver1}
                  driver2={selection2?.driver || driver2}
                  sessionType={sessionType}
                  lapNumber={selection1?.lapNumber}
                  getDriverColor={getDriverColor}
                  areTeammates={areTeammates}
                  loading={loading}
                />
              ) : (
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-12 sm:p-20 text-center">
                  <Gauge className="text-metrik-silver/50 mx-auto mb-3 sm:mb-4" size={48} />
                  <p className="text-metrik-silver font-rajdhani text-base sm:text-xl mb-3 sm:mb-4">
                    {loading 
                      ? 'Loading telemetry data...' 
                      : 'Select 2 laps in Session View to compare'
                    }
                  </p>
                  {loading && (
                    <Loader2 className="animate-spin text-metrik-turquoise mx-auto" size={28} />
                  )}
                </div>
              )
            )}
          </div>

          {/* Upgrade Modal */}
          <UpgradeModal 
            isOpen={showUpgradeModal}
            onClose={() => setShowUpgradeModal(false)}
            reason="current_season" 
          />

          {/* TOAST NOTIFICATION */}
          {toastVisible && toastMessage && (
            <div className="fixed bottom-4 sm:bottom-8 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up px-4 max-w-[90vw] sm:max-w-none">
              <div className="bg-metrik-black/95 backdrop-blur-md border border-metrik-turquoise/40 rounded-lg px-4 py-2 sm:px-5 sm:py-2.5 shadow-2xl">
                <p className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver tracking-wide text-center">
                  {toastMessage}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}