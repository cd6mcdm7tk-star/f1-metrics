import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function ResultsPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [viewMode, setViewMode] = useState<'race' | 'standings'>('race');
  const [raceResults, setRaceResults] = useState<any>(null);
  const [standings, setStandings] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadRaceResults = async () => {
    try {
      setLoading(true);
      const data = await backendService.getRaceResults(year, round);
      setRaceResults(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement des résultats');
      setLoading(false);
    }
  };

  const loadStandings = async () => {
    try {
      setLoading(true);
      const data = await backendService.getDriverStandings(year);
      setStandings(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement du classement');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏆 Résultats & Classements</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => setViewMode('race')}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                viewMode === 'race' ? 'bg-red-600 scale-105' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              🏁 Résultats de Course
            </button>
            <button
              onClick={() => setViewMode('standings')}
              className={`px-6 py-3 rounded-lg font-bold transition-all ${
                viewMode === 'standings' ? 'bg-red-600 scale-105' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              📊 Classement Championnat
            </button>
          </div>

          {viewMode === 'race' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <div className="flex items-end">
                <button
                  onClick={loadRaceResults}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '🏁 Charger'}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm mb-2">Année</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={loadStandings}
                  disabled={loading}
                  className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Chargement...' : '📊 Charger'}
                </button>
              </div>
            </div>
          )}
        </div>

        {raceResults && viewMode === 'race' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {raceResults.results.slice(0, 3).map((result: any, index: number) => (
                <div
                  key={index}
                  className={`rounded-lg p-6 text-center ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                    'bg-gradient-to-br from-orange-600 to-orange-700'
                  }`}
                >
                  <div className="text-6xl mb-2">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-3xl font-bold mb-2">{result.driver}</div>
                  <div className="text-lg opacity-90">{result.team}</div>
                  <div className="text-2xl font-bold mt-3">{result.points} pts</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Pos</th>
                    <th className="px-6 py-4 text-left">Pilote</th>
                    <th className="px-6 py-4 text-left">Équipe</th>
                    <th className="px-6 py-4 text-right">Temps</th>
                    <th className="px-6 py-4 text-right">Points</th>
                    <th className="px-6 py-4 text-center">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {raceResults.results.map((result: any, index: number) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4 font-bold text-xl">
                        {result.position || '-'}
                      </td>
                      <td className="px-6 py-4 font-bold">{result.driver}</td>
                      <td className="px-6 py-4 text-gray-400">{result.team}</td>
                      <td className="px-6 py-4 text-right font-mono">{result.time}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-400">{result.points}</td>
                      <td className="px-6 py-4 text-center text-sm text-gray-500">{result.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {standings && viewMode === 'standings' && (
          <div>
            <div className="grid grid-cols-3 gap-4 mb-8">
              {standings.standings.slice(0, 3).map((driver: any, index: number) => (
                <div
                  key={index}
                  className={`rounded-lg p-6 text-center ${
                    index === 0 ? 'bg-gradient-to-br from-yellow-500 to-yellow-600' :
                    index === 1 ? 'bg-gradient-to-br from-gray-400 to-gray-500' :
                    'bg-gradient-to-br from-orange-600 to-orange-700'
                  }`}
                >
                  <div className="text-6xl mb-2">
                    {index === 0 ? '🏆' : index === 1 ? '🥈' : '🥉'}
                  </div>
                  <div className="text-3xl font-bold mb-2">{driver.driver}</div>
                  <div className="text-lg opacity-90">{driver.team}</div>
                  <div className="text-3xl font-bold mt-3">{driver.points} pts</div>
                </div>
              ))}
            </div>

            <div className="bg-gray-800 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="px-6 py-4 text-left">Pos</th>
                    <th className="px-6 py-4 text-left">Pilote</th>
                    <th className="px-6 py-4 text-left">Équipe</th>
                    <th className="px-6 py-4 text-right">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.standings.map((driver: any, index: number) => (
                    <tr key={index} className="border-b border-gray-700 hover:bg-gray-750">
                      <td className="px-6 py-4 font-bold text-2xl">
                        {driver.position}
                      </td>
                      <td className="px-6 py-4 font-bold text-xl">{driver.driver}</td>
                      <td className="px-6 py-4 text-gray-400">{driver.team}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-2xl font-bold text-green-400">{driver.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!raceResults && !standings && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Sélectionne un mode et clique sur Charger
          </div>
        )}
      </div>
    </div>
  );
}