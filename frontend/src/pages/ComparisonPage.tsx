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
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">COMPA</span>
            <span className="text-metrik-turquoise">RAISON</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Analyse comparative multi-pilotes</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-8">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-6">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
                <option value="Q">Qualifications</option>
                <option value="R">Course</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ACTION</label>
              <button
                onClick={loadDrivers}
                disabled={loadingDrivers}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loadingDrivers ? 'CHARGEMENT...' : '🔄 PILOTES'}
              </button>
            </div>
          </div>

          {drivers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">PILOTE 1</label>
                <select
                  value={driver1}
                  onChange={(e) => setDriver1(e.target.value)}
                  className="w-full px-4 py-3 bg-metrik-dark border border-metrik-success/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-success focus:outline-none transition-colors"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>
                      #{d.number} - {d.code} ({d.team})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">PILOTE 2</label>
                <select
                  value={driver2}
                  onChange={(e) => setDriver2(e.target.value)}
                  className="w-full px-4 py-3 bg-metrik-dark border border-metrik-turquoise/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-turquoise focus:outline-none transition-colors"
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
                  className="w-full btn-cockpit disabled:opacity-50"
                >
                  {loading ? 'ANALYSE...' : '⚡ COMPARER'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Lap Times */}
        {data && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="card-cockpit bg-metrik-success/5 border-metrik-success/30 text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PILOTE 1</div>
              <div className="text-3xl font-rajdhani font-bold text-metrik-success mb-2">{driver1}</div>
              <div className="data-display text-4xl text-metrik-success">{data[driver1]?.lap_time?.toFixed(3)}s</div>
            </div>
            
            <div className="card-cockpit bg-metrik-turquoise/5 border-metrik-turquoise/30 text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PILOTE 2</div>
              <div className="text-3xl font-rajdhani font-bold text-metrik-turquoise mb-2">{driver2}</div>
              <div className="data-display text-4xl text-metrik-turquoise">{data[driver2]?.lap_time?.toFixed(3)}s</div>
            </div>
          </div>
        )}

        {/* Delta Chart */}
        {deltaChartData.length > 0 && (
          <div className="card-cockpit mb-6">
            <h3 className="text-xl font-rajdhani font-bold text-metrik-gold mb-2 flex items-center gap-2">
              <span>⏱️</span> DELTA TEMPS (secondes)
            </h3>
            <p className="text-sm text-metrik-text-tertiary font-inter mb-4">
              Vert = {driver1} devant • Turquoise = {driver2} devant
            </p>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={deltaChartData}>
                <defs>
                  <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D2BE" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D2BE" stopOpacity={0.3}/>
                  </linearGradient>
                  <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00D176" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#00D176" stopOpacity={0.3}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                <XAxis 
                  dataKey="distance" 
                  stroke="#B0B0B0"
                  style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                />
                <YAxis 
                  stroke="#B0B0B0"
                  style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1A1A1A', 
                    border: '1px solid #FFD700',
                    borderRadius: '8px',
                    fontFamily: 'JetBrains Mono'
                  }} 
                />
                <ReferenceLine y={0} stroke="#fff" strokeWidth={2} />
                <Area 
                  type="monotone" 
                  dataKey="delta" 
                  stroke="#FFD700" 
                  strokeWidth={2} 
                  fill="url(#colorPositive)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Comparison Charts */}
        {mergedData.length > 0 && (
          <div className="space-y-6">
            
            {/* Speed */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise mb-4 flex items-center gap-2">
                <span>🚀</span> VITESSE (km/h)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="distance" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #00D2BE',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver1}_speed`} 
                    stroke="#00D176" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver1} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver2}_speed`} 
                    stroke="#00D2BE" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Throttle */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-silver mb-4 flex items-center gap-2">
                <span>🎮</span> THROTTLE (%)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="distance" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #C0C0C0',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver1}_throttle`} 
                    stroke="#00D176" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver1} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver2}_throttle`} 
                    stroke="#00D2BE" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Brake */}
            <div className="card-cockpit">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-error mb-4 flex items-center gap-2">
                <span>🛑</span> BRAKE (%)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={mergedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                  <XAxis 
                    dataKey="distance" 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <YAxis 
                    stroke="#B0B0B0"
                    style={{ fontSize: '12px', fontFamily: 'JetBrains Mono' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1A1A1A', 
                      border: '1px solid #FF4444',
                      borderRadius: '8px'
                    }} 
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver1}_brake`} 
                    stroke="#FF4444" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver1} 
                  />
                  <Line 
                    type="monotone" 
                    dataKey={`${driver2}_brake`} 
                    stroke="#FFB800" 
                    strokeWidth={2} 
                    dot={false} 
                    name={driver2} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {!data && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">🔄</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Chargez les pilotes, sélectionnez-en 2 et lancez la comparaison
            </p>
          </div>
        )}
      </div>
    </div>
  );
}