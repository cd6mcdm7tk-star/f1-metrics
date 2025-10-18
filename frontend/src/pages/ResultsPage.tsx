import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function ResultsPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadResults = async () => {
    try {
      setLoading(true);
      const data = await backendService.getResults(year, round);
      setResults(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-metrik-gold';
    if (position === 2) return 'text-metrik-silver';
    if (position === 3) return 'text-metrik-warning';
    if (position <= 10) return 'text-metrik-turquoise';
    return 'text-metrik-text-secondary';
  };

  const getPositionBg = (position: number) => {
    if (position === 1) return 'bg-metrik-gold/10 border-metrik-gold/40';
    if (position === 2) return 'bg-metrik-silver/10 border-metrik-silver/30';
    if (position === 3) return 'bg-metrik-warning/10 border-metrik-warning/30';
    if (position <= 10) return 'bg-metrik-turquoise/5 border-metrik-turquoise/20';
    return 'bg-metrik-card border-metrik-dark';
  };

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">RÉSUL</span>
            <span className="text-metrik-turquoise">TATS</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Résultats officiels de course</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-8">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-6">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ANNÉE</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-mono focus:border-metrik-turquoise focus:outline-none transition-colors"
              />
            </div>
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ROUND</label>
              <input
                type="number"
                value={round}
                onChange={(e) => setRound(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-mono focus:border-metrik-turquoise focus:outline-none transition-colors"
              />
            </div>
            
            <div className="flex items-end">
              <button
                onClick={loadResults}
                disabled={loading}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loading ? 'CHARGEMENT...' : '🏆 CHARGER'}
              </button>
            </div>
          </div>
        </div>

        {/* Race Info */}
        {results && (
          <div className="card-cockpit mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-center">
              <div>
                <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">GRAND PRIX</div>
                <div className="text-2xl font-rajdhani font-bold text-metrik-turquoise">{results.event_name}</div>
              </div>
              <div>
                <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">CIRCUIT</div>
                <div className="text-xl font-rajdhani font-bold text-metrik-silver">{results.location}</div>
              </div>
              <div>
                <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PAYS</div>
                <div className="text-xl font-rajdhani font-bold text-metrik-text">{results.country}</div>
              </div>
              <div>
                <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">FINISHERS</div>
                <div className="data-display text-3xl text-metrik-success">{results.results.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Podium */}
        {results && results.results.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="card-cockpit bg-metrik-silver/5 border-metrik-silver/30 text-center pt-12">
              <div className="text-6xl mb-3">🥈</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">2ème PLACE</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-silver mb-2">
                {results.results[1].driver}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{results.results[1].team}</div>
              <div className="data-display text-2xl text-metrik-silver">{results.results[1].points} PTS</div>
            </div>

            {/* 1st Place */}
            <div className="card-cockpit bg-metrik-gold/10 border-metrik-gold/40 text-center shadow-glow-turquoise">
              <div className="text-7xl mb-3">🥇</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">VAINQUEUR</div>
              <div className="text-3xl font-rajdhani font-bold text-metrik-gold mb-2">
                {results.results[0].driver}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{results.results[0].team}</div>
              <div className="data-display text-3xl text-metrik-gold">{results.results[0].points} PTS</div>
            </div>

            {/* 3rd Place */}
            <div className="card-cockpit bg-metrik-warning/5 border-metrik-warning/30 text-center pt-12">
              <div className="text-6xl mb-3">🥉</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">3ème PLACE</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-warning mb-2">
                {results.results[2].driver}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{results.results[2].team}</div>
              <div className="data-display text-2xl text-metrik-warning">{results.results[2].points} PTS</div>
            </div>
          </div>
        )}

        {/* Full Results */}
        {results && (
          <div className="card-cockpit">
            <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise mb-6 flex items-center gap-2">
              <span>📋</span> CLASSEMENT FINAL
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-metrik-turquoise/30">
                    <th className="px-4 py-3 text-left font-rajdhani text-metrik-text-secondary">POS</th>
                    <th className="px-4 py-3 text-left font-rajdhani text-metrik-text-secondary">PILOTE</th>
                    <th className="px-4 py-3 text-left font-rajdhani text-metrik-text-secondary">ÉQUIPE</th>
                    <th className="px-4 py-3 text-center font-rajdhani text-metrik-text-secondary">TEMPS</th>
                    <th className="px-4 py-3 text-center font-rajdhani text-metrik-text-secondary">POINTS</th>
                    <th className="px-4 py-3 text-center font-rajdhani text-metrik-text-secondary">STATUT</th>
                  </tr>
                </thead>
                <tbody>
                  {results.results.map((result: any) => (
                    <tr 
                      key={result.position}
                      className={`border-b border-metrik-dark hover:bg-metrik-dark/50 transition-colors`}
                    >
                      <td className="px-4 py-4">
                        <span className={`text-2xl font-rajdhani font-black ${getPositionColor(result.position)}`}>
                          {result.position === 1 ? '🥇' :
                           result.position === 2 ? '🥈' :
                           result.position === 3 ? '🥉' :
                           result.position}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-rajdhani font-bold text-lg text-metrik-turquoise">
                          {result.driver}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-inter text-sm text-metrik-text-secondary">
                          {result.team}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="font-mono text-metrik-text">
                          {result.time || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className={`font-mono text-xl font-bold ${
                          result.points > 0 ? 'text-metrik-success' : 'text-metrik-text-tertiary'
                        }`}>
                          {result.points}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-rajdhani font-bold ${
                          result.status === 'Finished' 
                            ? 'bg-metrik-success/20 text-metrik-success' 
                            : 'bg-metrik-error/20 text-metrik-error'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!results && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Configurez les paramètres et chargez les résultats
            </p>
          </div>
        )}
      </div>
    </div>
  );
}