import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { backendService } from '../services/backend.service';

export default function StatsPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await backendService.getStats(year, round, sessionType);
      setStats(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const chartData = stats ? stats.drivers.map((d: any) => ({
    name: d.code,
    avgSpeed: d.avg_speed,
    maxSpeed: d.max_speed,
    minSpeed: d.min_speed,
  })) : [];

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">STATIS</span>
            <span className="text-metrik-turquoise">TIQUES</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Analyse comparative des performances</p>
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
                onClick={loadStats}
                disabled={loading}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loading ? 'ANALYSE...' : '📊 ANALYSER'}
              </button>
            </div>
          </div>
        </div>

        {/* Session Info */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PILOTES</div>
              <div className="data-display text-4xl text-metrik-turquoise">{stats.drivers.length}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">SESSION</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-silver">{sessionType}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">ROUND</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-gold">{round}</div>
            </div>
          </div>
        )}

        {/* Charts */}
        {chartData.length > 0 && (
          <div className="space-y-6">
            
            {/* Average Speed */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise mb-4 flex items-center gap-2">
                <span>📊</span> VITESSE MOYENNE (km/h)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'Rajdhani' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #00D2BE',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono'
                    }} 
                  />
                  <Bar 
                    dataKey="avgSpeed" 
                    fill="#00D2BE" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Max Speed */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-success mb-4 flex items-center gap-2">
                <span>🚀</span> VITESSE MAXIMALE (km/h)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'Rajdhani' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #00D176',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono'
                    }} 
                  />
                  <Bar 
                    dataKey="maxSpeed" 
                    fill="#00D176" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Min Speed */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-warning mb-4 flex items-center gap-2">
                <span>🐌</span> VITESSE MINIMALE (km/h)
              </h3>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'Rajdhani' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #FFB800',
                      borderRadius: '8px',
                      fontFamily: 'JetBrains Mono'
                    }} 
                  />
                  <Bar 
                    dataKey="minSpeed" 
                    fill="#FFB800" 
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Table */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-silver mb-4 flex items-center gap-2">
                <span>📋</span> TABLEAU DÉTAILLÉ
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-metrik-turquoise/30">
                      <th className="px-4 py-3 text-left font-rajdhani text-metrik-text-secondary">PILOTE</th>
                      <th className="px-4 py-3 text-center font-rajdhani text-metrik-text-secondary">ÉQUIPE</th>
                      <th className="px-4 py-3 text-right font-rajdhani text-metrik-text-secondary">V. MOY</th>
                      <th className="px-4 py-3 text-right font-rajdhani text-metrik-text-secondary">V. MAX</th>
                      <th className="px-4 py-3 text-right font-rajdhani text-metrik-text-secondary">V. MIN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.drivers.map((driver: any, index: number) => (
                      <tr 
                        key={driver.code}
                        className={`border-b border-metrik-dark hover:bg-metrik-dark/50 transition-colors ${
                          index === 0 ? 'bg-metrik-turquoise/5' : ''
                        }`}
                      >
                        <td className="px-4 py-3 font-rajdhani font-bold text-metrik-turquoise">
                          #{driver.number} {driver.code}
                        </td>
                        <td className="px-4 py-3 text-center font-inter text-metrik-text-secondary text-sm">
                          {driver.team}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-metrik-text">
                          {driver.avg_speed.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-metrik-success">
                          {driver.max_speed.toFixed(1)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-metrik-warning">
                          {driver.min_speed.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!stats && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Configurez les paramètres et lancez l'analyse
            </p>
          </div>
        )}
      </div>
    </div>
  );
}