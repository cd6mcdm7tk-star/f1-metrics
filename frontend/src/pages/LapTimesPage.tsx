import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function LapTimesPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [lapTimes, setLapTimes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadLapTimes = async () => {
    try {
      setLoading(true);
      const data = await backendService.getLapTimes(year, round, sessionType);
      setLapTimes(data.lap_times);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const getMedalEmoji = (position: number) => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return `${position}`;
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return 'text-metrik-gold';
    if (position === 2) return 'text-metrik-silver';
    if (position === 3) return 'text-metrik-warning';
    return 'text-metrik-text-secondary';
  };

  const getPositionBg = (position: number) => {
    if (position === 1) return 'bg-metrik-gold/10 border-metrik-gold/30';
    if (position === 2) return 'bg-metrik-silver/10 border-metrik-silver/30';
    if (position === 3) return 'bg-metrik-warning/10 border-metrik-warning/30';
    return 'bg-metrik-card border-metrik-dark';
  };

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">CLASSE</span>
            <span className="text-metrik-turquoise">MENT</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Temps au tour et classement de session</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-8">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-6">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">SESSION</label>
              <select
                value={sessionType}
                onChange={(e) => setSessionType(e.target.value)}
                className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-turquoise focus:outline-none transition-colors"
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
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loading ? 'CHARGEMENT...' : '🏁 CHARGER'}
              </button>
            </div>
          </div>
        </div>

        {/* Podium */}
        {lapTimes.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            {/* 2nd Place */}
            <div className="card-cockpit bg-metrik-silver/5 border-metrik-silver/30 text-center pt-12">
              <div className="text-6xl mb-3">🥈</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">2ème POSITION</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-silver mb-2">
                #{lapTimes[1].number} {lapTimes[1].code}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{lapTimes[1].team}</div>
              <div className="data-display text-3xl text-metrik-silver">{lapTimes[1].best_lap_time.toFixed(3)}s</div>
            </div>

            {/* 1st Place */}
            <div className="card-cockpit bg-metrik-gold/10 border-metrik-gold/40 text-center shadow-glow-turquoise">
              <div className="text-7xl mb-3">🥇</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">1ère POSITION</div>
              <div className="text-3xl font-rajdhani font-bold text-metrik-gold mb-2">
                #{lapTimes[0].number} {lapTimes[0].code}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{lapTimes[0].team}</div>
              <div className="data-display text-4xl text-metrik-gold">{lapTimes[0].best_lap_time.toFixed(3)}s</div>
            </div>

            {/* 3rd Place */}
            <div className="card-cockpit bg-metrik-warning/5 border-metrik-warning/30 text-center pt-12">
              <div className="text-6xl mb-3">🥉</div>
              <div className="text-sm font-rajdhani text-metrik-text-secondary mb-2">3ème POSITION</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-warning mb-2">
                #{lapTimes[2].number} {lapTimes[2].code}
              </div>
              <div className="text-sm text-metrik-text-tertiary mb-3 font-inter">{lapTimes[2].team}</div>
              <div className="data-display text-3xl text-metrik-warning">{lapTimes[2].best_lap_time.toFixed(3)}s</div>
            </div>
          </div>
        )}

        {/* Full Ranking */}
        {lapTimes.length > 0 && (
          <div className="card-cockpit">
            <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise mb-6 flex items-center gap-2">
              <span>📋</span> CLASSEMENT COMPLET
            </h3>
            
            <div className="space-y-3">
              {lapTimes.map((driver, index) => (
                <div
                  key={driver.code}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 hover:scale-[1.02] ${getPositionBg(index + 1)}`}
                >
                  {/* Position */}
                  <div className={`text-4xl font-rajdhani font-black w-16 text-center ${getPositionColor(index + 1)}`}>
                    {getMedalEmoji(index + 1)}
                  </div>

                  {/* Driver Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl font-rajdhani font-bold text-metrik-turquoise">
                        #{driver.number}
                      </span>
                      <span className="text-xl font-rajdhani font-bold text-metrik-text">
                        {driver.code}
                      </span>
                    </div>
                    <div className="text-sm text-metrik-text-secondary font-inter">
                      {driver.team}
                    </div>
                  </div>

                  {/* Lap Time */}
                  <div className="text-right">
                    <div className="text-sm font-rajdhani text-metrik-text-secondary mb-1">
                      MEILLEUR TOUR
                    </div>
                    <div className={`font-mono text-2xl font-bold ${
                      index === 0 ? 'text-metrik-gold' :
                      index === 1 ? 'text-metrik-silver' :
                      index === 2 ? 'text-metrik-warning' :
                      'text-metrik-turquoise'
                    }`}>
                      {driver.best_lap_time.toFixed(3)}s
                    </div>
                  </div>

                  {/* Gap */}
                  {index > 0 && (
                    <div className="text-right w-32">
                      <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">
                        ÉCART
                      </div>
                      <div className="font-mono text-sm text-metrik-text-secondary">
                        +{(driver.best_lap_time - lapTimes[0].best_lap_time).toFixed(3)}s
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {lapTimes.length === 0 && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">🏁</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Configurez les paramètres et chargez le classement
            </p>
          </div>
        )}
      </div>
    </div>
  );
}