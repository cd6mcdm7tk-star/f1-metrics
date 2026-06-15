import { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, Loader2, Gauge, Link, Check } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

export interface LapSelection {
  driver: string;
  lapNumber: number;
}

const MAX_LAPS = 4;

const TEAMS_2026: Record<string, string> = {
  VER: 'Red Bull Racing', HAD: 'Red Bull Racing',
  LEC: 'Ferrari',         HAM: 'Ferrari',
  RUS: 'Mercedes',        ANT: 'Mercedes',
  NOR: 'McLaren',         PIA: 'McLaren',
  ALO: 'Aston Martin',    STR: 'Aston Martin',
  GAS: 'Alpine',          COL: 'Alpine',
  ALB: 'Williams',        SAI: 'Williams',
  OCO: 'Haas',            BEA: 'Haas',
  LAW: 'Racing Bulls',    LIN: 'Racing Bulls',
  HUL: 'Audi',            BOR: 'Audi',
  PER: 'Cadillac',        BOT: 'Cadillac',
};

function serializeSelections(selections: LapSelection[]): string {
  return selections.map(s => `${s.driver}-${s.lapNumber}`).join(',');
}

function deserializeSelections(raw: string): LapSelection[] {
  if (!raw) return [];
  return raw.split(',').flatMap(part => {
    const match = part.match(/^([A-Z]{2,4})-(\d+)$/);
    if (!match) return [];
    return [{ driver: match[1], lapNumber: parseInt(match[2]) }];
  });
}

