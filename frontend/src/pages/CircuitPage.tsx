import React, { useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { backendService } from '../services/backend.service';

export default function CircuitPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('Q');
  const [driver, setDriver] = useState('VER');
  const [circuitData, setCircuitData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadCircuit = async () => {
    try {
      setLoading(true);
      const data = await backendService.getCircuitTelemetry(year, round, sessionType, driver);
      setCircuitData(data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      alert('Erreur de chargement');
      setLoading(false);
    }
  };

  const getColorForSpeed = (speed: number) => {
    if (speed < 100) return '#3B82F6';
    if (speed < 150) return '#10B981';
    if (speed < 200) return '#F59E0B';
    if (speed < 250) return '#EF4444';
    return '#DC2626';
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">🗺️ Tracé du Circuit</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Paramètres</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div>
              <label className="block text-sm mb-2">Pilote</label>
              <input
                type="text"
                value={driver}
                onChange={(e) => setDriver(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={loadCircuit}
                disabled={loading}
                className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Charger'}
              </button>
            </div>
          </div>
          {circuitData && (
            <div className="mt-4 text-center">
              <span className="text-lg">
                🏎️ <span className="font-bold">{circuitData.driver}</span> - ⏱️ <span className="font-bold text-green-500">{circuitData.lap_time?.toFixed(3)}s</span>
              </span>
            </div>
          )}
        </div>

        {circuitData && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Circuit Map</h3>
              <div className="flex gap-4 text-sm">
                <span><span className="inline-block w-4 h-4 bg-blue-500 rounded mr-1"></span>&lt;100 km/h</span>
                <span><span className="inline-block w-4 h-4 bg-green-500 rounded mr-1"></span>100-150 km/h</span>
                <span><span className="inline-block w-4 h-4 bg-yellow-500 rounded mr-1"></span>150-200 km/h</span>
                <span><span className="inline-block w-4 h-4 bg-orange-500 rounded mr-1"></span>200-250 km/h</span>
                <span><span className="inline-block w-4 h-4 bg-red-600 rounded mr-1"></span>&gt;250 km/h</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={600}>
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <XAxis type="number" dataKey="x" hide />
                <YAxis type="number" dataKey="y" hide />
                <ZAxis type="number" dataKey="speed" range={[50, 200]} />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg">
                          <p className="text-sm">Vitesse: <span className="font-bold text-green-400">{payload[0].value} km/h</span></p>
                          <p className="text-sm">Distance: <span className="font-bold">{payload[0].payload.distance?.toFixed(0)} m</span></p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={circuitData.circuit} shape="circle">
                  {circuitData.circuit.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={getColorForSpeed(entry.speed)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {!circuitData && !loading && (
          <div className="text-center py-12 text-gray-400">
            👆 Sélectionne une session et un pilote puis clique sur Charger
          </div>
        )}
      </div>
    </div>
  );
}