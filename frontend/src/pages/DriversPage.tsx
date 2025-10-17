import React, { useState } from 'react';
import { backendService } from '../services/backend.service';
import type { DriverInfo } from '../types';

export default function DriversPage() {
  const [year, setYear] = useState(2024);
  const [round, setRound] = useState(1);
  const [sessionType, setSessionType] = useState('R');
  const [drivers, setDrivers] = useState<DriverInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await backendService.getDrivers(year, round, sessionType);
      setDrivers(data.drivers);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">👥 Pilotes F1</h1>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Sélectionne une session</h2>
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
                onClick={loadDrivers}
                disabled={loading}
                className="w-full px-6 py-2 bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Chargement...' : 'Charger'}
              </button>
            </div>
          </div>
        </div>

        {drivers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {drivers.map(driver => (
              <div
                key={driver.number}
                className="bg-gray-800 rounded-lg p-4 hover:scale-105 transition-all cursor-pointer"
                style={{ borderLeft: `4px solid #${driver.color}` }}
              >
                <div className="text-3xl font-bold mb-2">#{driver.number}</div>
                <div className="text-xl font-bold mb-1">{driver.code}</div>
                <div className="text-sm text-gray-400">{driver.team}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
