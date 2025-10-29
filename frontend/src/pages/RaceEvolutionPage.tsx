import { useState, useEffect } from 'react';
import { ArrowLeft, Loader2, TrendingDown, Clock, BarChart3, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import GrandPrixSelector from '../components/GrandPrixSelector';
import DriverSelector from '../components/DriverSelector';
import { getDrivers, getRacePace, getMultiDriverPace, getStintAnalysis, getSectorEvolution } from '../services/backend.service';
import type { RacePaceData, MultiDriverPaceData, StintAnalysisData, SectorEvolutionData } from '../types/raceevolution';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function RaceEvolutionPage() {
  const navigate = useNavigate();

  const [year] = useState(2024);
  const [selectedGP, setSelectedGP] = useState<number>(1);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [comparisonDrivers, setComparisonDrivers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [racePaceData, setRacePaceData] = useState<RacePaceData | null>(null);
  const [multiDriverData, setMultiDriverData] = useState<MultiDriverPaceData | null>(null);
  const [stintData, setStintData] = useState<StintAnalysisData | null>(null);
  const [sectorData, setSectorData] = useState<SectorEvolutionData | null>(null);
  
  const [activeTab, setActiveTab] = useState<'pace' | 'comparison' | 'stints' | 'sectors'>('pace');

  useEffect(() => {
    loadDrivers();
  }, [year, selectedGP]);

  const loadDrivers = async () => {
    try {
      const data = await getDrivers(year, selectedGP, 'R');
      setDrivers(data);
      if (data.length > 0) {
        setSelectedDriver(data[0].abbreviation);
      }
    } catch (error) {
      console.error('Error loading drivers:', error);
    }
  };

  const loadAllData = async () => {
    if (!selectedDriver) return;

    setLoading(true);
    try {
      const [pace, stints, sectors] = await Promise.all([
  getRacePace(year, selectedGP, selectedDriver),
  getStintAnalysis(year, selectedGP, selectedDriver),
  getSectorEvolution(year, selectedGP, selectedDriver)
]);
      
      setRacePaceData(pace);
      setStintData(stints);
      setSectorData(sectors);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComparison = async () => {
    if (comparisonDrivers.length === 0) return;

    setLoading(true);
    try {
      const data = await getMultiDriverPace(year, selectedGP, comparisonDrivers, 'R');
      setMultiDriverData(data);
    } catch (error) {
      console.error('Error loading comparison:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleComparisonDriver = (driver: string) => {
    setComparisonDrivers(prev => 
      prev.includes(driver) 
        ? prev.filter(d => d !== driver)
        : [...prev, driver]
    );
  };

  const getCompoundColor = (compound: string): string => {
    switch (compound.toUpperCase()) {
      case 'SOFT': return '#ff0000';
      case 'MEDIUM': return '#ffd700';
      case 'HARD': return '#ffffff';
      case 'INTERMEDIATE': return '#00ff00';
      case 'WET': return '#0000ff';
      default: return '#888888';
    }
  };

  const formatLapTime = (seconds: number | null): string => {
    if (!seconds) return '--:--.---';
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${mins}:${secs.padStart(6, '0')}`;
  };

  // Préparer les données pour le graphique de pace
  const paceChartData = racePaceData?.paceData
    .filter(lap => lap.lapTime !== null && !lap.pitOutTime && !lap.pitInTime)
    .map(lap => ({
      lap: lap.lapNumber,
      time: lap.lapTime,
      compound: lap.compound,
      tyreLife: lap.tyreLife
    })) || [];

  // Préparer les données pour la comparaison multi-pilotes
  const comparisonChartData = multiDriverData ? 
    (() => {
      const maxLaps = Math.max(...Object.values(multiDriverData.data).map(d => d.length));
      const chartData = [];
      
      for (let i = 0; i < maxLaps; i++) {
        const lapData: any = { lap: i + 1 };
        
        multiDriverData.drivers.forEach(driver => {
          const driverData = multiDriverData.data[driver];
          if (driverData[i] && driverData[i].lapTime && !driverData[i].pitOutTime && !driverData[i].pitInTime) {
            lapData[driver] = driverData[i].lapTime;
          }
        });
        
        chartData.push(lapData);
      }
      
      return chartData;
    })()
  : [];

  // Préparer les données pour l'analyse des stints
  const stintChartData = stintData?.stints.map(stint => ({
    stint: `Stint ${stint.stint}`,
    compound: stint.compound,
    avgTime: stint.avgLapTime,
    bestTime: stint.bestLapTime,
    worstTime: stint.worstLapTime,
    degradation: stint.degradation,
    laps: stint.totalLaps
  })) || [];

  // Préparer les données pour les secteurs
  const sectorChartData = sectorData?.sectorData
    .filter(lap => lap.sector1 && lap.sector2 && lap.sector3)
    .map(lap => ({
      lap: lap.lapNumber,
      sector1: lap.sector1,
      sector2: lap.sector2,
      sector3: lap.sector3,
      total: (lap.sector1 || 0) + (lap.sector2 || 0) + (lap.sector3 || 0)
    })) || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-metrik-black via-gray-900 to-metrik-black">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-metrik-silver hover:text-metrik-turquoise transition-colors mb-8 font-rajdhani"
        >
          <ArrowLeft size={20} />
          BACK TO HOME
        </button>

        <div className="mb-12">
          <h1 className="text-6xl font-rajdhani font-black mb-3 bg-gradient-to-r from-metrik-turquoise via-white to-metrik-silver bg-clip-text text-transparent">
            RACE EVOLUTION
          </h1>
          <p className="text-metrik-silver text-lg font-inter">
            Tire Degradation & Performance Analysis
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <GrandPrixSelector
            year={year}
            selectedRound={selectedGP}
            onSelect={setSelectedGP}
          />
          <DriverSelector
            drivers={drivers}
            selectedDriver={selectedDriver}
            onSelectDriver={setSelectedDriver}
            label="Primary Driver"
          />
        </div>

        <button
          onClick={loadAllData}
          disabled={loading || !selectedDriver}
          className="w-full mb-8 px-8 py-4 bg-gradient-to-r from-metrik-turquoise to-cyan-400 text-metrik-black rounded-lg hover:shadow-lg hover:shadow-metrik-turquoise/50 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-rajdhani font-black text-xl tracking-wide"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <Loader2 className="animate-spin" size={24} />
              ANALYZING DATA...
            </span>
          ) : (
            'LOAD RACE ANALYSIS'
          )}
        </button>

        {racePaceData && (
          <>
            {/* TABS */}
            <div className="mb-6 flex gap-2 bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-2">
              <button
                onClick={() => setActiveTab('pace')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
                  activeTab === 'pace'
                    ? 'bg-metrik-turquoise text-metrik-black'
                    : 'text-metrik-silver hover:bg-metrik-silver/10'
                }`}
              >
                <Activity size={20} />
                PACE EVOLUTION
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
                  activeTab === 'comparison'
                    ? 'bg-metrik-turquoise text-metrik-black'
                    : 'text-metrik-silver hover:bg-metrik-silver/10'
                }`}
              >
                <BarChart3 size={20} />
                DRIVER COMPARISON
              </button>
              <button
                onClick={() => setActiveTab('stints')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
                  activeTab === 'stints'
                    ? 'bg-metrik-turquoise text-metrik-black'
                    : 'text-metrik-silver hover:bg-metrik-silver/10'
                }`}
              >
                <TrendingDown size={20} />
                STINT ANALYSIS
              </button>
              <button
                onClick={() => setActiveTab('sectors')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-rajdhani font-bold transition-all ${
                  activeTab === 'sectors'
                    ? 'bg-metrik-turquoise text-metrik-black'
                    : 'text-metrik-silver hover:bg-metrik-silver/10'
                }`}
              >
                <Clock size={20} />
                SECTOR EVOLUTION
              </button>
            </div>

            {/* PACE EVOLUTION */}
            {activeTab === 'pace' && (
              <div className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6">
                <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                  <Activity size={24} />
                  LAP TIME EVOLUTION - {selectedDriver}
                </h3>

                <ResponsiveContainer width="100%" height={500}>
                  <LineChart data={paceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="#c0c0c0"
                      label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                    />
                    <YAxis 
                      stroke="#c0c0c0"
                      domain={['dataMin - 2', 'dataMax + 2']}
                      tickFormatter={(value) => `${value.toFixed(1)}s`}
                      label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #00d9ff',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => [formatLapTime(value), 'Lap Time']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="time" 
                      stroke="#00d9ff" 
                      strokeWidth={3}
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={getCompoundColor(payload.compound)}
                            stroke="#fff"
                            strokeWidth={2}
                          />
                        );
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>

                <div className="mt-6 flex items-center gap-6 justify-center">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500" />
                    <span className="text-metrik-silver text-sm">Soft</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-yellow-500" />
                    <span className="text-metrik-silver text-sm">Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-white" />
                    <span className="text-metrik-silver text-sm">Hard</span>
                  </div>
                </div>
              </div>
            )}

            {/* DRIVER COMPARISON */}
            {activeTab === 'comparison' && (
              <div className="space-y-6">
                <div className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6">
                  <h3 className="text-xl font-rajdhani font-black text-metrik-turquoise mb-4">
                    SELECT DRIVERS TO COMPARE
                  </h3>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
                    {drivers.map(driver => (
                      <button
                        key={driver.abbreviation}
                        onClick={() => toggleComparisonDriver(driver.abbreviation)}
                        className={`px-4 py-2 rounded-lg font-rajdhani font-bold transition-all ${
                          comparisonDrivers.includes(driver.abbreviation)
                            ? 'bg-metrik-turquoise text-metrik-black'
                            : 'bg-metrik-silver/20 text-metrik-silver hover:bg-metrik-silver/30'
                        }`}
                      >
                        {driver.abbreviation}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={loadComparison}
                    disabled={loading || comparisonDrivers.length === 0}
                    className="w-full px-6 py-3 bg-metrik-turquoise text-metrik-black rounded-lg hover:bg-cyan-400 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all font-rajdhani font-bold"
                  >
                    {loading ? 'LOADING...' : `COMPARE ${comparisonDrivers.length} DRIVERS`}
                  </button>
                </div>

                {multiDriverData && (
                  <div className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6">
                    <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                      <BarChart3 size={24} />
                      MULTI-DRIVER PACE COMPARISON
                    </h3>

                    <ResponsiveContainer width="100%" height={500}>
                      <LineChart data={comparisonChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                        <XAxis 
                          dataKey="lap" 
                          stroke="#c0c0c0"
                          label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                        />
                        <YAxis 
                          stroke="#c0c0c0"
                          domain={['dataMin - 2', 'dataMax + 2']}
                          tickFormatter={(value) => `${value.toFixed(1)}s`}
                          label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                        />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: '#0a0a0a',
                            border: '1px solid #00d9ff',
                            borderRadius: '8px',
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
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* STINT ANALYSIS */}
            {activeTab === 'stints' && stintData && (
              <div className="space-y-6">
                <div className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6">
                  <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                    <TrendingDown size={24} />
                    STINT PERFORMANCE - {selectedDriver}
                  </h3>

                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={stintChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                      <XAxis dataKey="stint" stroke="#c0c0c0" />
                      <YAxis 
                        stroke="#c0c0c0"
                        tickFormatter={(value) => `${value.toFixed(1)}s`}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#0a0a0a',
                          border: '1px solid #00d9ff',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) => formatLapTime(value)}
                      />
                      <Legend />
                      <Bar dataKey="avgTime" fill="#00d9ff" name="Avg Time" />
                      <Bar dataKey="bestTime" fill="#00ff00" name="Best Time" />
                      <Bar dataKey="degradation" fill="#ff4444" name="Degradation (s)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stintData.stints.map((stint) => (
                    <div
                      key={stint.stint}
                      className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-xl font-rajdhani font-black text-white">
                          STINT {stint.stint}
                        </h4>
                        <div
                          className="px-3 py-1 rounded text-sm font-rajdhani font-bold"
                          style={{ backgroundColor: getCompoundColor(stint.compound) }}
                        >
                          {stint.compound}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-metrik-silver text-sm">Total Laps:</span>
                          <span className="text-white font-rajdhani font-bold">{stint.totalLaps}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-metrik-silver text-sm">Avg Time:</span>
                          <span className="text-white font-rajdhani font-bold">
                            {formatLapTime(stint.avgLapTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-metrik-silver text-sm">Best Time:</span>
                          <span className="text-green-400 font-rajdhani font-bold">
                            {formatLapTime(stint.bestLapTime)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-metrik-silver text-sm">Degradation:</span>
                          <span className="text-red-400 font-rajdhani font-bold">
                            +{stint.degradation.toFixed(3)}s
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTOR EVOLUTION */}
            {activeTab === 'sectors' && sectorData && (
              <div className="bg-metrik-black/80 backdrop-blur-md border border-metrik-turquoise/30 rounded-xl p-6">
                <h3 className="text-2xl font-rajdhani font-black text-metrik-turquoise mb-6 tracking-wide flex items-center gap-2">
                  <Clock size={24} />
                  SECTOR TIMES EVOLUTION - {selectedDriver}
                </h3>

                <ResponsiveContainer width="100%" height={500}>
                  <LineChart data={sectorChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                    <XAxis 
                      dataKey="lap" 
                      stroke="#c0c0c0"
                      label={{ value: 'Lap Number', position: 'insideBottom', offset: -5, fill: '#c0c0c0' }}
                    />
                    <YAxis 
                      stroke="#c0c0c0"
                      tickFormatter={(value) => `${value.toFixed(1)}s`}
                      label={{ value: 'Sector Time (s)', angle: -90, position: 'insideLeft', fill: '#c0c0c0' }}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#0a0a0a',
                        border: '1px solid #00d9ff',
                        borderRadius: '8px',
                      }}
                      formatter={(value: any) => `${value.toFixed(3)}s`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="sector1" stroke="#ff4444" strokeWidth={2} name="Sector 1" />
                    <Line type="monotone" dataKey="sector2" stroke="#ffd700" strokeWidth={2} name="Sector 2" />
                    <Line type="monotone" dataKey="sector3" stroke="#00ff00" strokeWidth={2} name="Sector 3" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}