export default function TelemetryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // --- URL-backed state ---
  const [year, setYearRaw] = useState(() => parseInt(searchParams.get('y') || '2025'));
  const [selectedGP, setSelectedGPRaw] = useState(() => parseInt(searchParams.get('gp') || '1'));
  const [sessionType, setSessionTypeRaw] = useState(() => searchParams.get('s') || 'Q');
  const [driver1, setDriver1Raw] = useState(() => searchParams.get('d1') || '');
  const [driver2, setDriver2Raw] = useState(() => searchParams.get('d2') || '');
  const [selections, setSelectionsRaw] = useState<LapSelection[]>(() =>
    deserializeSelections(searchParams.get('ls') || '')
  );

  // --- derived comparison state ---
  const [activeCompIdx, setActiveCompIdx] = useState(0); // which comparison is shown (0 = sel[0] vs sel[1])
  const [allTelemetryData, setAllTelemetryData] = useState<TelemetryData[]>([]); // indexed by comp slot
  const [loadingIdx, setLoadingIdx] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'session' | 'telemetry'>('session');

  // --- other state ---
  const [drivers, setDrivers] = useState<any[]>([]);
  const [grandsPrix, setGrandsPrix] = useState<any[]>([]);
  const [driverTeams, setDriverTeams] = useState<Record<string, string>>({});
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const { canAccessYear, isPremium, canMakeRequest, incrementRequest } = useSubscription();
  const { getCached, setCached, getTelemetryKey } = useTelemetryCache();

  // --- URL sync (write) ---
  const urlSyncRef = useRef(false);
  useEffect(() => {
    if (!urlSyncRef.current) { urlSyncRef.current = true; return; }
    const params: Record<string, string> = {
      y: year.toString(),
      gp: selectedGP.toString(),
      s: sessionType,
    };
    if (driver1) params.d1 = driver1;
    if (driver2) params.d2 = driver2;
    const ls = serializeSelections(selections);
    if (ls) params.ls = ls;
    setSearchParams(params, { replace: true });
  }, [year, selectedGP, sessionType, driver1, driver2, selections]);

  // --- setters that also clear dependent state ---
  const setYear = (v: number) => {
    setYearRaw(v);
    setSelectedGPRaw(1);
    setSessionTypeRaw('Q');
    setDriver1Raw('');
    setDriver2Raw('');
    setSelectionsRaw([]);
    setAllTelemetryData([]);
    setActiveTab('session');
  };

  const setSelectedGP = (v: number) => {
    setSelectedGPRaw(v);
    setSelectionsRaw([]);
    setAllTelemetryData([]);
  };

  const setSessionType = (v: string) => {
    setSessionTypeRaw(v);
    setSelectionsRaw([]);
    setAllTelemetryData([]);
  };

  const setDriver1 = (v: string) => { setDriver1Raw(v); };
  const setDriver2 = (v: string) => { setDriver2Raw(v); };

  // --- Team colors ---
  const getTeamColor = useCallback((teamName: string): string => {
    const name = teamName.toLowerCase();
    const teamColors: Record<string, string> = {
      'red bull': '#3671C6', 'ferrari': '#E8002D', 'mercedes': '#27F4D2',
      'mclaren': '#FF8700', 'alpine': '#FF87BC', 'aston martin': '#229971',
      'racing bulls': '#6692FF', 'rb': '#6692FF', 'alphatauri': '#6692FF',
      'haas': '#B6BABD', 'kick sauber': '#00E701', 'sauber': '#00E701',
      'alfa romeo': '#C92D4B', 'williams': '#00A0DE', 'racing point': '#F596C8',
      'renault': '#FFF500', 'cadillac': '#003DA5', 'audi': '#BB0A30',
    };
    for (const [key, color] of Object.entries(teamColors)) {
      if (name.includes(key)) return color;
    }
    return '#00E5CC';
  }, []);

  const getDriverColor = useCallback((driverCode: string): string => {
    return getTeamColor(driverTeams[driverCode] || 'Unknown');
  }, [driverTeams, getTeamColor]);

  const areTeammates = useCallback((d1: string, d2: string): boolean => {
    const t1 = driverTeams[d1];
    const t2 = driverTeams[d2];
    if (!t1 || !t2) return false;
    return t1.toLowerCase() === t2.toLowerCase();
  }, [driverTeams]);

  // --- Load drivers ---
  useEffect(() => {
    loadDrivers();
  }, [year, selectedGP, sessionType]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, sessionType);
      setDrivers(data);
      const teamsMap: Record<string, string> = {};
      data.forEach((d: any) => { if (d.abbreviation && d.team) teamsMap[d.abbreviation] = d.team; });
      if (year === 2026) {
        Object.entries(TEAMS_2026).forEach(([code, team]) => { if (!teamsMap[code]) teamsMap[code] = team; });
      }
      setDriverTeams(teamsMap);

      // Set default driver1/driver2 from URL or first 2 in list
      if (!driver1 && data.length > 0) setDriver1Raw(searchParams.get('d1') || data[0].abbreviation);
      if (!driver2 && data.length > 1) setDriver2Raw(searchParams.get('d2') || data[1]?.abbreviation || data[0].abbreviation);
    } catch (e) {
      console.error('Error loading drivers:', e);
    }
  };

  // --- Load grands prix ---
  useEffect(() => {
    getGrandsPrix(year).then(d => setGrandsPrix(d.grands_prix || [])).catch(() => {});
  }, [year]);

  // --- Load telemetry for a comparison pair ---
  const loadComparison = useCallback(async (refSel: LapSelection, compSel: LapSelection, compIdx: number) => {
    if (!canMakeRequest) { setShowUpgradeModal(true); return; }

    const cacheKey = getTelemetryKey(year, selectedGP, sessionType, refSel.driver, refSel.lapNumber, compSel.driver, compSel.lapNumber);
    const cached = getCached<TelemetryData>(cacheKey);

    if (cached) {
      setAllTelemetryData(prev => { const next = [...prev]; next[compIdx] = cached; return next; });
      setActiveCompIdx(compIdx);
      setActiveTab('telemetry');
      return;
    }

    setLoadingIdx(compIdx);
    try {
      const data = await getTelemetryComparison(year, selectedGP, sessionType, refSel.driver, compSel.driver, refSel.lapNumber, compSel.lapNumber);
      setCached(cacheKey, data);
      setAllTelemetryData(prev => { const next = [...prev]; next[compIdx] = data; return next; });
      setActiveCompIdx(compIdx);
      setActiveTab('telemetry');
      incrementRequest();
    } catch (e) {
      console.error('Error loading telemetry:', e);
    } finally {
      setLoadingIdx(null);
    }
  }, [year, selectedGP, sessionType, canMakeRequest, getCached, setCached, getTelemetryKey, incrementRequest]);

  // --- Auto-load when selections change ---
  useEffect(() => {
    if (selections.length < 2) return;
    const ref = selections[0];
    const comp = selections[activeCompIdx + 1] || selections[1];
    const idx = selections.indexOf(comp) - 1;
    loadComparison(ref, comp, Math.max(0, idx));
  }, [selections]);

  // --- Lap click handler ---
  const handleLapClick = (driver: string, lapNumber: number) => {
    setSelectionsRaw(prev => {
      const existingIdx = prev.findIndex(s => s.driver === driver && s.lapNumber === lapNumber);
      if (existingIdx >= 0) {
        const next = prev.filter((_, i) => i !== existingIdx);
        if (next.length === 0) setAllTelemetryData([]);
        return next;
      }
      if (prev.length >= MAX_LAPS) {
        showToast(`Max ${MAX_LAPS} laps — oldest replaced`);
        return [...prev.slice(1), { driver, lapNumber }];
      }
      showToast(`${driver} Lap ${lapNumber} added`);
      return [...prev, { driver, lapNumber }];
    });
  };

  // --- Switch active comparison ---
  const handleSwitchComparison = (compIdx: number) => {
    setActiveCompIdx(compIdx);
    if (!allTelemetryData[compIdx]) {
      loadComparison(selections[0], selections[compIdx + 1], compIdx);
    } else {
      setActiveTab('telemetry');
    }
  };

  // --- Compare fastest laps ---
  const handleCompareFastestLaps = () => {
    if (!driver1 || !driver2 || !canMakeRequest) return;
    const cacheKey = getTelemetryKey(year, selectedGP, sessionType, driver1, undefined, driver2, undefined);
    const cached = getCached<TelemetryData>(cacheKey);

    const finish = (data: TelemetryData) => {
      setSelectionsRaw([{ driver: driver1, lapNumber: 0 }, { driver: driver2, lapNumber: 0 }]);
      setAllTelemetryData([data]);
      setActiveCompIdx(0);
      setActiveTab('telemetry');
    };

    if (cached) { finish(cached); return; }

    setLoadingIdx(0);
    getTelemetryComparison(year, selectedGP, sessionType, driver1, driver2)
      .then(data => { setCached(cacheKey, data); finish(data); incrementRequest(); })
      .catch(e => console.error(e))
      .finally(() => setLoadingIdx(null));
  };

  // --- Share URL ---
  const handleShareUrl = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 3000);
  };

  const currentTelemetry = allTelemetryData[activeCompIdx] || null;
  const isLoading = loadingIdx !== null;
  const hasComparison = selections.length >= 2 && currentTelemetry !== null;

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
              onClick={() => activeTab === 'telemetry' ? setActiveTab('session') : navigate('/')}
              className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors group"
            >
              <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={18} />
              <span className="font-rajdhani font-bold uppercase tracking-wide text-sm sm:text-base">Back</span>
            </button>
            <div className="flex items-center gap-3">
              <Gauge className="text-metrik-turquoise" size={24} />
              <h1 className="text-2xl sm:text-4xl font-rajdhani font-black bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent">
                TELEMETRY ANALYSIS
              </h1>
            </div>
            <button
              onClick={handleShareUrl}
              className="flex items-center gap-2 px-3 py-1.5 bg-metrik-card/80 border border-metrik-turquoise/30 rounded-lg text-xs font-rajdhani font-bold text-metrik-silver hover:text-white hover:border-metrik-turquoise/60 transition-all"
              title="Copy shareable link"
            >
              {urlCopied ? <Check size={14} className="text-green-400" /> : <Link size={14} />}
              <span className="hidden sm:inline">{urlCopied ? 'Copied!' : 'Share'}</span>
            </button>
          </div>

          {/* TABS */}
          <div className="bg-metrik-black border border-metrik-turquoise/20 rounded-xl mb-4 sm:mb-6 overflow-hidden">
            <div className="flex items-stretch">
              <button
                onClick={() => setActiveTab('session')}
                className={`relative flex-1 px-4 py-3 sm:px-8 sm:py-4 font-rajdhani font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 ${activeTab === 'session' ? 'text-metrik-turquoise' : 'text-metrik-silver/70 hover:text-white'}`}
              >
                Session View
                {activeTab === 'session' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />}
              </button>

              <div className="w-px bg-metrik-turquoise/10" />

              <button
                onClick={() => hasComparison && setActiveTab('telemetry')}
                disabled={!hasComparison}
                className={`relative flex-1 px-4 py-3 sm:px-8 sm:py-4 font-rajdhani font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 ${!hasComparison ? 'cursor-not-allowed text-metrik-silver/30' : activeTab === 'telemetry' ? 'text-metrik-turquoise' : 'text-metrik-silver/70 hover:text-white'}`}
              >
                <div className="flex items-center justify-center gap-2 sm:gap-3">
                  <span>Telemetry</span>
                  {selections.length > 0 && (
                    <span className="px-1.5 py-0.5 sm:px-2 text-[10px] sm:text-xs font-black rounded-full bg-orange-500/90 text-white">
                      {selections.length}
                    </span>
                  )}
                  {isLoading && <Loader2 className="animate-spin text-metrik-turquoise" size={12} />}
                </div>
                {activeTab === 'telemetry' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />}
              </button>
            </div>
          </div>

          {/* Selectors (session tab only) */}
          {activeTab === 'session' && (
            <CompactSelectors
              year={year}
              onYearChange={(newYear) => {
                if (newYear >= 2026 && !canAccessYear(newYear)) { setShowUpgradeModal(true); return; }
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
              loading={isLoading}
              selection1={selections[0] || null}
              selection2={selections[1] || null}
              getDriverColor={getDriverColor}
              areTeammates={areTeammates}
              isPremium={isPremium}
            />
          )}

          {/* Selection bar */}
          {activeTab === 'session' && selections.length > 0 && (
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <span className="text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-silver/60 uppercase tracking-wider">
                  Selected ({selections.length}/{MAX_LAPS})
                </span>
                {selections.map((sel, idx) => (
                  <div
                    key={`${sel.driver}-${sel.lapNumber}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-metrik-black/50 border border-metrik-turquoise/50 rounded-lg"
                  >
                    {idx === 0 && (
                      <span className="text-[9px] font-rajdhani font-black text-metrik-turquoise/70 uppercase">REF</span>
                    )}
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getDriverColor(sel.driver) }} />
                    <span className="font-rajdhani font-bold text-xs sm:text-sm text-white">
                      {sel.driver}{sel.lapNumber > 0 ? ` L${sel.lapNumber}` : ' fastest'}
                    </span>
                    <button
                      onClick={() => handleLapClick(sel.driver, sel.lapNumber)}
                      className="ml-1 text-metrik-silver/60 hover:text-white transition-colors text-xs leading-none"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {selections.length < 2 && (
                  <span className="text-[10px] font-rajdhani text-metrik-silver/50 italic">
                    Pick {2 - selections.length} more lap{selections.length === 0 ? 's' : ''} to compare
                  </span>
                )}
                {selections.length >= 2 && (
                  <button
                    onClick={() => setActiveTab('telemetry')}
                    className="ml-auto px-3 py-1.5 bg-metrik-turquoise/20 border border-metrik-turquoise/60 rounded-lg text-[10px] sm:text-xs font-rajdhani font-bold text-metrik-turquoise hover:bg-metrik-turquoise/30 transition-all"
                  >
                    View Telemetry →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Main content */}
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
                  selections={selections}
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
              currentTelemetry ? (
                <TelemetryView
                  telemetryData={currentTelemetry}
                  selections={selections}
                  activeCompIdx={activeCompIdx}
                  onSwitchComparison={handleSwitchComparison}
                  getDriverColor={getDriverColor}
                  areTeammates={areTeammates}
                  loading={isLoading}
                  loadingIdx={loadingIdx}
                  sessionType={sessionType}
                />
              ) : (
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-12 sm:p-20 text-center">
                  <Gauge className="text-metrik-silver/50 mx-auto mb-3 sm:mb-4" size={48} />
                  <p className="text-metrik-silver font-rajdhani text-base sm:text-xl mb-3 sm:mb-4">
                    {isLoading ? 'Loading telemetry data...' : 'Select 2+ laps in Session View to compare'}
                  </p>
                  {isLoading && <Loader2 className="animate-spin text-metrik-turquoise mx-auto" size={28} />}
                </div>
              )
            )}
          </div>

          <UpgradeModal isOpen={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} reason="current_season" />

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
