import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import TelemetryPage from './pages/TelemetryPage';
import DriversPage from './pages/DriversPage';
import ComparisonPage from './pages/ComparisonPage';
import CircuitPage from './pages/CircuitPage';
import LapTimesPage from './pages/LapTimesPage';
import StatsPage from './pages/StatsPage';
import ResultsPage from './pages/ResultsPage';
import AnimationPage from './pages/AnimationPage';

function Navigation() {
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;
  
  const navLinks = [
    { path: '/', label: 'Accueil', icon: '🏠' },
    { path: '/drivers', label: 'Pilotes', icon: '👥' },
    { path: '/telemetry', label: 'Télémétrie', icon: '📊' },
    { path: '/comparison', label: 'Comparaison', icon: '🔄' },
    { path: '/circuit', label: 'Circuit', icon: '🗺️' },
    { path: '/laptimes', label: 'Classement', icon: '🏁' },
    { path: '/stats', label: 'Statistiques', icon: '📈' },
    { path: '/results', label: 'Résultats', icon: '🏆' },
    { path: '/animation', label: 'Animation', icon: '🎬' },
  ];

  return (
    <nav className="bg-gradient-to-r from-gray-800 via-gray-900 to-black border-b border-gray-700 shadow-2xl sticky top-0 z-50 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-3 group flex-shrink-0">
            <span className="text-4xl transform group-hover:scale-125 transition-transform">🏎️</span>
            <div>
              <span className="text-2xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
                F1 Metrics
              </span>
              <div className="text-xs text-gray-400">Telemetry Analysis</div>
            </div>
          </Link>
          <div className="flex gap-2 overflow-x-auto scrollbar-custom pb-2 flex-1 justify-end">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap flex-shrink-0 ${
                  isActive(link.path)
                    ? 'bg-gradient-to-r from-red-600 to-orange-600 scale-105 shadow-lg shadow-red-500/50'
                    : 'hover:bg-gray-700 hover:scale-105'
                }`}
              >
                <span>{link.icon}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .scrollbar-custom::-webkit-scrollbar {
          height: 6px;
        }
        .scrollbar-custom::-webkit-scrollbar-thumb {
          background-color: #4B5563;
          border-radius: 3px;
        }
        .scrollbar-custom::-webkit-scrollbar-track {
          background-color: #1F2937;
        }
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: #4B5563 #1F2937;
        }
      `}</style>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="bg-gradient-to-r from-gray-900 via-black to-gray-900 border-t border-gray-800 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          <div>
            <h3 className="text-2xl font-bold mb-4 bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              🏎️ F1 Metrics
            </h3>
            <p className="text-gray-400">
              Plateforme d'analyse télémétrique Formula 1 complète et professionnelle.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Navigation</h4>
            <div className="space-y-2 text-gray-400">
              <p>📊 Télémétrie en temps réel</p>
              <p>🔄 Comparaison de pilotes</p>
              <p>🗺️ Tracés de circuits</p>
              <p>🏆 Résultats & Classements</p>
            </div>
          </div>
          <div>
            <h4 className="text-lg font-bold mb-4 text-white">Données</h4>
            <div className="space-y-2 text-gray-400">
              <p>⚡ Alimenté par FastF1</p>
              <p>📡 API officielle F1</p>
              <p>💾 Cache optimisé</p>
              <p>🔄 Mis à jour régulièrement</p>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-800 text-center text-gray-500">
          <p>© 2024 F1 Metrics • Fait avec ❤️ pour les fans de F1</p>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <Navigation />
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/drivers" element={<DriversPage />} />
            <Route path="/telemetry" element={<TelemetryPage />} />
            <Route path="/comparison" element={<ComparisonPage />} />
            <Route path="/circuit" element={<CircuitPage />} />
            <Route path="/laptimes" element={<LapTimesPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/results" element={<ResultsPage />} />
            <Route path="/animation" element={<AnimationPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;