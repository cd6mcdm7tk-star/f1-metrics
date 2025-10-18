import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { backendService } from '../services/backend.service';

export default function TelemetryPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver, setDriver] = useState('VER');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [telemetry, setTelemetry] = useState<any[]>([]);
  const [circuitData, setCircuitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [lapTime, setLapTime] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
      const [telData, circData] = await Promise.all([
        backendService.getTelemetry(year, round, sessionType, driver),
        backendService.getCircuit(year, round, sessionType, driver),
      ]);
      setTelemetry(telData.telemetry);
      setLapTime(telData.lap_time);
      setCircuitData(circData);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement. Vérifie les paramètres.');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (circuitData && canvasRef.current) {
      drawCircuit();
    }
  }, [circuitData]);

  const drawCircuit = () => {
    const canvas = canvasRef.current;
    if (!canvas || !circuitData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const positions = circuitData.positions;
    if (positions.length === 0) return;

    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const xs = positions.map((p: any) => p.x);
    const ys = positions.map((p: any) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min((canvas.width - 40) / width, (canvas.height - 40) / height);

    const normalizedPositions = positions.map((p: any) => ({
      x: (p.x - minX) * scale + 20,
      y: canvas.height - ((p.y - minY) * scale + 20),
      speed: p.speed,
    }));

    const speeds = normalizedPositions.map((p: any) => p.speed);
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);

    for (let i = 1; i < normalizedPositions.length; i++) {
      const prev = normalizedPositions[i - 1];
      const curr = normalizedPositions[i];

      const speedRatio = (curr.speed - minSpeed) / (maxSpeed - minSpeed);
      const r = Math.floor(255 * (1 - speedRatio));
      const g = Math.floor(210 * speedRatio);
      const b = Math.floor(190 * speedRatio);

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 4;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    if (normalizedPositions.length > 0) {
      const start = normalizedPositions[0];
      ctx.fillStyle = '#00D2BE';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#00D2BE';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
  };

  // Calculate stats
  const stats = telemetry.length > 0 ? {
    maxSpeed: Math.max(...telemetry.map(t => t.speed)),
    avgSpeed: telemetry.reduce((sum, t) => sum + t.speed, 0) / telemetry.length,
    minSpeed: Math.min(...telemetry.map(t => t.speed)),
    avgThrottle: telemetry.reduce((sum, t) => sum + t.throttle, 0) / telemetry.length,
    brakingZones: telemetry.filter(t => t.brake > 0).length,
    maxGear: Math.max(...telemetry.map(t => t.gear)),
  } : null;

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">TÉLÉ</span>
            <span className="text-metrik-turquoise">MÉTRIE</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Analyse détaillée des données de course</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-6">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-4">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
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
            
            <div className="col-span-2">
              <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">ACTION</label>
              <button
                onClick={loadDrivers}
                disabled={loadingDrivers}
                className="w-full btn-cockpit disabled:opacity-50"
              >
                {loadingDrivers ? 'CHARGEMENT...' : '🔄 CHARGER PILOTES'}
              </button>
            </div>
          </div>

          {drivers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-rajdhani text-metrik-text-secondary mb-2 tracking-wide">PILOTE</label>
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full px-4 py-3 bg-metrik-dark border border-metrik-silver/30 rounded-lg text-metrik-text font-rajdhani focus:border-metrik-silver focus:outline-none transition-colors"
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
                  className="w-full btn-cockpit disabled:opacity-50"
                >
                  {loading ? 'ANALYSE...' : '📊 ANALYSER'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Cards + Lap Time */}
        {stats && lapTime && (
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-6">
            <div className="card-cockpit text-center bg-metrik-success/5 border-metrik-success/30">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">LAP TIME</div>
              <div className="data-display text-2xl text-metrik-success">{lapTime.toFixed(3)}s</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">MAX SPEED</div>
              <div className="font-mono text-xl font-bold text-metrik-turquoise">{stats.maxSpeed.toFixed(0)}</div>
              <div className="text-xs text-metrik-text-tertiary">km/h</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">AVG SPEED</div>
              <div className="font-mono text-xl font-bold text-metrik-silver">{stats.avgSpeed.toFixed(0)}</div>
              <div className="text-xs text-metrik-text-tertiary">km/h</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">MIN SPEED</div>
              <div className="font-mono text-xl font-bold text-metrik-warning">{stats.minSpeed.toFixed(0)}</div>
              <div className="text-xs text-metrik-text-tertiary">km/h</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">AVG THROTTLE</div>
              <div className="font-mono text-xl font-bold text-metrik-success">{stats.avgThrottle.toFixed(0)}</div>
              <div className="text-xs text-metrik-text-tertiary">%</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">BRAKING ZONES</div>
              <div className="font-mono text-xl font-bold text-metrik-error">{stats.brakingZones}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-xs font-rajdhani text-metrik-text-tertiary mb-1">MAX GEAR</div>
              <div className="font-mono text-xl font-bold text-metrik-gold">{stats.maxGear}</div>
            </div>
          </div>
        )}

        {/* Main Content: Grid Layout + Track Map */}
        {telemetry.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Left: 2x2 Grid of Charts */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              
              {/* Speed */}
              <div className="card-cockpit">
                <h3 className="text-lg font-rajdhani font-bold text-metrik-turquoise mb-3 flex items-center gap-2">
                  <span>🚀</span> VITESSE (km/h)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={telemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                    <XAxis 
                      dataKey="distance" 
                      stroke="#B0B0B0" 
                      style={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                      hide
                    />
                    <YAxis 
                      stroke="#B0B0B0"
                      style={{ fontSize: '10px', fontFamily: 'JetBrains Mono' }}
                      width={40}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1A1A1A', 
                        border: '1px solid #00D2BE',
                        borderRadius: '8px',
                        fontFamily: 'JetBrains Mono',
                        fontSize: '11px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="speed" 
                      stroke="#00D2BE" 
                      strokeWidth={2} 
                      dot={false}
                      filter="drop-shadow(0 0 8px rgba(0,210,190,0.6))"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Throttle */}
              <div className="card-cockpit">
                <h3 className="text-lg font-rajdhani font-bold text-metrik-success mb-3 flex items-center gap-2">
                  <span>⚡</span> THROTTLE (%)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={telemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                    <XAxis dataKey="distance" stroke="#B0B0B0" hide />
                    <YAxis stroke="#B0B0B0" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #00D176', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="throttle" stroke="#00D176" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Brake */}
              <div className="card-cockpit">
                <h3 className="text-lg font-rajdhani font-bold text-metrik-error mb-3 flex items-center gap-2">
                  <span>🛑</span> BRAKE (%)
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={telemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                    <XAxis dataKey="distance" stroke="#B0B0B0" hide />
                    <YAxis stroke="#B0B0B0" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #FF4444', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey="brake" stroke="#FF4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gear */}
              <div className="card-cockpit">
                <h3 className="text-lg font-rajdhani font-bold text-metrik-gold mb-3 flex items-center gap-2">
                  <span>⚙️</span> GEAR
                </h3>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={telemetry}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.1)" />
                    <XAxis dataKey="distance" stroke="#B0B0B0" hide />
                    <YAxis stroke="#B0B0B0" style={{ fontSize: '10px' }} width={40} domain={[0, 8]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #FFD700', borderRadius: '8px', fontSize: '11px' }} />
                    <Line type="stepAfter" dataKey="gear" stroke="#FFD700" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: Mini Track Map */}
            {circuitData && (
              <div className="card-cockpit">
                <h3 className="text-lg font-rajdhani font-bold text-metrik-silver mb-3 flex items-center gap-2">
                  <span>🗺️</span> TRACK MAP
                </h3>
                <div className="bg-metrik-black rounded border border-metrik-turquoise/10 flex items-center justify-center p-4">
                  <canvas ref={canvasRef} width={320} height={560} className="max-w-full h-auto" />
                </div>
                <div className="mt-3 flex items-center justify-between text-xs font-inter">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-orange-500 rounded" />
                    <span className="text-metrik-text-secondary">Lent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-yellow-500 to-green-500 rounded" />
                    <span className="text-metrik-text-secondary">Moyen</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-metrik-turquoise rounded" />
                    <span className="text-metrik-text-secondary">Rapide</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {telemetry.length === 0 && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Chargez les pilotes et sélectionnez-en un pour démarrer l'analyse
            </p>
          </div>
        )}
      </div>
    </div>
  );
}