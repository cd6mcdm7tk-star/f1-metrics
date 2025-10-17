import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import { backendService } from '../services/backend.service';

export default function ComparisonPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('HAM');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [deltaData, setDeltaData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const data = await backendService.getDrivers(year, round, sessionType);
      setDrivers(data.drivers);
      if (data.drivers.length >= 2) {
        setDriver1(data.drivers[0].code);
        setDriver2(data.drivers[1].code);
      }
      setLoadingDrivers(false);
    } catch (err) {
      console.error(err);
      setLoadingDrivers(false);
    }
  };

  const loadComparison = async () => {
    try {
      setLoading(true);
      const result = await backendService.compareTelemetry(year, round, sessionType, driver1, driver2);
      const delta = await backendService.getDelta(year, round, sessionType, driver1, driver2);
      setData(result);
      setDeltaData(delta);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const mergedData = data ? 
    (data[driver1]?.telemetry || []).map((point: any, i: number) => ({
      distance: point.distance,
      [`${driver1}_speed`]: point.speed,
      [`${driver2}_speed`]: data[driver2]?.telemetry[i]?.speed || 0,
      [`${driver1}_throttle`]: point.throttle,
      [`${driver2}_throttle`]: data[driver2]?.telemetry[i]?.throttle || 0,
      [`${driver1}_brake`]: point.brake,
      [`${driver2}_brake`]: data[driver2]?.telemetry[i]?.brake || 0,
    })) : [];

  const deltaChartData = deltaData?.delta?.map((point: any) => ({
    distance: point.distance,
    delta: point.delta,
  })) || [];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🔄 Comparaison de Télémétrie</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm mb-2">Année</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Round</label>
              <input
                type="number"
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value))}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm mb-2">Session</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              >
                <option value="Q">Qualifications</option>
                <option value="R">Course</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={loadDrivers}
                disabled={loadingDrivers}
                className="w-full px-6 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loadingDrivers ? 'Chargement...' : '🔄 Charger les pilotes'}
              </button>
            </div>
          </div>

          {drivers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm mb-2">Pilote 1</label>
                <select
                  value={driver1}
                  onChange={(e) => setDriver1(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code} ({d.team})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-2">Pilote 2</label>
                <select
                  value={driver2}
                  onChange={(e) => setDriver2(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code} ({d.team})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadComparison}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '⚡ Comparer'}
                </button>
              </div>
            </div>
          )}
        </div>

        {data && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-green-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{driver1}</div>
              <div className="text-3xl font-mono">{data[driver1]?.lap_time?.toFixed(3)}s</div>
            </div>
            <div className="bg-blue-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">{driver2}</div>
              <div className="text-3xl font-mono">{data[driver2]?.lap_time?.toFixed(3)}s</div>
            </div>
          </div>
        )}

        {deltaChartData.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4">⏱️ Delta de temps (secondes)</h3>
            <p className="text-sm text-gray-400 mb-4">
              Vert = {driver1} devant | Rouge = {driver2} devant
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={deltaChartData}>
                <defs>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#DC2626" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#DC2626" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D176" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D176" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="distance" stroke="#9CA3AF" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                <ReferenceLine y={0} stroke="#fff" strokeWidth={2} />
                <Area type="monotone" dataKey="delta" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorPositive)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {mergedData.length > 0 && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🚀 Vitesse (km/h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey={`${driver1}_speed`} stroke="#00D176" strokeWidth={2} dot={false} name={driver1} />
                  <Line type="monotone" dataKey={`${driver2}_speed`} stroke="#0EA5E9" strokeWidth={2} dot={false} name={driver2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🎮 Throttle (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey={`${driver1}_throttle`} stroke="#00D176" strokeWidth={2} dot={false} name={driver1} />
                  <Line type="monotone" dataKey={`${driver2}_throttle`} stroke="#0EA5E9" strokeWidth={2} dot={false} name={driver2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🛑 Brake (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey={`${driver1}_brake`} stroke="#DC2626" strokeWidth={2} dot={false} name={driver1} />
                  <Line type="monotone" dataKey={`${driver2}_brake`} stroke="#F59E0B" strokeWidth={2} dot={false} name={driver2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Clique d'abord sur "Charger les pilotes", puis sélectionne 2 pilotes et clique sur "Comparer"
          </div>
        )}
      </div>
    </div>
  );
}