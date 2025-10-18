import React, { useState } from 'react';
import { backendService } from '../services/backend.service';

export default function DriversPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await backendService.getDrivers(year, round, sessionType);
      setDrivers(data.drivers);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const getTeamColor = (team: string) => {
    const colors: { [key: string]: string } = {
      'Red Bull Racing': 'border-[#3671C6] bg-[#3671C6]/10',
      'Ferrari': 'border-[#E8002D] bg-[#E8002D]/10',
      'Mercedes': 'border-[#27F4D2] bg-[#27F4D2]/10',
      'McLaren': 'border-[#FF8000] bg-[#FF8000]/10',
      'Aston Martin': 'border-[#229971] bg-[#229971]/10',
      'Alpine': 'border-[#FF87BC] bg-[#FF87BC]/10',
      'Williams': 'border-[#64C4FF] bg-[#64C4FF]/10',
      'AlphaTauri': 'border-[#5E8FAA] bg-[#5E8FAA]/10',
      'Alfa Romeo': 'border-[#C92D4B] bg-[#C92D4B]/10',
      'Haas F1 Team': 'border-[#B6BABD] bg-[#B6BABD]/10',
    };
    return colors[team] || 'border-metrik-turquoise bg-metrik-turquoise/10';
  };

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">PILO</span>
            <span className="text-metrik-turquoise">TES</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Liste des pilotes et équipes</p>
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
                onClick={loadDrivers}
                disabled={loading}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loading ? 'CHARGEMENT...' : '👥 CHARGER'}
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {drivers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PILOTES TOTAL</div>
              <div className="data-display text-4xl text-metrik-turquoise">{drivers.length}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">ÉQUIPES</div>
              <div className="data-display text-4xl text-metrik-silver">{new Set(drivers.map(d => d.team)).size}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">SESSION</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-gold">{sessionType}</div>
            </div>
          </div>
        )}

        {/* Drivers Grid */}
        {drivers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {drivers.map((driver, index) => (
              <div
                key={driver.code}
                className={`card-cockpit ${getTeamColor(driver.team)} group cursor-pointer transition-all duration-300 hover:scale-105`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Number Badge */}
                <div className="flex justify-between items-start mb-4">
                  <div className="text-6xl font-rajdhani font-black text-metrik-turquoise/20 group-hover:text-metrik-turquoise/40 transition-colors">
                    {driver.number}
                  </div>
                  <div className="text-3xl transform group-hover:scale-125 transition-transform">
                    🏎️
                  </div>
                </div>

                {/* Driver Code */}
                <div className="text-3xl font-rajdhani font-bold text-metrik-turquoise mb-2 group-hover:text-glow transition-all">
                  {driver.code}
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-metrik-turquoise/50 via-metrik-turquoise/20 to-transparent mb-3" />

                {/* Team */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-metrik-text-secondary text-sm font-rajdhani tracking-wider">ÉQUIPE</span>
                </div>
                <div className="text-lg font-rajdhani font-bold text-metrik-text mb-4">
                  {driver.team}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-metrik-dark">
                  <div>
                    <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">NUMÉRO</div>
                    <div className="font-mono text-xl font-bold text-metrik-silver">#{driver.number}</div>
                  </div>
                  <div>
                    <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">CODE</div>
                    <div className="font-mono text-xl font-bold text-metrik-turquoise">{driver.code}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {drivers.length === 0 && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Configurez les paramètres et chargez les pilotes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}