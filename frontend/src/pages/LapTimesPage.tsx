import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function LapTimesPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('Q');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLapTimes = async () => {
    try {
      setLoading(true);
      const data = await backendService.getLapTimes(year, round, sessionType);
      setResults(data.results);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(3);
    return `${minutes}:${secs.padStart(6, '0')}`;
  };

  const formatGap = (gap: number) => {
    if (gap === 0) return '-';
    return `+${gap.toFixed(3)}s`;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🏁 Temps au Tour</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onClick={loadLapTimes}
                disabled={loading}
                className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Charger'}
              </button>
            </div>
          </div>
        </div>

        {results.length > 0 && (
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left">Pos</th>
                  <th className="px-6 py-4 text-left">Pilote</th>
                  <th className="px-6 py-4 text-left">Équipe</th>
                  <th className="px-6 py-4 text-right">Temps</th>
                  <th className="px-6 py-4 text-right">Écart</th>
                  <th className="px-6 py-4 text-center">Tour</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr 
                    key={index} 
                    className="border-b border-gray-700 hover:bg-gray-750 transition-colors"
                    style={{ borderLeft: `4px solid #${result.color}` }}
                  >
                    <td className="px-6 py-4 font-bold text-xl">
                      {result.position === 1 && '🥇'}
                      {result.position === 2 && '🥈'}
                      {result.position === 3 && '🥉'}
                      {result.position > 3 && result.position}
                    </td>
                    <td className="px-6 py-4 font-bold text-lg">{result.driver}</td>
                    <td className="px-6 py-4 text-gray-400">{result.team}</td>
                    <td className="px-6 py-4 text-right font-mono text-lg">
                      {result.position === 1 ? (
                        <span className="text-green-400 font-bold">{formatTime(result.time)}</span>
                      ) : (
                        formatTime(result.time)
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-gray-400">
                      {formatGap(result.gap)}
                    </td>
                    <td className="px-6 py-4 text-center text-gray-500">
                      #{result.lap_number}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {results.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Sélectionne une session puis clique sur Charger
          </div>
        )}
      </div>
    </div>
  );
}