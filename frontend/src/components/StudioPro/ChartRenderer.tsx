import { useEffect, useState } from 'react';
import { useStudioStore } from '../../hooks/useStudioStore';
import { fetchStudioData } from '../../utils/studioApi';
import { Loader, AlertCircle } from 'lucide-react';
import TelemetryBattleChart from './charts/TelemetryBattleChart';
import RacePaceChart from './charts/RacePaceChart';
import QualifyingResultsChart from './charts/QualifyingResultsChart';

export default function ChartRenderer() {
  const { config } = useStudioStore();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [
    config.dataSource.type,
    config.dataSource.year,
    config.dataSource.round,
    config.dataSource.session,
    JSON.stringify(config.dataSource.drivers),
  ]);

  const loadData = async () => {
    // Validation checks
    if (!config.dataSource.year || !config.dataSource.round) {
      setError('Please select year and Grand Prix');
      return;
    }

    if (config.dataSource.type === 'telemetry-battle' && 
        (!config.dataSource.drivers || config.dataSource.drivers.length < 2)) {
      setError('Please select 2 drivers for telemetry battle');
      return;
    }

    if (!config.dataSource.drivers || config.dataSource.drivers.length === 0) {
      if (config.dataSource.type !== 'championship-evolution' && 
          config.dataSource.type !== 'tire-strategy') {
        setError('Please select at least one driver');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchStudioData(config.dataSource);
      setData(result);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-metrik-silver">
        <Loader className="w-12 h-12 animate-spin text-metrik-turquoise mb-4" />
        <p className="text-lg font-rajdhani font-bold">Loading F1 data...</p>
        <p className="text-sm mt-2">This may take a few seconds</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-metrik-silver">
        <div className="p-8 bg-red-500/10 border border-red-500/30 rounded-xl max-w-md">
          <div className="flex items-center gap-3 mb-3">
            <AlertCircle className="w-6 h-6 text-red-500" />
            <h3 className="text-lg font-rajdhani font-bold text-red-500">Error</h3>
          </div>
          <p className="text-sm">{error}</p>
          <button
            onClick={loadData}
            className="mt-4 px-4 py-2 bg-metrik-turquoise text-metrik-black rounded-lg font-rajdhani font-bold hover:bg-metrik-turquoise/80 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-metrik-silver">
        <p className="text-lg font-rajdhani font-bold">Configure your data source</p>
        <p className="text-sm mt-2">Select year, Grand Prix, and drivers from the left panel</p>
      </div>
    );
  }

  // Render appropriate chart based on data source type
  const renderChart = () => {
    switch (config.dataSource.type) {
      case 'telemetry-battle':
        return <TelemetryBattleChart data={data} />;
      
      case 'race-pace':
        return <RacePaceChart data={data} />;

      case 'qualifying-results':
        return <QualifyingResultsChart data={data} />;
      
      default:
        return (
          <div className="flex items-center justify-center h-full text-metrik-silver">
            <p>Chart type not implemented yet</p>
          </div>
        );
    }
  };

  return (
    <div className="w-full h-full p-6">
      {renderChart()}
    </div>
  );
}