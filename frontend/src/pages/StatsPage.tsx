import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function StatsPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('Q');
  const [driver, setDriver] = useState('VER');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

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

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await backendService.getTelemetryStats(year, round, sessionType, driver);
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📊 Statistiques Avancées</h1>

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
                <option value="FP1">FP1</option>
                <option value="FP2">FP2</option>
                <option value="FP3">FP3</option>
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
                  onClick={loadStats}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '📊 Analyser'}
                </button>
              </div>
            </div>
          )}
        </div>

        {stats && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-lg p-6 text-center">
              <div className="text-2xl font-bold mb-2">{stats.driver}</div>
              <div className="text-5xl font-mono font-bold">{stats.lap_time.toFixed(3)}s</div>
              <div className="text-sm mt-2 opacity-90">Meilleur tour</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  🚀 Vitesse
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Maximum</span>
                    <span className="text-2xl font-bold text-green-400">{stats.speed.max.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Moyenne</span>
                    <span className="text-xl font-bold">{stats.speed.avg.toFixed(1)} km/h</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Minimum</span>
                    <span className="text-lg">{stats.speed.min.toFixed(1)} km/h</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  🛑 Freinage
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Points de freinage</span>
                    <span className="text-2xl font-bold text-red-400">{stats.brake.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Distance totale</span>
                    <span className="text-xl font-bold">{stats.brake.distance_km.toFixed(2)} km</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  ⚡ Accélération
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max accélération</span>
                    <span className="text-2xl font-bold text-green-400">+{stats.acceleration.max.toFixed(1)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Max décélération</span>
                    <span className="text-xl font-bold text-red-400">-{stats.acceleration.max_deceleration.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  🎮 Throttle moyen
                </h3>
                <div className="flex items-center justify-center">
                  <div className="text-5xl font-bold text-orange-400">{stats.throttle_avg.toFixed(1)}%</div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  ⚙️ Changements de vitesse
                </h3>
                <div className="flex items-center justify-center">
                  <div className="text-5xl font-bold text-purple-400">{stats.gear_changes}</div>
                </div>
              </div>
            </div>

            {stats.drs_usage_percent > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  💨 Utilisation DRS
                </h3>
                <div className="flex items-center justify-center">
                  <div className="text-4xl font-bold text-blue-400">{stats.drs_usage_percent.toFixed(1)}% du tour</div>
                </div>
              </div>
            )}
          </div>
        )}

        {!stats && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Clique sur "Charger les pilotes", sélectionne un pilote et clique sur "Analyser"
          </div>
        )}
      </div>
    </div>
  );
}