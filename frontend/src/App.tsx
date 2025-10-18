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
import PitWallPage from './pages/PitWallPage';

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
    { path: '/pitwall', label: 'Pit Wall', icon: '🎯' },
  ];

  return (
    <nav className="glass-cockpit border-b border-metrik-turquoise/20 sticky top-0 z-50 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <span className="text-4xl transition-transform group-hover:scale-110">🏎️</span>
              <div className="absolute inset-0 blur-lg opacity-0 group-hover:opacity-100 transition-opacity bg-metrik-turquoise/30" />
            </div>
            <div>
              <span className="text-2xl font-rajdhani font-bold tracking-wider">
                <span className="text-metrik-silver">METR</span>
                <span className="text-metrik-turquoise">IK</span>
              </span>
              <div className="h-0.5 bg-gradient-to-r from-metrik-turquoise to-transparent" />
              <div className="text-xs text-metrik-text-secondary font-inter tracking-widest">TELEMETRY SYSTEM</div>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin flex-1 justify-end">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-4 py-2 rounded-lg font-rajdhani font-medium transition-all duration-300 flex items-center gap-2 whitespace-nowrap flex-shrink-0 border ${
                  isActive(link.path)
                    ? 'bg-metrik-turquoise/10 border-metrik-turquoise text-metrik-turquoise shadow-glow-turquoise'
                    : 'border-transparent hover:border-metrik-silver/30 hover:bg-metrik-dark text-metrik-text-secondary hover:text-metrik-text'
                }`}
              >
                <span>{link.icon}</span>
                <span className="hidden lg:inline">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  return (
    <footer className="glass-cockpit border-t border-metrik-turquoise/20 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl">🏎️</span>
              <span className="text-2xl font-rajdhani font-bold">
                <span className="text-metrik-silver">METR</span>
                <span className="text-metrik-turquoise">IK</span>
              </span>
            </div>
            <div className="h-0.5 bg-gradient-to-r from-metrik-turquoise to-transparent mb-4" />
            <p className="text-metrik-text-secondary font-inter text-sm leading-relaxed">
              Plateforme d'analyse télémétrique Formula 1 de nouvelle génération.
              Données en temps réel, visualisations avancées, insights professionnels.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="text-lg font-rajdhani font-bold text-metrik-turquoise mb-4">
              Fonctionnalités
            </h4>
            <div className="space-y-2 text-metrik-text-secondary text-sm font-inter">
              <p className="flex items-center gap-2">
                <span className="text-metrik-turquoise">▸</span>
                Télémétrie haute précision
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-turquoise">▸</span>
                Comparaisons multi-pilotes
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-turquoise">▸</span>
                Visualisation circuits 2D
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-turquoise">▸</span>
                Analyses statistiques avancées
              </p>
            </div>
          </div>

          {/* Tech */}
          <div>
            <h4 className="text-lg font-rajdhani font-bold text-metrik-silver mb-4">
              Technologies
            </h4>
            <div className="space-y-2 text-metrik-text-secondary text-sm font-inter">
              <p className="flex items-center gap-2">
                <span className="text-metrik-silver">⚡</span>
                Données FastF1 API
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-silver">⚡</span>
                Interface React TypeScript
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-silver">⚡</span>
                Backend FastAPI Python
              </p>
              <p className="flex items-center gap-2">
                <span className="text-metrik-silver">⚡</span>
                Cache optimisé temps réel
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-metrik-turquoise/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-metrik-text-tertiary text-sm font-inter">
              © 2025 Metrik • Analyse télémétrique professionnelle F1
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-metrik-success animate-pulse" />
                <span className="text-metrik-text-secondary font-mono">SYSTÈME OPÉRATIONNEL</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-metrik-black text-metrik-text">
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
            <Route path="/pitwall" element={<PitWallPage />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}

export default App;