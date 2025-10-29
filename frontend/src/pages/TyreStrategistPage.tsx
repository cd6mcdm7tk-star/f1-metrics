import { useState, useEffect } from 'react';
import { ArrowLeft, Gauge, TrendingDown, Clock, AlertTriangle, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import YearSelector from '../components/YearSelector';
import GrandPrixSelector from '../components/GrandPrixSelector';
import { getDrivers } from '../services/api';
import DriverSelector from '../components/DriverSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import SkeletonCard from '../components/SkeletonCard';

interface Stint {
  compound: string;
  start_lap: number;
  end_lap: number;
  num_laps: number;
  avg_lap_time: string;
  fastest_lap: string;
  slowest_lap: string;
  degradation: number;
}

interface CompoundStats {
  total_laps: number;
  avg_lap_time: string;
  fastest_lap: string;
  degradation_rate: number;
}

interface TyreStrategy {
  driver: string;
  total_laps: number;
  pit_stops: number;
  stints: Stint[];
  compounds_stats: {
    SOFT?: CompoundStats;
    MEDIUM?: CompoundStats;
    HARD?: CompoundStats;
  };
}

export default function TyreStrategistPage() {
  const navigate = useNavigate();

  const [year, setYear] = useState(2024);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loading, setLoading] = useState(false);
  const [strategyData, setStrategyData] = useState<TyreStrategy | null>(null);

  useEffect(() => {
    if (selectedGP) {
      loadDrivers();
    }
  }, [selectedGP]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, 'Race');
      setDrivers(data.drivers);
      if (data.drivers.length > 0) {
        setSelectedDriver(data.drivers[0].abbreviation);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadStrategy = async () => {
    if (!selectedDriver) return;
    
    setLoading(true);
    setStrategyData(null);
    try {
      // Fonction getTyreStrategy pas encore implémentée dans l'API
const data = null; // await getTyreStrategy(year, selectedGP, selectedDriver);
console.log('getTyreStrategy endpoint not yet implemented');
      setStrategyData(data);
    } catch (error) {
      console.error('Error loading strategy:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTyreColor = (compound: string) => {
    if (compound === 'SOFT') return '#FF0000';
    if (compound === 'MEDIUM') return '#FFD700';
    if (compound === 'HARD') return '#FFFFFF';
    return '#808080';
  };

  const getTyreBg = (compound: string) => {
    if (compound === 'SOFT') return 'bg-red-500/20 border-red-500/30';
    if (compound === 'MEDIUM') return 'bg-yellow-500/20 border-yellow-500/30';
    if (compound === 'HARD') return 'bg-white/20 border-white/30';
    return 'bg-gray-500/20 border-gray-500/30';
  };

  const formatLapTime = (timeStr: string) => {
    const parts = timeStr.split(' ');
    return parts.length > 2 ? parts[2] : timeStr;
  };

  return (
    <div className="min-h-screen bg-metrik-black pb-20">
      <div className="metrik-container py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span className="font-rajdhani font-semibold">Retour</span>
        </button>

        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-rajdhani font-bold text-white mb-2 flex items-center gap-3">
            <Gauge className="text-metrik-turquoise" size={40} />
            Tyre Strategist
          </h1>
          <p className="text-metrik-silver text-lg">Analyse scientifique de la stratégie pneumatiques</p>
        </div>

        <div className="glass-cockpit p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <YearSelector
              selectedYear={year}
              onSelectYear={setYear}
            />

            <GrandPrixSelector
              year={year}
              selectedRound={selectedGP}
              onSelect={setSelectedGP}
            />

           <DriverSelector
  drivers={drivers}
  selectedDriver={selectedDriver}
  onSelectDriver={setSelectedDriver}
  label="Pilote"
/>

            <div className="flex items-end">
              <button
                onClick={loadStrategy}
                disabled={loading}
                className="w-full bg-metrik-turquoise hover:bg-metrik-turquoise/80 disabled:bg-metrik-silver/20 disabled:cursor-not-allowed text-metrik-black font-rajdhani font-bold py-2.5 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-metrik-black/20 border-t-metrik-black rounded-full animate-spin" />
                    <span>Analyse...</span>
                  </>
                ) : (
                  <>
                    <BarChart3 size={20} />
                    <span>Analyser</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {strategyData && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="glass-cockpit p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="text-metrik-turquoise" size={20} />
                  <h3 className="text-lg font-rajdhani font-bold text-white">Total Tours</h3>
                </div>
                <div className="text-5xl font-rajdhani font-bold text-metrik-turquoise">
                  {strategyData.total_laps}
                </div>
              </div>

              <div className="glass-cockpit p-6">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="text-metrik-turquoise" size={20} />
                  <h3 className="text-lg font-rajdhani font-bold text-white">Arrêts au Stand</h3>
                </div>
                <div className="text-5xl font-rajdhani font-bold text-metrik-turquoise">
                  {strategyData.pit_stops}
                </div>
              </div>

              <div className="glass-cockpit p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Gauge className="text-metrik-turquoise" size={20} />
                  <h3 className="text-lg font-rajdhani font-bold text-white">Nombre de Stints</h3>
                </div>
                <div className="text-5xl font-rajdhani font-bold text-metrik-turquoise">
                  {strategyData.stints.length}
                </div>
              </div>
            </div>

            <div className="glass-cockpit p-6 mb-6">
              <h2 className="text-2xl font-rajdhani font-bold text-white mb-6 flex items-center gap-2">
                <TrendingDown className="text-metrik-turquoise" size={24} />
                Analyse des Stints
              </h2>

              <div className="space-y-4">
                {strategyData.stints.map((stint, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-lg border ${getTyreBg(stint.compound)}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full border-2 border-white"
                            style={{ backgroundColor: getTyreColor(stint.compound) }}
                          />
                          <span className="text-xl font-rajdhani font-bold text-white">
                            {stint.compound}
                          </span>
                        </div>
                        <div className="text-metrik-silver font-rajdhani">
                          Stint {idx + 1}
                        </div>
                      </div>
                      <div className="text-metrik-silver font-rajdhani">
                        Tours {stint.start_lap} - {stint.end_lap} ({stint.num_laps} tours)
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-metrik-silver text-sm font-rajdhani mb-1">Temps Moyen</div>
                        <div className="text-white font-rajdhani font-bold text-lg">
                          {formatLapTime(stint.avg_lap_time)}
                        </div>
                      </div>
                      <div>
                        <div className="text-metrik-silver text-sm font-rajdhani mb-1">Meilleur Tour</div>
                        <div className="text-green-500 font-rajdhani font-bold text-lg">
                          {formatLapTime(stint.fastest_lap)}
                        </div>
                      </div>
                      <div>
                        <div className="text-metrik-silver text-sm font-rajdhani mb-1">Pire Tour</div>
                        <div className="text-red-500 font-rajdhani font-bold text-lg">
                          {formatLapTime(stint.slowest_lap)}
                        </div>
                      </div>
                      <div>
                        <div className="text-metrik-silver text-sm font-rajdhani mb-1">Dégradation</div>
                        <div className="text-yellow-500 font-rajdhani font-bold text-lg">
                          {stint.degradation >= 0 ? '+' : ''}{stint.degradation.toFixed(3)}s
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {Object.keys(strategyData.compounds_stats).length > 0 && (
              <div className="glass-cockpit p-6">
                <h2 className="text-2xl font-rajdhani font-bold text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="text-metrik-turquoise" size={24} />
                  Statistiques par Composé
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {Object.entries(strategyData.compounds_stats).map(([compound, stats]) => (
                    <div
                      key={compound}
                      className={`p-5 rounded-lg border ${getTyreBg(compound)}`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white"
                          style={{ backgroundColor: getTyreColor(compound) }}
                        />
                        <h3 className="text-xl font-rajdhani font-bold text-white">{compound}</h3>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-metrik-silver text-sm font-rajdhani">Total Tours</span>
                          <span className="text-white font-rajdhani font-bold">{stats.total_laps}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-metrik-silver text-sm font-rajdhani">Temps Moyen</span>
                          <span className="text-white font-rajdhani font-bold">
                            {formatLapTime(stats.avg_lap_time)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-metrik-silver text-sm font-rajdhani">Meilleur Tour</span>
                          <span className="text-green-500 font-rajdhani font-bold">
                            {formatLapTime(stats.fastest_lap)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-metrik-silver text-sm font-rajdhani">Taux Dégradation</span>
                          <span className="text-yellow-500 font-rajdhani font-bold">
                            {stats.degradation_rate.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {loading && (
<div className="space-y-6">
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<SkeletonCard variant="default" showIcon={true} />
<SkeletonCard variant="default" showIcon={true} />
<SkeletonCard variant="default" showIcon={true} />
</div>
<SkeletonCard variant="tall" showIcon={false} />
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<SkeletonCard variant="default" showIcon={false} />
<SkeletonCard variant="default" showIcon={false} />
<SkeletonCard variant="default" showIcon={false} />
</div>
</div>
 )}

{!loading && !strategyData && (
<div className="glass-cockpit p-12 text-center">
<Gauge className="text-metrik-silver mx-auto mb-4" size={48} />
<p className="text-metrik-silver font-rajdhani text-lg">
 Sélectionnez un Grand Prix et un pilote pour analyser la stratégie pneus
</p>
</div>
 )}
      </div>
    </div>
  );
}