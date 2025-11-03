import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, Gauge, TrendingDown, BarChart3, Clock, Activity, Zap, Target, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SEO from '../components/SEO';
import GrandPrixSelector from '../components/GrandPrixSelector';
import SessionSelector from '../components/SessionSelector';
import DriverSelector from '../components/DriverSelector';
import YearSelector from '../components/YearSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonChart from '../components/SkeletonChart';
import { useRateLimit } from '../hooks/useRateLimit';
import UpgradeModal from '../components/UpgradeModal';
import ExportButton from '../components/ExportButton';
import { useAuth } from '../contexts/AuthContext';
import {
  getDrivers,
  getTelemetryComparison,
  getRacePace,
  getMultiDriverPace,
  getStintAnalysis,
  getSectorEvolution,
  getMultiDriverSectors
} from '../services/backend.service';
import type { TelemetryData } from '../types/telemetry';
import type { RacePaceData, MultiDriverPaceData, StintAnalysisData, SectorEvolutionData } from '../types/raceevolution';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart, ReferenceLine, ComposedChart, Cell } from 'recharts';
import { MobileResponsiveChart } from '../components/MobileResponsiveChart';

export default function TelemetryPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [year, setYear] = useState(2025);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [sessionType, setSessionType] = useState('Q');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driver1, setDriver1] = useState('');
  const [driver2, setDriver2] = useState('');
  const [comparisonDrivers, setComparisonDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData | null>(null);
  const [racePaceData, setRacePaceData] = useState<RacePaceData | null>(null);
  const [multiDriverData, setMultiDriverData] = useState<MultiDriverPaceData | null>(null);
  const [stintData, setStintData] = useState<StintAnalysisData | null>(null);
  const [sectorData, setSectorData] = useState<SectorEvolutionData | null>(null);
  const [multiDriverSectorsData, setMultiDriverSectorsData] = useState<any>(null);
  const [trackPath, setTrackPath] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'telemetry' | 'pace' | 'comparison' | 'stints' | 'sectors'>('telemetry');
  const { canMakeRequest, incrementRequest, isUnlimited } = useRateLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showOutliersMultiDriver, setShowOutliersMultiDriver] = useState(false);
  const [showOutliersSectors, setShowOutliersSectors] = useState(false);
  const [showOutliersRacePace, setShowOutliersRacePace] = useState(false);
  const [hoveredSegment, setHoveredSegment] = useState<any>(null);

  useEffect(() => {
    loadDrivers();
  }, [year, selectedGP, sessionType]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, sessionType);
      setDrivers(data);
      if (data.length > 0) {
        setDriver1(data[0].abbreviation);
        setDriver2(data[1]?.abbreviation || data[0].abbreviation);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadTelemetry = async () => {
  if (!driver1 || !driver2) return;
  
  // Check rate limit
  if (!canMakeRequest) {
    setShowUpgradeModal(true);
    return;
  }
  
  setLoading(true);
  try {
    const data = await getTelemetryComparison(year, selectedGP, sessionType, driver1, driver2);
    setTelemetryData(data);
    incrementRequest(); // Increment after successful request
  } catch (error) {
    console.error('Error loading telemetry:', error);
  } finally {
    setLoading(false);
  }
};

  const loadRaceEvolution = async () => {
  if (!driver1 || sessionType !== 'R') return;
  
  if (!canMakeRequest) {
    setShowUpgradeModal(true);
    return;
  }
  
  setLoading(true);
  try {
    const [pace, stints, sectors] = await Promise.all([
      getRacePace(year, selectedGP, driver1),
      getStintAnalysis(year, selectedGP, driver1),
      getSectorEvolution(year, selectedGP, driver1)
    ]);
    setRacePaceData(pace);
    setStintData(stints);
    setSectorData(sectors);
    incrementRequest();
  } catch (error) {
    console.error('Error loading race evolution:', error);
  } finally {
    setLoading(false);
  }
};

  const loadQualifyingSectors = async () => {
  if (comparisonDrivers.length === 0) return;
  
  // Check rate limit
  if (!canMakeRequest) {
    setShowUpgradeModal(true);
    return;
  }
  
  setLoading(true);
  try {
    const sectors = await getMultiDriverSectors(year, selectedGP, sessionType, comparisonDrivers);
    setMultiDriverSectorsData(sectors);
    incrementRequest(); // Increment after successful request
  } catch (error) {
    console.error('Error loading qualifying sectors:', error);
  } finally {
    setLoading(false);
  }
};

  const loadMultiDriverComparison = async () => {
  if (comparisonDrivers.length === 0) return;
  
  if (!canMakeRequest) {
    setShowUpgradeModal(true);
    return;
  }
  
  setLoading(true);
  try {
    const data = await getMultiDriverPace(year, selectedGP, comparisonDrivers, sessionType);
    setMultiDriverData(data);
    incrementRequest();
  } catch (error) {
    console.error('Error loading multi driver comparison:', error);
  } finally {
    setLoading(false);
  }
};

  const getCompoundColor = (compound: string) => {
    const colors: { [key: string]: string } = {
      SOFT: '#ff4444',
      MEDIUM: '#ffd700',
      HARD: '#f0f0f0',
      INTERMEDIATE: '#00ff00',
      WET: '#0099ff',
      UNKNOWN: '#666666'
    };
    return colors[compound] || colors.UNKNOWN;
  };

  const formatLapTime = (seconds: number | null): string => {
    if (!seconds) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  const telemetryChartData = telemetryData?.telemetry.map(point => ({
    distance: point.distance,
    speed1: point.speed1,
    speed2: point.speed2,
    speedDelta: point.speed1 - point.speed2,
    throttle1: point.throttle1,
    throttle2: point.throttle2,
    brake1: point.brake1 ? 100 : 0,
    brake2: point.brake2 ? 100 : 0,
    gear1: point.gear1,
    gear2: point.gear2,
  })) || [];

console.log('showOutliersRacePace:', showOutliersRacePace);
console.log('racePaceData count:', racePaceData?.paceData.length);

  const paceChartData = (() => {
  if (!racePaceData) return [];
  
  // Récupérer tous les temps valides
  const allTimes = racePaceData.paceData
    .filter(lap => lap.lapTime && lap.lapTime > 0)
    .map(lap => lap.lapTime as number);
  
  if (allTimes.length === 0) return [];
  
  // Calculer la médiane
  const sorted = [...allTimes].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const threshold = median + 20; // Pit stop = médiane + 20s
  
  // Filtrer et mapper
  return racePaceData.paceData
    .filter(lap => {
      if (!lap.lapTime || lap.lapTime <= 0) return false;
      // Si checkbox décochée, exclure les pit stops
      if (!showOutliersRacePace && lap.lapTime >= threshold) return false;
      return true;
    })
    .map(lap => ({
      lap: lap.lapNumber,
      time: lap.lapTime as number,
      compound: lap.compound || 'UNKNOWN',
      tyreLife: lap.tyreLife || 0
    }));
})();

console.log('Filtrage:', showOutliersRacePace ? 'OFF (montrer tout)' : 'ON (cacher pit stops)');
console.log('Tours affichés:', paceChartData.length);
console.log('Min:', Math.min(...paceChartData.map(d => d.time)).toFixed(2) + 's');
console.log('Max:', Math.max(...paceChartData.map(d => d.time)).toFixed(2) + 's');

  const comparisonChartData = multiDriverData ?
  (() => {
    // Étape 1 : Calculer les médianes pour filtrage
    const medians: { [key: string]: number } = {};
    
    multiDriverData.drivers.forEach(driver => {
      const validTimes = multiDriverData.data[driver]
        .filter(d => d.lapTime && d.lapTime > 0 && !d.pitOutTime && !d.pitInTime)
        .map(d => d.lapTime as number);
      
      if (validTimes.length > 0) {
        const sorted = [...validTimes].sort((a, b) => a - b);
        medians[driver] = sorted[Math.floor(sorted.length / 2)];
      }
    });
    
    // Étape 2 : Construire les données du graphique
    const maxLaps = Math.max(...Object.values(multiDriverData.data).map(d => d.length));
    const chartData = [];
    
    for (let i = 0; i < maxLaps; i++) {
      const lapData: any = { lap: i + 1 };
      
      multiDriverData.drivers.forEach(driver => {
        const driverData = multiDriverData.data[driver];
        if (driverData[i]) {
          const lap = driverData[i];
          
          // Ne pas inclure les pit stops
          if (lap.lapTime && lap.lapTime > 0 && !lap.pitOutTime && !lap.pitInTime) {
            
            // Si on veut filtrer les outliers
            if (!showOutliersMultiDriver) {
              const threshold = (medians[driver] || 0) + 20;
              if (lap.lapTime < threshold) {
                lapData[driver] = lap.lapTime;
              }
            } else {
              // Montrer tout (y compris outliers)
              lapData[driver] = lap.lapTime;
            }
          }
        }
      });
      
      chartData.push(lapData);
    }
    
    return chartData;
  })()
  : [];

  // ✅ Calcul du domain Y pour Multi-Driver
const multiDriverDomain = (() => {
  if (showOutliersMultiDriver || comparisonChartData.length === 0 || !multiDriverData) {
    return ['auto', 'auto'] as const;
  }
  
  const allTimes: number[] = [];
  comparisonChartData.forEach(lap => {
    multiDriverData.drivers.forEach(driver => {
      if (lap[driver] != null && lap[driver] > 0) {
        allTimes.push(lap[driver]);
      }
    });
  });
  
  if (allTimes.length === 0) return ['auto', 'auto'] as const;
  
  const minTime = Math.min(...allTimes);
  const maxTime = Math.max(...allTimes);
  
  return [
    Math.floor(minTime) - 1,
    Math.ceil(maxTime) + 1
  ] as [number, number];
})();

  const stintEvolutionChartData = stintData?.stints.map((stint) => ({
    stint: stint.stint,
    avgTime: stint.avgLapTime,
    bestTime: stint.bestLapTime,
    worstTime: stint.worstLapTime,
    compound: stint.compound,
    laps: stint.totalLaps
  })) || [];

  const stintChartData = stintData?.stints.map(stint => ({
    stint: `Stint ${stint.stint}`,
    compound: stint.compound,
    avgTime: stint.avgLapTime,
    bestTime: stint.bestLapTime,
    worstTime: stint.worstLapTime,
    degradation: stint.degradation,
    laps: stint.totalLaps
  })) || [];

  const sectorChartData = (() => {
  if (!sectorData) return [];
  
  // Calculer les médianes
  const s1Times = sectorData.sectorData.filter(l => l.sector1 && l.sector1 > 0).map(l => l.sector1 as number);
  const s2Times = sectorData.sectorData.filter(l => l.sector2 && l.sector2 > 0).map(l => l.sector2 as number);
  const s3Times = sectorData.sectorData.filter(l => l.sector3 && l.sector3 > 0).map(l => l.sector3 as number);
  
  let median1 = 0, median2 = 0, median3 = 0;
  
  if (s1Times.length > 0) {
    const sorted1 = [...s1Times].sort((a, b) => a - b);
    median1 = sorted1[Math.floor(sorted1.length / 2)];
  }
  
  if (s2Times.length > 0) {
    const sorted2 = [...s2Times].sort((a, b) => a - b);
    median2 = sorted2[Math.floor(sorted2.length / 2)];
  }
  
  if (s3Times.length > 0) {
    const sorted3 = [...s3Times].sort((a, b) => a - b);
    median3 = sorted3[Math.floor(sorted3.length / 2)];
  }
  
  const threshold1 = median1 + 10;
  const threshold2 = median2 + 10;
  const threshold3 = median3 + 10;
  
  return sectorData.sectorData
    .filter(lap => {
      // Si on ne veut pas les outliers, filtrer
      if (!showOutliersSectors) {
        return (!lap.sector1 || lap.sector1 < threshold1) &&
               (!lap.sector2 || lap.sector2 < threshold2) &&
               (!lap.sector3 || lap.sector3 < threshold3);
      }
      return true;
    })
    .map(lap => ({
      lap: lap.lapNumber,
      sector1: lap.sector1,
      sector2: lap.sector2,
      sector3: lap.sector3,
      totalTime: (lap.sector1 || 0) + (lap.sector2 || 0) + (lap.sector3 || 0)
    }));
})();

// ✅ Calcul du domain Y pour Sectors - DOIT ÊTRE APRÈS sectorChartData
const sectorsDomain = (() => {
  if (showOutliersSectors || sectorChartData.length === 0) {
    return ['auto', 'auto'] as const;
  }
  
  const allSectorTimes: number[] = [];
  sectorChartData.forEach(lap => {
    if (lap.sector1) allSectorTimes.push(lap.sector1);
    if (lap.sector2) allSectorTimes.push(lap.sector2);
    if (lap.sector3) allSectorTimes.push(lap.sector3);
  });
  
  if (allSectorTimes.length === 0) return ['auto', 'auto'] as const;
  
  const minTime = Math.min(...allSectorTimes);
  const maxTime = Math.max(...allSectorTimes);
  
  return [
    Math.floor(minTime) - 1,
    Math.ceil(maxTime) + 1
  ] as [number, number];
})();

  const multiSectorChartData = multiDriverSectorsData ? 
    Object.entries(multiDriverSectorsData.sectors).map(([driver, sectors]: [string, any]) => ({
      driver,
      sector1: sectors.sector1,
      sector2: sectors.sector2,
      sector3: sectors.sector3,
      total: sectors.total
    }))
    : [];

  // Delta Graph Data - Calcul segment par segment NORMALISÉ
  const deltaGraphData = telemetryData && sessionType === 'Q' ? 
    (() => {
      const data = [];
      let cumulativeTime1 = 0;
      let cumulativeTime2 = 0;
      
      data.push({
        distance: telemetryData.telemetry[0].distance,
        delta: 0,
        speed1: telemetryData.telemetry[0].speed1,
        speed2: telemetryData.telemetry[0].speed2
      });
      
      for (let i = 1; i < telemetryData.telemetry.length; i++) {
        const prevPoint = telemetryData.telemetry[i - 1];
        const currPoint = telemetryData.telemetry[i];
        
        const segmentDistance = currPoint.distance - prevPoint.distance;
        
        const segmentTime1 = prevPoint.speed1 > 0 ? segmentDistance / (prevPoint.speed1 / 3.6) : 0;
        const segmentTime2 = prevPoint.speed2 > 0 ? segmentDistance / (prevPoint.speed2 / 3.6) : 0;
        
        cumulativeTime1 += segmentTime1;
        cumulativeTime2 += segmentTime2;
        
        data.push({
          distance: currPoint.distance,
          deltaRaw: cumulativeTime2 - cumulativeTime1,
          speed1: currPoint.speed1,
          speed2: currPoint.speed2,
          delta: 0
        });
      }
      
      const realDelta = (telemetryData.lapTime2 || 0) - (telemetryData.lapTime1 || 0);
      const calculatedDelta = data[data.length - 1]?.deltaRaw || 0;
      const normalizationFactor = calculatedDelta !== 0 ? realDelta / calculatedDelta : 1;
      
      return data.map(point => ({
        distance: point.distance,
        delta: point.deltaRaw ? point.deltaRaw * normalizationFactor : 0,
        speed1: point.speed1,
        speed2: point.speed2
      }));
    })()
    : [];

  // 🔥 NOUVEAU: Track Dominance Data - Version ULTRA PRO avec vérification GPS
  const trackDominanceData = telemetryData && sessionType === 'Q' ? 
    (() => {
      // ✅ ÉTAPE 1 : Vérifier si on a des GPS valides (non nuls)
      const validGpsPoints = telemetryData.telemetry.filter(p => 
        p.x != null && p.y != null &&  // != null vérifie null ET undefined
        !isNaN(p.x) && !isNaN(p.y) &&
        Math.abs(p.x) > 0.1 && Math.abs(p.y) > 0.1
      );

      // Si moins de 50% des points ont des GPS valides, désactiver le circuit
      if (validGpsPoints.length < telemetryData.telemetry.length * 0.5) {
        return null;
      }

      const segmentSize = 50; // Segments plus petits pour plus de précision
      const maxDistance = telemetryData.telemetry[telemetryData.telemetry.length - 1]?.distance || 0;
      const numSegments = Math.ceil(maxDistance / segmentSize);
      
      const segments = [];
      
      for (let i = 0; i < numSegments; i++) {
        const startDist = i * segmentSize;
        const endDist = Math.min((i + 1) * segmentSize, maxDistance);
        
        const segmentPoints = telemetryData.telemetry.filter(
          p => p.distance >= startDist && p.distance < endDist &&
               p.x != null && p.y != null && !isNaN(p.x) && !isNaN(p.y)
        );
        
        if (segmentPoints.length > 0) {
          const avgSpeed1 = segmentPoints.reduce((sum, p) => sum + p.speed1, 0) / segmentPoints.length;
          const avgSpeed2 = segmentPoints.reduce((sum, p) => sum + p.speed2, 0) / segmentPoints.length;
          
          const advantage = avgSpeed1 - avgSpeed2;
          const advantagePercent = avgSpeed2 > 0 ? (advantage / avgSpeed2) * 100 : 0;
          
          // Centre du segment pour le tracé
          const centerPoint = segmentPoints[Math.floor(segmentPoints.length / 2)];
          
          segments.push({
            segment: i + 1,
            startDistance: startDist,
            endDistance: endDist,
            avgSpeed1,
            avgSpeed2,
            advantage,
            advantagePercent,
            dominant: Math.abs(advantagePercent) < 0.3 ? 'equal' : advantagePercent > 0 ? 'driver1' : 'driver2',
            x: centerPoint.x,
            y: centerPoint.y,
            points: segmentPoints
          });
        }
      }
      
      // Si pas assez de segments valides, retourner null
      if (segments.length < 10) {
        return null;
      }

      // Stats globales
      const driver1Dominant = segments.filter(s => s.dominant === 'driver1').length;
      const driver2Dominant = segments.filter(s => s.dominant === 'driver2').length;
      const equalSegments = segments.filter(s => s.dominant === 'equal').length;
      
      // Top 5 segments pour chaque pilote
      const driver1BestSegments = segments
        .filter(s => s.dominant === 'driver1')
        .sort((a, b) => b.advantage - a.advantage)
        .slice(0, 5);
      
      const driver2BestSegments = segments
        .filter(s => s.dominant === 'driver2')
        .sort((a, b) => Math.abs(b.advantage) - Math.abs(a.advantage))
        .slice(0, 5);
      
      return {
        segments,
        stats: {
          driver1Dominant,
          driver2Dominant,
          equalSegments,
          totalSegments: segments.length,
          driver1BestSegments,
          driver2BestSegments
        },
        hasValidGps: true
      };
    })()
    : null;

  // Calcul des stats pour RacePaceData
  const racePaceStats = racePaceData ? (() => {
    const validLaps = racePaceData.paceData.filter(l => l.lapTime !== null && l.lapTime > 0);
    const lapTimes = validLaps.map(l => l.lapTime as number);
    const avg = lapTimes.length > 0 ? lapTimes.reduce((sum, l) => sum + l, 0) / lapTimes.length : 0;
    const variance = lapTimes.length > 0 ? lapTimes.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lapTimes.length : 0;
    
    return {
      totalLaps: racePaceData.paceData.length,
      bestLapTime: lapTimes.length > 0 ? Math.min(...lapTimes) : 0,
      avgLapTime: avg,
      totalStints: stintData?.stints.length || 0,
      stdDeviation: Math.sqrt(variance)
    };
  })() : null;

  // Calcul des stats pour TelemetryData
  const telemetryStats = telemetryData ? {
    maxSpeed1: Math.max(...telemetryData.telemetry.map(p => p.speed1)),
    maxSpeed2: Math.max(...telemetryData.telemetry.map(p => p.speed2)),
    delta: (telemetryData.lapTime1 || 0) - (telemetryData.lapTime2 || 0)
  } : null;

  const tabs = [
    { id: 'telemetry' as const, name: 'Telemetry', icon: Activity, desc: '2 Drivers Comparison' },
    { id: 'pace' as const, name: 'Race Pace', icon: TrendingDown, desc: 'Lap Times Evolution', requiresRace: true },
    { id: 'comparison' as const, name: 'Multi-Driver', icon: BarChart3, desc: 'Compare Multiple Drivers', requiresRace: true },
    { id: 'stints' as const, name: 'Track Dominance', icon: Target, desc: 'Speed Advantage Map', requiresQualifying: true },
    { id: 'sectors' as const, name: 'Sectors', icon: Clock, desc: 'Sector Times', requiresRace: true }
  ];

  return (
    <>
      <SEO 
        path="/telemetry"
        title={t('telemetry.title') + ' - METRIK DELTA'}
        description={t('telemetry.title')}
        keywords="f1 telemetry, télémétrie f1, telemetría f1, f1 data analysis, analyse données f1"
      />
      <div className="min-h-screen bg-metrik-black text-white">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors group"
          >
            <ArrowLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
            <span className="font-rajdhani font-bold uppercase tracking-wide">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <Gauge className="text-metrik-turquoise" size={32} />
            <h1 className="text-4xl font-rajdhani font-black bg-gradient-to-r from-white to-metrik-turquoise bg-clip-text text-transparent">
              TELEMETRY ANALYSIS
            </h1>
          </div>
        </div>

        {/* Selection Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <YearSelector selectedYear={year} onSelectYear={setYear} />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <GrandPrixSelector
              year={year}
              selectedRound={selectedGP}
              onSelect={setSelectedGP}
            />
          </div>
          <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
            <SessionSelector
              selectedSession={sessionType}
              onSelectSession={(session: string) => setSessionType(session)}
            />
          </div>
          {(activeTab === 'telemetry' || (activeTab === 'stints' && sessionType === 'Q')) && (
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
              <DriverSelector
                drivers={drivers}
                selectedDriver={driver1}
                onSelectDriver={setDriver1}
                label="Driver 1"
              />
            </div>
          )}
        </div>

        {/* Secondary Driver Selector for Telemetry and Track Dominance */}
        {(activeTab === 'telemetry' || (activeTab === 'stints' && sessionType === 'Q')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
              <DriverSelector
                drivers={drivers}
                selectedDriver={driver2}
                onSelectDriver={setDriver2}
                label="Driver 2"
              />
            </div>
          </div>
        )}

        {/* Driver Selector for Pace/Sectors (Race only) */}
        {(activeTab === 'pace' || (activeTab === 'sectors' && sessionType === 'R')) && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-4 shadow-lg shadow-metrik-turquoise/20">
              <DriverSelector
                drivers={drivers}
                selectedDriver={driver1}
                onSelectDriver={setDriver1}
                label="Driver"
              />
            </div>
          </div>
        )}

        {/* Multi Driver Selector for Comparison and Qualifying Sectors */}
        {(activeTab === 'comparison' || (activeTab === 'sectors' && sessionType === 'Q')) && (
          <div className="mb-8">
            <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-xl p-6 shadow-lg shadow-metrik-turquoise/20">
              <h3 className="text-lg font-rajdhani font-bold text-metrik-turquoise mb-4">
                Select Drivers to Compare
              </h3>
              <div className="flex flex-wrap gap-3">
                {drivers.map((driver) => (
                  <button
                    key={driver.abbreviation}
                    onClick={() => {
                      if (comparisonDrivers.includes(driver.abbreviation)) {
                        setComparisonDrivers(comparisonDrivers.filter(d => d !== driver.abbreviation));
                      } else {
                        setComparisonDrivers([...comparisonDrivers, driver.abbreviation]);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-rajdhani font-bold transition-all duration-200 ${
                      comparisonDrivers.includes(driver.abbreviation)
                        ? 'bg-metrik-turquoise text-metrik-black shadow-lg shadow-metrik-turquoise/50'
                        : 'bg-metrik-card border border-metrik-turquoise/30 text-metrik-silver hover:text-metrik-turquoise'
                    }`}
                  >
                    {driver.abbreviation}
                  </button>
                ))}
              </div>
              <div className="text-sm text-metrik-silver mt-3">
                Selected: {comparisonDrivers.length} driver{comparisonDrivers.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="mb-8 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isDisabled = (tab.requiresRace && sessionType !== 'R') || (tab.requiresQualifying && sessionType !== 'Q');
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    group relative px-6 py-4 rounded-xl font-rajdhani font-bold uppercase tracking-wide transition-all duration-300
                    ${isActive 
                      ? 'bg-gradient-to-r from-metrik-turquoise to-metrik-turquoise/80 text-metrik-black shadow-lg shadow-metrik-turquoise/50' 
                      : isDisabled
                        ? 'bg-metrik-card/50 border border-metrik-silver/20 text-metrik-silver/40 cursor-not-allowed'
                        : 'bg-metrik-card border border-metrik-turquoise/30 text-metrik-silver hover:text-metrik-turquoise hover:border-metrik-turquoise/60 hover:shadow-lg hover:shadow-metrik-turquoise/20'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <div className="text-left">
                      <div className="text-sm">{tab.name}</div>
                      <div className={`text-xs font-normal ${isActive ? 'text-metrik-black/80' : 'text-metrik-silver/60'}`}>
                        {tab.desc}
                      </div>
                    </div>
                  </div>
                  {isDisabled && (
                    <div className="absolute -top-2 -right-2 bg-metrik-card border border-metrik-turquoise/30 text-metrik-turquoise text-xs px-2 py-1 rounded-full">
                      {tab.requiresRace ? 'Race only' : 'Qualifying only'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Load Data Button */}
        <div className="mb-8">
          <button
            onClick={() => {
              if (activeTab === 'telemetry' || (activeTab === 'stints' && sessionType === 'Q')) loadTelemetry();
              else if (activeTab === 'pace' || (activeTab === 'stints' && sessionType === 'R') || (activeTab === 'sectors' && sessionType === 'R')) loadRaceEvolution();
              else if (activeTab === 'comparison') loadMultiDriverComparison();
              else if (activeTab === 'sectors' && sessionType === 'Q') loadQualifyingSectors();
            }}
            disabled={loading || ((activeTab === 'telemetry' || (activeTab === 'stints' && sessionType === 'Q')) && (!driver1 || !driver2)) || ((activeTab === 'comparison' || (activeTab === 'sectors' && sessionType === 'Q')) && comparisonDrivers.length === 0)}
            className="w-full backdrop-blur-xl bg-gradient-to-r from-metrik-turquoise to-metrik-turquoise/80 hover:from-metrik-turquoise/90 hover:to-metrik-turquoise/70 disabled:from-metrik-silver/50 disabled:to-metrik-silver/30 text-metrik-black font-rajdhani font-black text-lg py-4 rounded-xl shadow-lg shadow-metrik-turquoise/50 disabled:shadow-none transition-all duration-300 uppercase tracking-wide disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="animate-spin" size={20} />
                Loading...
              </span>
            ) : (
              `Load ${activeTab === 'telemetry' ? 'Telemetry' : activeTab === 'pace' ? 'Race Pace' : activeTab === 'comparison' ? 'Multi-Driver' : activeTab === 'stints' ? (sessionType === 'Q' ? 'Track Dominance' : 'Stint Analysis') : 'Sectors'} Data`
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <SkeletonChart />
        ) : (
          <div className="space-y-8">
            {/* Telemetry Tab */}
            {activeTab === 'telemetry' && telemetryData && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Lap Time</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {formatLapTime(telemetryData.lapTime1 || 0)}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">{driver1}</div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Lap Time</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {formatLapTime(telemetryData.lapTime2 || 0)}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">{driver2}</div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Delta</span>
                    </div>
                    <div className={`text-3xl font-rajdhani font-black mb-1 ${
                      telemetryStats && telemetryStats.delta > 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {telemetryStats && telemetryStats.delta > 0 ? '+' : ''}{telemetryStats?.delta.toFixed(3)}s
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">
                      {telemetryStats && Math.abs(telemetryStats.delta) < 0.001 ? 'Equal pace' : telemetryStats && telemetryStats.delta > 0 ? `${driver1} slower` : `${driver1} faster`}
                    </div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Gauge className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Max Speed</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-2xl font-rajdhani font-black text-white">
                          {telemetryStats?.maxSpeed1.toFixed(0)}
                        </div>
                        <div className="text-xs text-metrik-silver">{driver1}</div>
                      </div>
                      <div>
                        <div className="text-2xl font-rajdhani font-black text-white">
                          {telemetryStats?.maxSpeed2.toFixed(0)}
                        </div>
                        <div className="text-xs text-metrik-silver">{driver2}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Speed Comparison */}
<div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
      <Gauge className="w-6 h-6" />
      SPEED COMPARISON
    </h3>
    <ExportButton
      elementId="speed-comparison-chart"
      fileName={`speed-comparison-${year}-R${selectedGP}-${sessionType}-${driver1}-${driver2}`}
      type="png"
      isUnlimited={isUnlimited}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      label="Export PNG"
    />
  </div>
  <div id="speed-comparison-chart">
    <MobileResponsiveChart height={400}>
      <LineChart data={telemetryChartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
        <XAxis 
          dataKey="distance" 
          stroke="#666"
          label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
        />
        <YAxis 
          stroke="#666"
          label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #00E5CC',
            borderRadius: '8px'
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="speed1" 
          stroke="#00E5CC" 
          strokeWidth={2}
          dot={false}
          name={driver1}
        />
        <Line 
          type="monotone" 
          dataKey="speed2" 
          stroke="#ff4444" 
          strokeWidth={2}
          dot={false}
          name={driver2}
        />
      </LineChart>
    </MobileResponsiveChart>
  </div>
</div>

                {/* Delta Graph pour Qualification */}
{sessionType === 'Q' && deltaGraphData.length > 0 && (
  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
    <div className="flex items-center justify-between mb-4">
      <div>
        <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
          <Zap className="w-6 h-6" />
          DELTA ANALYSIS - {driver1} vs {driver2}
        </h3>
        <div className="text-sm text-metrik-silver mt-2 font-inter">
          Cumulative time gap throughout the lap • Green = {driver1} ahead • Red = {driver2} ahead
        </div>
      </div>
      <ExportButton
        elementId="delta-analysis-chart"
        fileName={`delta-analysis-${year}-R${selectedGP}-${driver1}-${driver2}`}
        type="png"
        isUnlimited={isUnlimited}
        onUpgradeClick={() => setShowUpgradeModal(true)}
        label="Export PNG"
      />
    </div>
                    <div id="delta-analysis-chart">
  <MobileResponsiveChart height={400}>
                      <AreaChart data={deltaGraphData}>
                        <defs>
                          <linearGradient id="deltaPositive" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2}/>
                          </linearGradient>
                          <linearGradient id="deltaNegative" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.8}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                        <XAxis 
                          dataKey="distance" 
                          stroke="#999"
                          label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                        />
                        <YAxis 
                          stroke="#999"
                          label={{ value: 'Time Gap (s)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                          tickFormatter={(value) => `${value >= 0 ? '+' : ''}${value.toFixed(3)}s`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a1a',
                            border: '2px solid #00E5CC',
                            borderRadius: '12px',
                            padding: '12px'
                          }}
                          formatter={(value: any) => {
                            const val = parseFloat(value);
                            return [
                              `${Math.abs(val).toFixed(3)}s`,
                              val > 0 ? `${driver1} ahead by` : val < 0 ? `${driver2} ahead by` : 'Equal pace'
                            ];
                          }}
                          labelFormatter={(label) => `Distance: ${label}m`}
                        />
                        <ReferenceLine 
                          y={0} 
                          stroke="#00E5CC" 
                          strokeWidth={3} 
                          strokeDasharray="5 5"
                          label={{ 
                            value: 'Equal', 
                            position: 'right',
                            fill: '#00E5CC',
                            fontSize: 12,
                            fontWeight: 'bold'
                          }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="delta" 
                          stroke="#00E5CC" 
                          strokeWidth={4}
                          fill="url(#deltaPositive)"
                          fillOpacity={1}
                        />
                      </AreaChart>
                    </MobileResponsiveChart>
</div>
                  </div>
                )}

                {/* Throttle Application */}
<div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
      <Activity className="w-6 h-6" />
      THROTTLE APPLICATION
    </h3>
    <ExportButton
      elementId="throttle-chart"
      fileName={`throttle-${year}-R${selectedGP}-${sessionType}-${driver1}-${driver2}`}
      type="png"
      isUnlimited={isUnlimited}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      label="Export PNG"
    />
  </div>
  <div id="throttle-chart">
    <MobileResponsiveChart height={350}>
                    <LineChart data={telemetryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        dataKey="distance" 
                        stroke="#666"
                        label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                      />
                      <YAxis 
                        stroke="#666"
                        label={{ value: 'Throttle (%)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="throttle1" 
                        stroke="#00E5CC" 
                        strokeWidth={3}
                        dot={false}
                        name={`${driver1} Throttle`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="throttle2" 
                        stroke="#00ff00" 
                        strokeWidth={3}
                        dot={false}
                        name={`${driver2} Throttle`}
                      />
                    </LineChart>
                  </MobileResponsiveChart>
                  </div>
                </div>

                {/* Brake Application */}
<div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
      <Activity className="w-6 h-6" />
      BRAKE APPLICATION
    </h3>
    <ExportButton
      elementId="brake-chart"
      fileName={`brake-${year}-R${selectedGP}-${sessionType}-${driver1}-${driver2}`}
      type="png"
      isUnlimited={isUnlimited}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      label="Export PNG"
    />
  </div>
  <div id="brake-chart">
    <MobileResponsiveChart height={350}>
                    <LineChart data={telemetryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        dataKey="distance" 
                        stroke="#666"
                        label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                      />
                      <YAxis 
                        stroke="#666"
                        label={{ value: 'Brake (%)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="brake1" 
                        stroke="#ff4444" 
                        strokeWidth={3}
                        dot={false}
                        name={`${driver1} Brake`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="brake2" 
                        stroke="#ff8800" 
                        strokeWidth={3}
                        dot={false}
                        name={`${driver2} Brake`}
                      />
                    </LineChart>
                  </MobileResponsiveChart>
                  </div>
                </div>

                {/* Gear Usage */}
<div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
      <Settings className="w-6 h-6" />
      GEAR SELECTION
    </h3>
    <ExportButton
      elementId="gear-chart"
      fileName={`gear-${year}-R${selectedGP}-${sessionType}-${driver1}-${driver2}`}
      type="png"
      isUnlimited={isUnlimited}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      label="Export PNG"
    />
  </div>
  <div id="gear-chart">
    <MobileResponsiveChart height={300}>
                    <LineChart data={telemetryChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        dataKey="distance" 
                        stroke="#666"
                        label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                      />
                      <YAxis 
                        stroke="#666"
                        label={{ value: 'Gear', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                        domain={[1, 8]}
                        ticks={[1, 2, 3, 4, 5, 6, 7, 8]}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line 
                        type="stepAfter" 
                        dataKey="gear1" 
                        stroke="#00E5CC" 
                        strokeWidth={3}
                        dot={false}
                        name={driver1}
                      />
                      <Line 
                        type="stepAfter" 
                        dataKey="gear2" 
                        stroke="#ff4444" 
                        strokeWidth={3}
                        dot={false}
                        name={driver2}
                      />
                    </LineChart>
                  </MobileResponsiveChart>
                  </div>
                </div>
              </div>
            )}

            {/* Race Pace Tab */}
            {activeTab === 'pace' && racePaceData && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Clock className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Avg Lap Time</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {formatLapTime(racePaceStats?.avgLapTime || 0)}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">Excluding outliers</div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Zap className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Best Lap</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {formatLapTime(racePaceStats?.bestLapTime || 0)}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">Lap {racePaceData?.paceData.find(l => l.lapTime === racePaceStats?.bestLapTime)?.lapNumber || '-'}</div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <Target className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Total Laps</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {racePaceStats?.totalLaps || 0}
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">{racePaceStats?.totalStints || 0} stint{(racePaceStats?.totalStints || 0) > 1 ? 's' : ''}</div>
                  </div>
                  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20 hover:shadow-metrik-turquoise/40 transition-all duration-300">
                    <div className="flex items-center justify-between mb-2">
                      <BarChart3 className="text-metrik-turquoise" size={24} />
                      <span className="text-xs text-metrik-silver uppercase tracking-wide font-rajdhani font-bold">Consistency</span>
                    </div>
                    <div className="text-3xl font-rajdhani font-black text-white mb-1">
                      {racePaceStats ? ((1 - (racePaceStats.stdDeviation / racePaceStats.avgLapTime)) * 100).toFixed(1) : '0.0'}%
                    </div>
                    <div className="text-sm text-metrik-silver font-inter">±{racePaceStats?.stdDeviation.toFixed(3) || '0.000'}s std dev</div>
                  </div>
                </div>

                {/* Pace Chart */}
<div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
  <div className="flex items-center justify-between mb-6">
    <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
      <TrendingDown className="w-6 h-6" />
      LAP TIME EVOLUTION - {driver1}
    </h3>
    <label className="flex items-center gap-2 text-sm text-metrik-silver hover:text-metrik-turquoise transition-colors cursor-pointer">
      <input 
        type="checkbox" 
        checked={showOutliersRacePace}
        onChange={(e) => setShowOutliersRacePace(e.target.checked)}
        className="w-4 h-4 accent-metrik-turquoise cursor-pointer"
      />
      <span className="font-rajdhani font-semibold">Show outliers (pit stops)</span>
    </label>
    <ExportButton
      elementId="race-pace-chart"
      fileName={`race-pace-${year}-R${selectedGP}-${driver1}`}
      type="png"
      isUnlimited={isUnlimited}
      onUpgradeClick={() => setShowUpgradeModal(true)}
      label="Export PNG"
    />
  </div>
  </div>
                  <div id="race-pace-chart">
  <MobileResponsiveChart height={400}>
                    <LineChart data={paceChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        dataKey="lap" 
                        stroke="#666"
                        label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                      />
                      <YAxis 
  stroke="#666"
  tickFormatter={(value) => `${value.toFixed(1)}s`}
  label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
  domain={(() => {
  if (showOutliersRacePace || paceChartData.length === 0) {
    return ['auto', 'auto'];
  }
  
  const times = paceChartData.map(d => d.time);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  
  return [
    Math.floor(minTime) - 1,
    Math.ceil(maxTime) + 1
  ];
})()}
/>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => formatLapTime(value)}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="time" 
                        stroke="#00E5CC" 
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#00E5CC' }}
                        name="Lap Time"
                      />
                    </LineChart>
                  </MobileResponsiveChart>
                </div>
              </div>
            )}

            {/* Multi-Driver Comparison Tab */}
{activeTab === 'comparison' && multiDriverData && (
  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        MULTI-DRIVER {sessionType === 'R' ? 'RACE' : 'QUALIFYING'} COMPARISON
      </h3>
      <label className="flex items-center gap-2 text-sm text-metrik-silver hover:text-metrik-turquoise transition-colors cursor-pointer">
        <input 
          type="checkbox" 
          checked={showOutliersMultiDriver}
          onChange={(e) => setShowOutliersMultiDriver(e.target.checked)}
          className="w-4 h-4 accent-metrik-turquoise cursor-pointer"
        />
        <span className="font-rajdhani font-semibold">Show outliers (pit stops)</span>
      </label>
      <ExportButton
        elementId="multi-driver-chart"
        fileName={`multi-driver-${year}-R${selectedGP}-${sessionType}-${comparisonDrivers.join('-')}`}
        type="png"
        isUnlimited={isUnlimited}
        onUpgradeClick={() => setShowUpgradeModal(true)}
        label="Export PNG"
      />
    </div>
    <div id="multi-driver-chart">
      <MobileResponsiveChart height={500} mobileHeight={350}>
        <LineChart key={`multidriver-${showOutliersMultiDriver}`} data={comparisonChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis 
            dataKey="lap" 
            stroke="#666"
            label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
          />
          <YAxis 
            stroke="#666"
            tickFormatter={(value) => `${value.toFixed(1)}s`}
            domain={multiDriverDomain}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #00E5CC',
              borderRadius: '8px'
            }}
            formatter={(value: any) => formatLapTime(value)}
          />
          <Legend />
          {multiDriverData.drivers.map((driver, index) => (
            <Line
              key={driver}
              type="monotone"
              dataKey={driver}
              stroke={`hsl(${index * 60}, 70%, 60%)`}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </MobileResponsiveChart>
    </div>
  </div>
)}

            {/* 🔥 TRACK DOMINANCE TAB - VERSION ULTRA PRO ET ÉPURÉE */}
{activeTab === 'stints' && sessionType === 'Q' && telemetryData && !trackDominanceData && (
  <div className="backdrop-blur-xl bg-metrik-card/95 border border-yellow-500/30 rounded-2xl p-12 shadow-lg">
    <div className="flex flex-col items-center text-center space-y-4">
      <div className="p-6 bg-yellow-500/10 rounded-full">
        <Target className="text-yellow-500" size={48} />
      </div>
      <h3 className="text-2xl font-rajdhani font-black text-yellow-500">
        GPS DATA NOT AVAILABLE
      </h3>
      <p className="text-metrik-silver text-lg font-inter max-w-2xl">
        Track Dominance Map requires GPS coordinates from the telemetry data. This feature is only available for races from <strong>2018 onwards</strong> where GPS tracking data is provided by FastF1.
      </p>
      <p className="text-metrik-turquoise text-sm font-inter">
        Try selecting a more recent Grand Prix (2018+) to view the circuit dominance analysis.
      </p>
    </div>
  </div>
)}

{activeTab === 'stints' && sessionType === 'Q' && trackDominanceData && (
  <div className="space-y-8">
    {/* Stats Overview */}
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
      <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/30 rounded-2xl p-6 shadow-lg hover:shadow-green-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <Target className="text-green-500" size={28} />
          <span className="text-xs text-metrik-silver uppercase tracking-wider font-rajdhani font-bold">{driver1} Dominance</span>
        </div>
        <div className="text-5xl font-rajdhani font-black text-green-500 mb-2">
          {((trackDominanceData.stats.driver1Dominant / trackDominanceData.stats.totalSegments) * 100).toFixed(0)}%
        </div>
        <div className="text-sm text-metrik-silver font-inter">
          {trackDominanceData.stats.driver1Dominant} of {trackDominanceData.stats.totalSegments} segments
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-500/30 rounded-2xl p-6 shadow-lg hover:shadow-red-500/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <Target className="text-red-500" size={28} />
          <span className="text-xs text-metrik-silver uppercase tracking-wider font-rajdhani font-bold">{driver2} Dominance</span>
        </div>
        <div className="text-5xl font-rajdhani font-black text-red-500 mb-2">
          {((trackDominanceData.stats.driver2Dominant / trackDominanceData.stats.totalSegments) * 100).toFixed(0)}%
        </div>
        <div className="text-sm text-metrik-silver font-inter">
          {trackDominanceData.stats.driver2Dominant} of {trackDominanceData.stats.totalSegments} segments
        </div>
      </div>

      <div className="backdrop-blur-xl bg-gradient-to-br from-metrik-turquoise/10 to-metrik-turquoise/5 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg hover:shadow-metrik-turquoise/20 transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <Gauge className="text-metrik-turquoise" size={28} />
          <span className="text-xs text-metrik-silver uppercase tracking-wider font-rajdhani font-bold">Equal Pace</span>
        </div>
        <div className="text-5xl font-rajdhani font-black text-metrik-turquoise mb-2">
          {((trackDominanceData.stats.equalSegments / trackDominanceData.stats.totalSegments) * 100).toFixed(0)}%
        </div>
        <div className="text-sm text-metrik-silver font-inter">
          {trackDominanceData.stats.equalSegments} segments within 0.3%
        </div>
      </div>
    </div>

    {/* 🔥 TRACK MAP ÉPURÉ - ULTRA MODERNE */}
    <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-8 shadow-lg shadow-metrik-turquoise/20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-3xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-3">
            <Target className="w-8 h-8" />
            CIRCUIT DOMINANCE MAP
          </h3>
          <p className="text-sm text-metrik-silver mt-2 font-inter">
            Real GPS circuit layout with speed advantage gradient • Hover segments for detailed analysis
          </p>
        </div>
        <div className="flex gap-2 md:gap-4 flex-wrap">
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
            <div className="w-3 h-3 rounded-full bg-green-500 shadow-lg shadow-green-500/50" />
            <span className="text-xs text-green-500 font-rajdhani font-bold">{driver1}</span>
          </div>
          <div className="flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
            <span className="text-xs text-red-500 font-rajdhani font-bold">{driver2}</span>
          </div>
        </div>
      </div>

      {/* SVG Circuit ÉPURÉ */}
      <div 
        className="relative w-full rounded-xl overflow-hidden md:h-[700px]"
        style={{ 
          height: '100vh', 
          maxHeight: '700px',
          minHeight: '500px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #0f0f0f 50%, #0a0a0a 100%)' 
        }}
      >
        {/* 🔥 CARD FIXE RESPONSIVE */}
<div className="absolute left-2 top-2 md:left-4 md:top-4 w-48 md:w-64 pointer-events-none z-10">
  {hoveredSegment ? (
    <div className="backdrop-blur-xl bg-metrik-card/98 border-2 border-metrik-turquoise rounded-xl p-3 md:p-4 shadow-2xl shadow-metrik-turquoise/40 animate-in fade-in duration-200">
      {/* Header compact */}
      <div className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 pb-2 md:pb-3 border-b border-metrik-turquoise/30">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-metrik-turquoise flex items-center justify-center flex-shrink-0">
          <span className="text-metrik-black font-rajdhani font-black text-xs md:text-sm">
            {hoveredSegment.segment}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-metrik-turquoise font-rajdhani font-black text-xs md:text-sm truncate">
            SEG {hoveredSegment.segment}
          </h4>
          <p className="text-metrik-silver text-[10px] md:text-xs font-inter">
            {hoveredSegment.startDistance.toFixed(0)}-{hoveredSegment.endDistance.toFixed(0)}m
          </p>
        </div>
      </div>

      {/* Vitesses des pilotes - compact */}
      <div className="space-y-1.5 md:space-y-2 mb-2 md:mb-3">
        <div className="flex items-center justify-between p-1.5 md:p-2 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 flex-shrink-0" />
            <span className="text-white font-rajdhani font-bold text-[10px] md:text-xs truncate">{driver1}</span>
          </div>
          <span className="text-green-500 font-rajdhani font-black text-xs md:text-sm">
            {hoveredSegment.avgSpeed1.toFixed(1)}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-1.5 md:p-2 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="flex items-center gap-1 md:gap-1.5">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-white font-rajdhani font-bold text-[10px] md:text-xs truncate">{driver2}</span>
          </div>
          <span className="text-red-500 font-rajdhani font-black text-xs md:text-sm">
            {hoveredSegment.avgSpeed2.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Badge d'avantage - compact */}
      <div className="flex items-center justify-center p-2 md:p-2.5 rounded-lg bg-gradient-to-r from-metrik-turquoise/20 to-metrik-turquoise/10 border border-metrik-turquoise/50">
        <div className="text-center">
          <div className="text-[10px] md:text-xs text-metrik-silver font-inter mb-0.5">Δ Speed</div>
          <div className={`text-base md:text-lg font-rajdhani font-black ${
            hoveredSegment.dominant === 'driver1' ? 'text-green-500' : 
            hoveredSegment.dominant === 'driver2' ? 'text-red-500' : 
            'text-metrik-silver'
          }`}>
            {Math.abs(hoveredSegment.advantage).toFixed(1)}
          </div>
          <div className="text-[10px] md:text-xs text-metrik-turquoise font-rajdhani font-bold">
            {hoveredSegment.dominant === 'driver1' ? driver1 : 
             hoveredSegment.dominant === 'driver2' ? driver2 : 
             'Equal'}
          </div>
        </div>
      </div>
    </div>
  ) : (
    <div className="backdrop-blur-xl bg-metrik-card/50 border border-metrik-turquoise/20 rounded-xl p-3 md:p-4 shadow-lg">
      <div className="text-center">
        <Target className="w-6 h-6 md:w-8 md:h-8 text-metrik-turquoise/40 mx-auto mb-1 md:mb-2" />
        <p className="text-metrik-silver/60 font-rajdhani text-[10px] md:text-xs">
          Hover<br/>segment
        </p>
      </div>
    </div>
  )}
</div>

        <svg 
          className="w-full h-full"
          viewBox="0 0 1000 700"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Glow effects */}
            <filter id="track-glow-soft">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>

            {/* Gradient turquoise pour Start/Finish */}
            <linearGradient id="start-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00E5CC" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00E5CC" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {telemetryData && (() => {
            // ✅ Filtrer les points GPS valides uniquement
            const validGpsPoints = telemetryData.telemetry.filter(p => 
              p.x != null && p.y != null &&
              !isNaN(p.x) && !isNaN(p.y) &&
              Math.abs(p.x) > 0.1 && Math.abs(p.y) > 0.1
            );

            if (validGpsPoints.length === 0) return null;

            // Calculs GPS avec points valides
            const allPoints = validGpsPoints.map(p => ({ x: p.x, y: p.y }));
            const xValues = allPoints.map(p => p.x);
            const yValues = allPoints.map(p => p.y);
            const minX = Math.min(...xValues);
            const maxX = Math.max(...xValues);
            const minY = Math.min(...yValues);
            const maxY = Math.max(...yValues);
            const rangeX = maxX - minX;
            const rangeY = maxY - minY;
            
            // Vérification que le range est valide
            if (rangeX === 0 || rangeY === 0 || isNaN(rangeX) || isNaN(rangeY)) return null;

            const viewBoxWidth = 1000;
            const viewBoxHeight = 700;
            const padding = 80;
            const scaleX = (viewBoxWidth - 2 * padding) / rangeX;
            const scaleY = (viewBoxHeight - 2 * padding) / rangeY;
            const scale = Math.min(scaleX, scaleY);
            const offsetX = (viewBoxWidth - rangeX * scale) / 2;
            const offsetY = (viewBoxHeight - rangeY * scale) / 2;

            // Créer le path complet du circuit pour le tracé de base
            const allNormalizedPoints = validGpsPoints.map(p => ({
              x: (p.x - minX) * scale + offsetX,
              y: (p.y - minY) * scale + offsetY
            }));

            const fullTrackPath = allNormalizedPoints.reduce((acc, point, i) => {
              if (i === 0) return `M ${point.x},${point.y}`;
              return `${acc} L ${point.x},${point.y}`;
            }, '');

            return (
              <g>
                {/* Grid subtile */}
                <g opacity="0.03">
                  {Array.from({ length: 20 }, (_, i) => (
                    <line
                      key={`grid-v-${i}`}
                      x1={i * (viewBoxWidth / 20)}
                      y1={0}
                      x2={i * (viewBoxWidth / 20)}
                      y2={viewBoxHeight}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  ))}
                  {Array.from({ length: 14 }, (_, i) => (
                    <line
                      key={`grid-h-${i}`}
                      x1={0}
                      y1={i * (viewBoxHeight / 14)}
                      x2={viewBoxWidth}
                      y2={i * (viewBoxHeight / 14)}
                      stroke="#ffffff"
                      strokeWidth="0.5"
                    />
                  ))}
                </g>

                {/* 🔥 TRACÉ DE BASE - Visible en gris/turquoise pour voir la forme */}
                <path
                  d={fullTrackPath}
                  fill="none"
                  stroke="rgba(0, 229, 204, 0.2)"
                  strokeWidth="25"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Segments colorés par-dessus */}
                {trackDominanceData.segments.map((segment, idx) => {
                  const segmentPoints = segment.points.map(p => ({
                    x: (p.x - minX) * scale + offsetX,
                    y: (p.y - minY) * scale + offsetY
                  }));

                  if (segmentPoints.length < 2) return null;

                  const segmentPath = segmentPoints.reduce((acc, point, i) => {
                    if (i === 0) return `M ${point.x},${point.y}`;
                    return `${acc} L ${point.x},${point.y}`;
                  }, '');

                  // Couleurs PLUS INTENSES et visibles
                  let strokeColor;
                  const intensity = Math.min(Math.abs(segment.advantagePercent) / 1.5, 1);
                  
                  if (segment.dominant === 'driver1') {
                    strokeColor = `rgba(34, 197, 94, ${0.7 + intensity * 0.3})`;
                  } else if (segment.dominant === 'driver2') {
                    strokeColor = `rgba(239, 68, 68, ${0.7 + intensity * 0.3})`;
                  } else {
                    strokeColor = 'rgba(120, 120, 120, 0.6)';
                  }

                  return (
                    <g 
                      key={idx} 
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredSegment(segment)}
                      onMouseLeave={() => setHoveredSegment(null)}
                    >
                      {/* Tracé segment coloré - PLUS ÉPAIS */}
                      <path
                        d={segmentPath}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={hoveredSegment?.segment === segment.segment ? "22" : "18"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="transition-all duration-200"
                        filter="url(#track-glow-soft)"
                      />

                      {/* Zone hover invisible */}
                      <path
                        d={segmentPath}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="35"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  );
                })}

                {/* Start/Finish Line ultra clean */}
                {(() => {
                  const firstValidPoint = validGpsPoints[0];
                  if (!firstValidPoint) return null;

                  const startPoint = {
                    x: (firstValidPoint.x - minX) * scale + offsetX,
                    y: (firstValidPoint.y - minY) * scale + offsetY
                  };

                  if (isNaN(startPoint.x) || isNaN(startPoint.y)) return null;

                  return (
                    <g>
                      {/* Glow circles */}
                      <circle
                        cx={startPoint.x}
                        cy={startPoint.y}
                        r="22"
                        fill="none"
                        stroke="#00E5CC"
                        strokeWidth="2"
                        opacity="0.4"
                      />
                      <circle
                        cx={startPoint.x}
                        cy={startPoint.y}
                        r="16"
                        fill="none"
                        stroke="#00E5CC"
                        strokeWidth="3"
                        opacity="0.8"
                      />

                      {/* Central point */}
                      <circle
                        cx={startPoint.x}
                        cy={startPoint.y}
                        r="8"
                        fill="#00E5CC"
                        filter="url(#track-glow-soft)"
                      />

                      {/* Checkered flag lines */}
                      <line
                        x1={startPoint.x - 20}
                        y1={startPoint.y}
                        x2={startPoint.x + 20}
                        y2={startPoint.y}
                        stroke="#ffffff"
                        strokeWidth="4"
                        strokeDasharray="8 8"
                        opacity="0.8"
                      />

                      {/* Label background */}
                      <rect
                        x={startPoint.x - 70}
                        y={startPoint.y - 50}
                        width="140"
                        height="32"
                        rx="8"
                        fill="#0a0a0a"
                        stroke="#00E5CC"
                        strokeWidth="2"
                        opacity="0.95"
                      />

                      {/* Label text */}
                      <text
                        x={startPoint.x}
                        y={startPoint.y - 28}
                        textAnchor="middle"
                        fill="#00E5CC"
                        fontSize="14"
                        fontWeight="bold"
                        fontFamily="Rajdhani"
                        letterSpacing="1.5"
                      >
                        START / FINISH
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>

    {/* Top 5 Segments pour chaque pilote */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Driver 1 Best Segments */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-green-500/5 to-transparent border border-green-500/20 rounded-2xl p-6 shadow-lg">
        <h4 className="text-xl font-rajdhani font-black text-green-500 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          {driver1} - TOP 5 STRONGEST SEGMENTS
        </h4>
        <div className="space-y-3">
          {trackDominanceData.stats.driver1BestSegments.map((seg, idx) => (
            <div key={idx} className="bg-metrik-card/50 border border-green-500/20 rounded-xl p-4 hover:border-green-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-rajdhani font-bold text-white">
                  #{idx + 1} - Segment {seg.segment}
                </span>
                <span className="text-green-500 font-rajdhani font-black text-xl">
                  +{seg.advantage.toFixed(1)} km/h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-metrik-silver">
                <span>{seg.startDistance.toFixed(0)}-{seg.endDistance.toFixed(0)}m</span>
                <span>{seg.avgSpeed1.toFixed(1)} vs {seg.avgSpeed2.toFixed(1)} km/h</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Driver 2 Best Segments */}
      <div className="backdrop-blur-xl bg-gradient-to-br from-red-500/5 to-transparent border border-red-500/20 rounded-2xl p-6 shadow-lg">
        <h4 className="text-xl font-rajdhani font-black text-red-500 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          {driver2} - TOP 5 STRONGEST SEGMENTS
        </h4>
        <div className="space-y-3">
          {trackDominanceData.stats.driver2BestSegments.map((seg, idx) => (
            <div key={idx} className="bg-metrik-card/50 border border-red-500/20 rounded-xl p-4 hover:border-red-500/40 transition-all duration-300">
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-rajdhani font-bold text-white">
                  #{idx + 1} - Segment {seg.segment}
                </span>
                <span className="text-red-500 font-rajdhani font-black text-xl">
                  +{Math.abs(seg.advantage).toFixed(1)} km/h
                </span>
              </div>
              <div className="flex items-center justify-between text-sm text-metrik-silver">
                <span>{seg.startDistance.toFixed(0)}-{seg.endDistance.toFixed(0)}m</span>
                <span>{seg.avgSpeed2.toFixed(1)} vs {seg.avgSpeed1.toFixed(1)} km/h</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}

            {/* Sectors Tab - Qualifying */}
            {activeTab === 'sectors' && sessionType === 'Q' && multiDriverSectorsData && (
              <div className="space-y-6">
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                  <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    SECTOR 1 COMPARISON
                  </h3>
                  <MobileResponsiveChart height={300}>
                    <BarChart data={multiSectorChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <YAxis 
  stroke="#666"
  domain={[
    showOutliersSectors ? 'auto' : (dataMin: number) => Math.floor(dataMin * 0.95),
    showOutliersSectors ? 'auto' : (dataMax: number) => Math.ceil(dataMax * 1.05)
  ]}
/>
                      <YAxis 
                        type="category" 
                        dataKey="driver" 
                        stroke="#666"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => `${value.toFixed(3)}s`}
                      />
                      <Bar dataKey="sector1" fill="#ff4444" name="Sector 1" />
                    </BarChart>
                  </MobileResponsiveChart>
                </div>
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                  <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    SECTOR 2 COMPARISON
                  </h3>
                  <MobileResponsiveChart height={300}>
                    <BarChart data={multiSectorChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        type="number" 
                        stroke="#666"
                        tickFormatter={(value) => `${value.toFixed(2)}s`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="driver" 
                        stroke="#666"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => `${value.toFixed(3)}s`}
                      />
                      <Bar dataKey="sector2" fill="#ffd700" name="Sector 2" />
                    </BarChart>
                  </MobileResponsiveChart>
                </div>
                <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
                  <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                    <Clock className="w-6 h-6" />
                    SECTOR 3 COMPARISON
                  </h3>
                  <MobileResponsiveChart height={300}>
                    <BarChart data={multiSectorChartData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                      <XAxis 
                        type="number" 
                        stroke="#666"
                        tickFormatter={(value) => `${value.toFixed(2)}s`}
                      />
                      <YAxis 
                        type="category" 
                        dataKey="driver" 
                        stroke="#666"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #00E5CC',
                          borderRadius: '8px'
                        }}
                        formatter={(value: any) => `${value.toFixed(3)}s`}
                      />
                      <Bar dataKey="sector3" fill="#00ff00" name="Sector 3" />
                    </BarChart>
                  </MobileResponsiveChart>
                </div>
                <div className="text-center text-metrik-silver text-sm font-inter">
                  Comparison of sector times from each driver's fastest lap - Lower is better
                </div>
              </div>
            )}

            {/* Sectors Tab - Race */}
{activeTab === 'sectors' && sessionType === 'R' && sectorData && (
  <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-6 shadow-lg shadow-metrik-turquoise/20">
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise tracking-wide flex items-center gap-2">
        <Clock className="w-6 h-6" />
        SECTOR EVOLUTION - {driver1}
      </h3>
      <label className="flex items-center gap-2 text-sm text-metrik-silver hover:text-metrik-turquoise transition-colors cursor-pointer">
        <input 
          type="checkbox" 
          checked={showOutliersSectors}
          onChange={(e) => setShowOutliersSectors(e.target.checked)}
          className="w-4 h-4 accent-metrik-turquoise cursor-pointer"
        />
        <span className="font-rajdhani font-semibold">Show outliers (pit stops)</span>
      </label>
      <ExportButton
        elementId="sectors-chart"
        fileName={`sectors-${year}-R${selectedGP}-${driver1}`}
        type="png"
        isUnlimited={isUnlimited}
        onUpgradeClick={() => setShowUpgradeModal(true)}
        label="Export PNG"
      />
    </div>
    <div id="sectors-chart">
      <MobileResponsiveChart height={400}>
        <LineChart key={`sectors-${showOutliersSectors}`} data={sectorChartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
          <XAxis dataKey="lap" stroke="#666" />
          <YAxis 
            stroke="#666"
            domain={sectorsDomain}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1a1a1a',
              border: '1px solid #00E5CC',
              borderRadius: '8px'
            }}
            formatter={(value: any) => `${value?.toFixed(3)}s`}
          />
          <Legend />
          <Line type="monotone" dataKey="sector1" stroke="#ff4444" strokeWidth={2} name="Sector 1" />
          <Line type="monotone" dataKey="sector2" stroke="#ffd700" strokeWidth={2} name="Sector 2" />
          <Line type="monotone" dataKey="sector3" stroke="#00ff00" strokeWidth={2} name="Sector 3" />
        </LineChart>
      </MobileResponsiveChart>
    </div>
  </div>
)}

            {/* Empty States */}
            {activeTab === 'telemetry' && !telemetryData && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <Gauge className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  Select two drivers and click "Load Telemetry Data" to compare
                </p>
              </div>
            )}
            {activeTab === 'pace' && !racePaceData && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <TrendingDown className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  Select a driver and click "Load Race Pace Data"
                </p>
              </div>
            )}
            {activeTab === 'comparison' && !multiDriverData && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <BarChart3 className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  Select multiple drivers and click "Load Multi-Driver Data"
                </p>
              </div>
            )}
            {activeTab === 'stints' && sessionType === 'Q' && !trackDominanceData && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <Target className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  Select two drivers and click "Load Track Dominance Data"
                </p>
              </div>
            )}
            {activeTab === 'stints' && sessionType !== 'Q' && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <Target className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  Track Dominance is only available in Qualification mode
                </p>
              </div>
            )}
            {activeTab === 'sectors' && !sectorData && !multiDriverSectorsData && !loading && (
              <div className="backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-2xl p-20 flex flex-col items-center justify-center shadow-lg shadow-metrik-turquoise/20">
                <Clock className="text-metrik-silver/50 mb-6" size={64} />
                <p className="text-metrik-silver font-rajdhani text-xl text-center">
                  {sessionType === 'Q' 
                    ? 'Select drivers and click "Load Sectors Data"'
                    : 'Select a driver and click "Load Sectors Data"'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          onUpgrade={() => {
            setShowUpgradeModal(false);
            // TODO: Ouvrir le modal d'authentification pour upgrade
            window.location.href = '/'; // Temporaire, on changera avec Stripe
          }}
        />
    </div>
    </>
  );
}