import React, { useState, useRef, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';
import { backendService } from '../services/backend.service';

export default function PitWallPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [driver1, setDriver1] = useState('VER');
  const [driver2, setDriver2] = useState('HAM');
  const [drivers, setDrivers] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [deltaData, setDeltaData] = useState<any>(null);
  const [circuitData, setCircuitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [comparison, delta, circuit] = await Promise.all([
        backendService.compareTelemetry(year, round, sessionType, driver1, driver2),
        backendService.getDelta(year, round, sessionType, driver1, driver2),
        backendService.getCircuit(year, round, sessionType, driver1),
      ]);
      setData(comparison);
      setDeltaData(delta);
      setCircuitData(circuit);
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
      ctx.lineWidth = 3;
      ctx.shadowBlur = 5;
      ctx.shadowColor = `rgb(${r}, ${g}, ${b})`;

      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    if (normalizedPositions.length > 0) {
      const start = normalizedPositions[0];
      ctx.fillStyle = '#00D2BE';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00D2BE';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
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
      [`${driver1}_gear`]: point.gear,
      [`${driver2}_gear`]: data[driver2]?.telemetry[i]?.gear || 0,
    })) : [];

  const deltaChartData = deltaData?.delta?.map((point: any) => ({
    distance: point.distance,
    delta: point.delta,
  })) || [];

  return (
    <div className="min-h-screen bg-metrik-black text-metrik-text p-4">
      <div className="max-w-[2000px] mx-auto">
        
        {/* Header Compact */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-rajdhani font-bold flex items-center gap-2">
                <span className="text-metrik-silver">PIT</span>
                <span className="text-metrik-turquoise">WALL</span>
                <span className="text-2xl">🎯</span>
              </h1>
              <div className="h-0.5 bg-gradient-to-r from-metrik-turquoise to-transparent w-32" />
            </div>
            <div className="text-xs text-metrik-text-tertiary font-mono">
              ENGINEERING COMMAND CENTER
            </div>
          </div>
        </div>

        {/* Controls Compact */}
        <div className="glass-cockpit border border-metrik-turquoise/20 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-7 gap-2">
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              placeholder="Year"
              className="px-2 py-1 bg-metrik-dark border border-metrik-turquoise/30 rounded text-metrik-text font-mono text-sm focus:border-metrik-turquoise focus:outline-none"
            />
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(parseInt(e.target.value))}
              placeholder="Rnd"
              className="px-2 py-1 bg-metrik-dark border border-metrik-turquoise/30 rounded text-metrik-text font-mono text-sm focus:border-metrik-turquoise focus:outline-none"
            />
            <select
              value={sessionType}
              onChange={(e) => setSessionType(e.target.value)}
              className="px-2 py-1 bg-metrik-dark border border-metrik-turquoise/30 rounded text-metrik-text font-rajdhani text-sm focus:border-metrik-turquoise focus:outline-none"
            >
              <option value="FP1">FP1</option>
              <option value="FP2">FP2</option>
              <option value="FP3">FP3</option>
              <option value="Q">Q</option>
              <option value="R">R</option>
            </select>
            <button
              onClick={loadDrivers}
              disabled={loadingDrivers}
              className="px-2 py-1 bg-metrik-dark border border-metrik-silver/30 rounded text-metrik-text font-rajdhani text-xs hover:bg-metrik-turquoise/10 disabled:opacity-50"
            >
              {loadingDrivers ? '⏳' : '🔄'}
            </button>
            {drivers.length > 0 && (
              <>
                <select
                  value={driver1}
                  onChange={(e) => setDriver1(e.target.value)}
                  className="px-2 py-1 bg-metrik-dark border border-metrik-success/30 rounded text-metrik-text font-rajdhani text-sm focus:border-metrik-success focus:outline-none"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>{d.code}</option>
                  ))}
                </select>
                <select
                  value={driver2}
                  onChange={(e) => setDriver2(e.target.value)}
                  className="px-2 py-1 bg-metrik-dark border border-metrik-turquoise/30 rounded text-metrik-text font-rajdhani text-sm focus:border-metrik-turquoise focus:outline-none"
                >
                  {drivers.map(d => (
                    <option key={d.code} value={d.code}>{d.code}</option>
                  ))}
                </select>
                <button
                  onClick={loadAllData}
                  disabled={loading}
                  className="px-2 py-1 bg-metrik-turquoise/20 border border-metrik-turquoise rounded text-metrik-turquoise font-rajdhani text-xs font-bold hover:bg-metrik-turquoise/30 disabled:opacity-50"
                >
                  {loading ? '⏳ LOAD' : '⚡ LOAD'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Dashboard Layout */}
        {data && (
          <>
            {/* Lap Times Header */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="glass-cockpit border border-metrik-success/30 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">DRIVER 1</div>
                    <div className="text-2xl font-rajdhani font-bold text-metrik-success">{driver1}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">LAP TIME</div>
                    <div className="font-mono text-xl font-bold text-metrik-success">
                      {data[driver1]?.lap_time?.toFixed(3)}s
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="glass-cockpit border border-metrik-turquoise/30 rounded p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">DRIVER 2</div>
                    <div className="text-2xl font-rajdhani font-bold text-metrik-turquoise">{driver2}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">LAP TIME</div>
                    <div className="font-mono text-xl font-bold text-metrik-turquoise">
                      {data[driver2]?.lap_time?.toFixed(3)}s
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3x3 Grid Layout */}
            <div className="grid grid-cols-3 gap-3">
              
              {/* Speed Chart */}
              <div className="glass-cockpit border border-metrik-turquoise/20 rounded-lg p-3">
                <h3 className="text-sm font-rajdhani font-bold text-metrik-turquoise mb-2">SPEED (km/h)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.05)" />
                    <XAxis dataKey="distance" stroke="#666" style={{ fontSize: '10px' }} hide />
                    <YAxis stroke="#666" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #00D2BE', borderRadius: '4px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${driver1}_speed`} stroke="#00D176" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={`${driver2}_speed`} stroke="#00D2BE" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Throttle Chart */}
              <div className="glass-cockpit border border-metrik-success/20 rounded-lg p-3">
                <h3 className="text-sm font-rajdhani font-bold text-metrik-success mb-2">THROTTLE (%)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.05)" />
                    <XAxis dataKey="distance" stroke="#666" hide />
                    <YAxis stroke="#666" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #00D176', borderRadius: '4px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${driver1}_throttle`} stroke="#00D176" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={`${driver2}_throttle`} stroke="#00D2BE" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Brake Chart */}
              <div className="glass-cockpit border border-metrik-error/20 rounded-lg p-3">
                <h3 className="text-sm font-rajdhani font-bold text-metrik-error mb-2">BRAKE (%)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.05)" />
                    <XAxis dataKey="distance" stroke="#666" hide />
                    <YAxis stroke="#666" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #FF4444', borderRadius: '4px', fontSize: '11px' }} />
                    <Line type="monotone" dataKey={`${driver1}_brake`} stroke="#FF4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey={`${driver2}_brake`} stroke="#FFB800" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Gear Chart */}
              <div className="glass-cockpit border border-metrik-gold/20 rounded-lg p-3">
                <h3 className="text-sm font-rajdhani font-bold text-metrik-gold mb-2">GEAR</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={mergedData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.05)" />
                    <XAxis dataKey="distance" stroke="#666" hide />
                    <YAxis stroke="#666" style={{ fontSize: '10px' }} width={40} domain={[0, 8]} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #FFD700', borderRadius: '4px', fontSize: '11px' }} />
                    <Line type="stepAfter" dataKey={`${driver1}_gear`} stroke="#FFD700" strokeWidth={2} dot={false} />
                    <Line type="stepAfter" dataKey={`${driver2}_gear`} stroke="#FFB800" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Delta Chart */}
              <div className="glass-cockpit border border-metrik-warning/20 rounded-lg p-3 col-span-2">
                <h3 className="text-sm font-rajdhani font-bold text-metrik-warning mb-2">DELTA TIME (s)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={deltaChartData}>
                    <defs>
                      <linearGradient id="colorDelta" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D2BE" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#00D2BE" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(192,192,192,0.05)" />
                    <XAxis dataKey="distance" stroke="#666" hide />
                    <YAxis stroke="#666" style={{ fontSize: '10px' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #FFB800', borderRadius: '4px', fontSize: '11px' }} />
                    <ReferenceLine y={0} stroke="#fff" strokeWidth={1} />
                    <Area type="monotone" dataKey="delta" stroke="#FFD700" strokeWidth={2} fill="url(#colorDelta)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Track Map */}
              {circuitData && (
                <div className="glass-cockpit border border-metrik-silver/20 rounded-lg p-3 row-span-2">
                  <h3 className="text-sm font-rajdhani font-bold text-metrik-silver mb-2">TRACK MAP</h3>
                  <div className="bg-metrik-black rounded border border-metrik-turquoise/10 flex items-center justify-center" style={{ height: '420px' }}>
                    <canvas ref={canvasRef} width={300} height={400} className="max-w-full h-auto" />
                  </div>
                </div>
              )}

              {/* Stats Grid */}
              <div className="col-span-2 grid grid-cols-4 gap-2">
                {mergedData.length > 0 && (() => {
                  const speeds1 = mergedData.map((d: any) => d[`${driver1}_speed`]).filter((s: number) => s > 0);
                  const speeds2 = mergedData.map((d: any) => d[`${driver2}_speed`]).filter((s: number) => s > 0);
                  const maxSpeed1 = Math.max(...speeds1);
                  const maxSpeed2 = Math.max(...speeds2);
                  const avgSpeed1 = speeds1.reduce((a: number, b: number) => a + b, 0) / speeds1.length;
                  const avgSpeed2 = speeds2.reduce((a: number, b: number) => a + b, 0) / speeds2.length;

                  return (
                    <>
                      <div className="glass-cockpit border border-metrik-success/20 rounded p-2 text-center">
                        <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">MAX {driver1}</div>
                        <div className="font-mono text-lg font-bold text-metrik-success">{maxSpeed1.toFixed(0)}</div>
                        <div className="text-xs text-metrik-text-tertiary">km/h</div>
                      </div>
                      <div className="glass-cockpit border border-metrik-turquoise/20 rounded p-2 text-center">
                        <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">MAX {driver2}</div>
                        <div className="font-mono text-lg font-bold text-metrik-turquoise">{maxSpeed2.toFixed(0)}</div>
                        <div className="text-xs text-metrik-text-tertiary">km/h</div>
                      </div>
                      <div className="glass-cockpit border border-metrik-success/20 rounded p-2 text-center">
                        <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">AVG {driver1}</div>
                        <div className="font-mono text-lg font-bold text-metrik-success">{avgSpeed1.toFixed(0)}</div>
                        <div className="text-xs text-metrik-text-tertiary">km/h</div>
                      </div>
                      <div className="glass-cockpit border border-metrik-turquoise/20 rounded p-2 text-center">
                        <div className="text-xs text-metrik-text-tertiary font-rajdhani mb-1">AVG {driver2}</div>
                        <div className="font-mono text-lg font-bold text-metrik-turquoise">{avgSpeed2.toFixed(0)}</div>
                        <div className="text-xs text-metrik-text-tertiary">km/h</div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </>
        )}

        {!data && !loading && (
          <div className="glass-cockpit border border-metrik-turquoise/20 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-metrik-text-secondary font-rajdhani text-lg">PIT WALL SYSTEM STANDBY</p>
            <p className="text-metrik-text-tertiary font-inter text-sm mt-2">
              Load drivers and initiate telemetry stream
            </p>
          </div>
        )}
      </div>
    </div>
  );
}