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
    <div className="min-h-screen bg-metrik-black">
      
      {/* Hero Section - Cockpit Style */}
      <div className="relative overflow-hidden">
        {/* Background subtle grid */}
        <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-50" />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-metrik-turquoise/5 via-transparent to-metrik-black" />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-20">
          
          {/* Main Title */}
          <div className="text-center mb-12">
            <div className="inline-block mb-6">
              <h1 className="text-7xl md:text-8xl font-rajdhani font-bold tracking-wider mb-2">
                <span className="text-metrik-silver">METR</span>
                <span className="text-metrik-turquoise text-glow">IK</span>
              </h1>
              <div className="h-1 bg-gradient-to-r from-transparent via-metrik-turquoise to-transparent" />
            </div>
            
            <p className="text-2xl md:text-3xl font-rajdhani text-metrik-text-secondary mb-4 tracking-wide">
              SYSTÈME D'ANALYSE TÉLÉMÉTRIQUE FORMULA 1
            </p>
            
            <p className="text-metrik-text-tertiary font-inter max-w-2xl mx-auto leading-relaxed">
              Plateforme professionnelle d'analyse de données en temps réel.
              Visualisations avancées, comparaisons multi-pilotes, insights techniques.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate('/telemetry')}
              className="btn-cockpit text-lg px-8 py-4"
            >
              <span className="flex items-center gap-2">
                📊 ANALYSER TÉLÉMÉTRIE
              </span>
            </button>
            
            <button
              onClick={() => navigate('/comparison')}
              className="btn-cockpit-secondary text-lg px-8 py-4"
            >
              <span className="flex items-center gap-2">
                🔄 COMPARER PILOTES
              </span>
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card-cockpit text-center">
              <div className="text-5xl mb-3">🏎️</div>
              <div className="data-display text-4xl mb-2">{events.length}</div>
              <div className="text-metrik-text-secondary font-rajdhani text-sm tracking-wider">COURSES SAISON</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-5xl mb-3">🌍</div>
              <div className="data-display text-4xl mb-2">{new Set(events.map(e => e.country)).size}</div>
              <div className="text-metrik-text-secondary font-rajdhani text-sm tracking-wider">PAYS VISITÉS</div>
            </div>
            
            <div className="card-cockpit text-center">
              <div className="text-5xl mb-3">📊</div>
              <div className="data-display text-4xl mb-2">9</div>
              <div className="text-metrik-text-secondary font-rajdhani text-sm tracking-wider">MODULES ANALYSE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Season Selection */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="section-header mb-6">Sélectionner une saison</h2>
          <div className="flex gap-3 flex-wrap">
            {seasons.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-6 py-3 rounded-lg font-rajdhani font-bold text-lg transition-all duration-300 border ${
                  selectedYear === year
                    ? 'bg-metrik-turquoise/10 border-metrik-turquoise text-metrik-turquoise shadow-glow-turquoise scale-105'
                    : 'bg-metrik-card border-metrik-silver/20 text-metrik-text-secondary hover:border-metrik-silver/50 hover:scale-105'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar Grid */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-rajdhani font-bold text-metrik-text">
              Calendrier {selectedYear}
            </h2>
            <div className="text-metrik-text-secondary font-rajdhani">
              <span className="data-display text-2xl">{events.length}</span>
              <span className="ml-2">GRANDS PRIX</span>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div className="loading-spinner mx-auto mb-4" />
              <p className="text-metrik-text-secondary font-rajdhani">CHARGEMENT DES DONNÉES...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <div
                  key={event.round}
                  className="card-cockpit cursor-pointer group"
                  onClick={() => navigate('/results')}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-5xl font-rajdhani font-black text-metrik-turquoise/30 group-hover:text-metrik-turquoise transition-colors">
                        R{event.round}
                      </span>
                    </div>
                    <span className="text-4xl transform group-hover:scale-125 transition-transform">
                      {getCountryFlag(event.country)}
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-rajdhani font-bold text-metrik-text mb-3 group-hover:text-metrik-turquoise transition-colors">
                    {event.event_name}
                  </h3>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-metrik-turquoise/50 via-metrik-turquoise/20 to-transparent mb-3" />

                  {/* Info */}
                  <div className="space-y-1 text-sm">
                    <p className="flex items-center gap-2 text-metrik-text-secondary font-inter">
                      <span className="text-metrik-turquoise">▸</span>
                      <span>{event.location}</span>
                    </p>
                    <p className="flex items-center gap-2 text-metrik-text-secondary font-inter">
                      <span className="text-metrik-silver">▸</span>
                      <span>{event.country}</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}