import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { backendService } from '../services/backend.service';

export default function TelemetryPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver, setDriver] = useState('VER');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [lapTime, setLapTime] = useState<number | null>(null);

  const loadDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const data = await backendService.getDrivers(year, round, sessionType);
      setDrivers(data.drivers);
      if (data.drivers.length > 0) {
        setDriver(data.drivers[0].code);
      }
      setLoadingDrivers(false);
    } catch (err) {
      console.error(err);
      setLoadingDrivers(false);
    }
  };

  const loadTelemetry = async () => {
    try {
      setLoading(true);
      const data = await backendService.getTelemetry(year, round, sessionType, driver);
      setTelemetry(data.telemetry);
      setLapTime(data.lap_time);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement. Vérifie les paramètres.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📊 Télémétrie F1</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
                <option value="FP1">FP1</option>
                <option value="FP2">FP2</option>
                <option value="FP3">FP3</option>
                <option value="Q">Qualifications</option>
                <option value="R">Course</option>
              </select>
            </div>
            <div className="col-span-2 flex items-end">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Pilote</label>
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
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
                  onClick={loadTelemetry}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '📊 Charger la télémétrie'}
                </button>
              </div>
            </div>
          )}

          {lapTime && (
            <div className="mt-4 text-center">
              <span className="text-lg">⏱️ Temps au tour: <span className="font-bold text-green-500">{lapTime.toFixed(3)}s</span></span>
            </div>
          )}
        </div>

        {telemetry.length > 0 && (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🚀 Vitesse (km/h)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={telemetry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Line type="monotone" dataKey="speed" stroke="#00D176" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">🎮 Throttle & Brake (%)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={telemetry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Legend />
                  <Line type="monotone" dataKey="throttle" stroke="#FF8000" strokeWidth={2} dot={false} name="Throttle" />
                  <Line type="monotone" dataKey="brake" stroke="#DC2626" strokeWidth={2} dot={false} name="Brake" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-bold mb-4">⚙️ Rapport de vitesse</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={telemetry}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="distance" stroke="#9CA3AF" label={{ value: 'Distance (m)', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#9CA3AF" domain={[0, 8]} />
                  <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }} />
                  <Line type="stepAfter" dataKey="gear" stroke="#8B5CF6" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {telemetry.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Clique d'abord sur "Charger les pilotes", puis sélectionne un pilote et clique sur "Charger la télémétrie"
          </div>
        )}
      </div>
    </div>
  );
}