import React, { useState, useRef, useEffect } from 'react';
import { backendService } from '../services/backend.service';

export default function CircuitPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver, setDriver] = useState('VER');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [circuitData, setCircuitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
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

  const loadCircuit = async () => {
    try {
      setLoading(true);
      const data = await backendService.getCircuit(year, round, sessionType, driver);
      setCircuitData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
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

    // Clear
    ctx.fillStyle = '#0A0A0A';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find bounds
    const xs = positions.map((p: any) => p.x);
    const ys = positions.map((p: any) => p.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min((canvas.width - 100) / width, (canvas.height - 100) / height);

    // Normalize positions
    const normalizedPositions = positions.map((p: any) => ({
      x: (p.x - minX) * scale + 50,
      y: canvas.height - ((p.y - minY) * scale + 50),
      speed: p.speed,
    }));

    // Get speed range for color mapping
    const speeds = normalizedPositions.map((p: any) => p.speed);
    const minSpeed = Math.min(...speeds);
    const maxSpeed = Math.max(...speeds);

    // Draw track with speed colors
    for (let i = 1; i < normalizedPositions.length; i++) {
      const prev = normalizedPositions[i - 1];
      const curr = normalizedPositions[i];

      // Color based on speed (slow = red, fast = turquoise)
      const speedRatio = (curr.speed - minSpeed) / (maxSpeed - minSpeed);
      const r = Math.floor(255 * (1 - speedRatio));
      const g = Math.floor(210 * speedRatio);
      const b = Math.floor(190 * speedRatio);

      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    // Draw start/finish line
    if (normalizedPositions.length > 0) {
      const start = normalizedPositions[0];
      ctx.fillStyle = '#00D2BE';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00D2BE';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // "START" label
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px Rajdhani';
      ctx.textAlign = 'center';
      ctx.fillText('START', start.x, start.y - 20);
    }

    // Reset shadow
    ctx.shadowBlur = 0;
  };

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-rajdhani font-bold mb-2">
            <span className="text-metrik-silver">CIR</span>
            <span className="text-metrik-turquoise">CUIT</span>
          </h1>
          <div className="h-1 bg-gradient-to-r from-metrik-turquoise via-metrik-turquoise/50 to-transparent w-64" />
          <p className="text-metrik-text-secondary font-inter mt-2">Visualisation trajectoire et zones de vitesse</p>
        </div>

        {/* Controls */}
        <div className="card-cockpit mb-8">
          <h2 className="text-2xl font-rajdhani font-bold text-metrik-turquoise mb-6">PARAMÈTRES SYSTÈME</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  onClick={loadCircuit}
                  disabled={loading}
                  className="w-full btn-cockpit disabled:opacity-50"
                >
                  {loading ? 'GÉNÉRATION...' : '🗺️ VISUALISER'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Circuit Info */}
        {circuitData && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">CIRCUIT</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-turquoise">{circuitData.circuit_name}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">PILOTE</div>
              <div className="text-2xl font-rajdhani font-bold text-metrik-silver">{driver}</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-sm font-rajdhani text-metrik-text-secondary tracking-wider mb-2">TEMPS AU TOUR</div>
              <div className="data-display text-2xl text-metrik-success">{circuitData.lap_time?.toFixed(3)}s</div>
            </div>
          </div>
        )}

        {/* Canvas */}
        {circuitData && (
          <div className="card-cockpit">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-rajdhani font-bold text-metrik-turquoise flex items-center gap-2">
                <span>🗺️</span> TRAJECTOIRE & VITESSE
              </h3>
              <div className="flex items-center gap-4 text-sm font-inter">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-red-500 to-orange-500 rounded" />
                  <span className="text-metrik-text-secondary">Lent</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-yellow-500 to-green-500 rounded" />
                  <span className="text-metrik-text-secondary">Moyen</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gradient-to-r from-green-500 to-metrik-turquoise rounded" />
                  <span className="text-metrik-text-secondary">Rapide</span>
                </div>
              </div>
            </div>
            <div className="bg-metrik-black border border-metrik-turquoise/20 rounded-lg p-4 flex items-center justify-center">
              <canvas 
                ref={canvasRef} 
                width={1000} 
                height={600}
                className="max-w-full h-auto"
              />
            </div>
            <p className="text-metrik-text-tertiary text-sm font-inter mt-4 text-center">
              Rouge = zones de freinage / Turquoise = zones rapides / Point turquoise = ligne de départ
            </p>
          </div>
        )}

        {!circuitData && !loading && (
          <div className="card-cockpit text-center py-12">
            <div className="text-6xl mb-4">🗺️</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">
              SYSTÈME EN ATTENTE DE DONNÉES
            </p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Chargez les pilotes et sélectionnez-en un pour visualiser le circuit
            </p>
          </div>
        )}
      </div>
    </div>
  );
}