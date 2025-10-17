import React, { useState } from 'react';
import { useSchedule } from '../hooks/useSchedule';
import { useNavigate } from 'react-router-dom';

export default function HomePage() {
  const [selectedYear, setSelectedYear] = useState(2024);
  const { events, loading } = useSchedule(selectedYear);
  const navigate = useNavigate();
  const seasons = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

  const getCountryFlag = (country: string) => {
    const flags: { [key: string]: string } = {
      'Bahrain': '🇧🇭', 'Saudi Arabia': '🇸🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵',
      'China': '🇨🇳', 'USA': '🇺🇸', 'Italy': '🇮🇹', 'Monaco': '🇲🇨', 'Canada': '🇨🇦',
      'Spain': '🇪🇸', 'Austria': '🇦🇹', 'UK': '🇬🇧', 'Hungary': '🇭🇺', 'Belgium': '🇧🇪',
      'Netherlands': '🇳🇱', 'Azerbaijan': '🇦🇿', 'Singapore': '🇸🇬', 'Mexico': '🇲🇽',
      'Brazil': '🇧🇷', 'United States': '🇺🇸', 'Qatar': '🇶🇦', 'Abu Dhabi': '🇦🇪',
      'UAE': '🇦🇪', 'France': '🇫🇷', 'Germany': '🇩🇪', 'Russia': '🇷🇺', 'Turkey': '🇹🇷',
      'Portugal': '🇵🇹'
    };
    return flags[country] || '🏁';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Hero Section avec animation */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20 animate-pulse"></div>
        <div className="relative bg-gradient-to-r from-red-600 to-orange-600 p-16 text-center">
          <div className="animate-fade-in">
            <h1 className="text-7xl font-bold mb-4 drop-shadow-2xl">🏎️ F1 Metrics</h1>
            <p className="text-2xl opacity-90 drop-shadow-lg">
              Plateforme complète d'analyse télémétrique Formula 1
            </p>
            <div className="mt-8 flex gap-4 justify-center">
              <button
                onClick={() => navigate('/telemetry')}
                className="px-8 py-4 bg-white text-red-600 rounded-lg font-bold text-lg hover:scale-110 transition-transform shadow-2xl"
              >
                📊 Télémétrie
              </button>
              <button
                onClick={() => navigate('/comparison')}
                className="px-8 py-4 bg-black/50 backdrop-blur text-white rounded-lg font-bold text-lg hover:scale-110 transition-transform shadow-2xl border-2 border-white/30"
              >
                🔄 Comparaison
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* Sélecteur de saison amélioré */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
            Sélectionne une saison
          </h2>
          <div className="flex gap-3 flex-wrap justify-center">
            {seasons.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-8 py-4 rounded-xl font-bold transition-all duration-300 ${
                  selectedYear === year
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 scale-110 shadow-2xl shadow-red-500/50'
                    : 'bg-gray-800 hover:bg-gray-700 hover:scale-105 shadow-lg'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques de la saison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-green-600 to-green-700 rounded-xl p-6 text-center shadow-xl">
            <div className="text-5xl mb-2">🏁</div>
            <div className="text-4xl font-bold">{events.length}</div>
            <div className="text-lg opacity-90">Courses</div>
          </div>
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl p-6 text-center shadow-xl">
            <div className="text-5xl mb-2">🌍</div>
            <div className="text-4xl font-bold">{new Set(events.map(e => e.country)).size}</div>
            <div className="text-lg opacity-90">Pays</div>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 rounded-xl p-6 text-center shadow-xl">
            <div className="text-5xl mb-2">📅</div>
            <div className="text-4xl font-bold">{selectedYear}</div>
            <div className="text-lg opacity-90">Saison</div>
          </div>
        </div>

        {/* Liste des courses */}
        <div>
          <h2 className="text-3xl font-bold mb-6 text-center">
            Calendrier {selectedYear}
          </h2>
          {loading ? (
            <div className="text-center py-20">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-red-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-400">Chargement du calendrier...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <div
                  key={event.round}
                  className="group bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 hover:from-gray-700 hover:to-gray-800 transition-all duration-300 hover:scale-105 cursor-pointer border-l-4 border-red-600 shadow-lg hover:shadow-2xl hover:shadow-red-500/30 animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  onClick={() => navigate('/results')}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-bold text-gray-700 group-hover:text-red-600 transition-colors">
                        R{event.round}
                      </span>
                    </div>
                    <span className="text-4xl transform group-hover:scale-125 transition-transform">
                      {getCountryFlag(event.country)}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold mb-3 group-hover:text-red-400 transition-colors">
                    {event.event_name}
                  </h3>
                  <div className="space-y-1 text-gray-400">
                    <p className="flex items-center gap-2">
                      <span>📍</span>
                      <span>{event.location}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span>🌍</span>
                      <span>{event.country}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}