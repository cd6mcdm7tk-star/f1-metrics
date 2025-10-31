import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Activity, Trophy, Map, Target, Film, Menu, X, Cpu } from 'lucide-react';
import { useState } from 'react';
import HomePage from './pages/HomePage';
import TelemetryPage from './pages/TelemetryPage';
import AnimationPage from './pages/AnimationPage';
import PitWallPage from './pages/PitWallPage';
import ChampionshipPage from './pages/ChampionshipPage';
import TrackDatabasePage from './pages/TrackDatabasePage';
import F1AnatomyPage from './pages/F1AnatomyPage';
import { useToast } from './hooks/useToast';
import Toast from './components/Toast';
import DonkeyLogo from './components/DonkeyLogo';
import F1CircuitGuesser from './components/F1CircuitGuesser';
import { useKonamiCode } from './hooks/useKonamiCode';
import Footer from './components/Footer'; // ← NOUVEAU : Import du Footer


function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location.pathname === path;
  
  const navLinks = [
    { path: '/', label: 'Accueil', icon: Home },
    { path: '/telemetry', label: 'Télémétrie', icon: Activity },
    { path: '/animation', label: 'Animation', icon: Film },
    { path: '/championship', label: 'Championship', icon: Trophy },
    { path: '/track-database', label: 'Track Database', icon: Map },
    { path: '/pit-wall', label: 'Pit Wall', icon: Target },
    { path: '/f1-anatomy', label: 'F1 Anatomy', icon: Cpu },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="glass-cockpit border-b border-metrik-turquoise/20 sticky top-0 z-50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            
            <Link to="/" className="flex items-center gap-2 sm:gap-3 group" onClick={closeMobileMenu}>
              <div className="relative">
                <DonkeyLogo 
                  size={32} 
                  className="sm:w-9 sm:h-9 text-metrik-turquoise transition-transform group-hover:scale-110" 
                />
                <div className="absolute inset-0 blur-lg opacity-0 group-hover:opacity-100 transition-opacity bg-metrik-turquoise/30" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xl sm:text-2xl font-rajdhani font-bold tracking-wider">
                  <span className="text-white">METRIK</span>
                  <span className="text-metrik-turquoise ml-1">F1</span>
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-semibold
                      transition-all duration-200 relative group
                      ${isActive(link.path)
                        ? 'text-metrik-turquoise bg-metrik-turquoise/10'
                        : 'text-metrik-silver hover:text-white hover:bg-metrik-surface'
                      }
                    `}
                  >
                    <Icon size={18} />
                    <span>{link.label}</span>
                    {isActive(link.path) && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-metrik-turquoise" />
                    )}
                  </Link>
                );
              })}
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-metrik-silver hover:text-metrik-turquoise hover:bg-metrik-surface transition-all"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-metrik-black/95 backdrop-blur-xl">
          <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={closeMobileMenu}
                  className={`
                    flex items-center gap-3 px-6 py-4 rounded-xl font-rajdhani font-bold text-lg
                    transition-all duration-200 w-full max-w-xs
                    ${isActive(link.path)
                      ? 'text-metrik-turquoise bg-metrik-turquoise/10 border border-metrik-turquoise/30'
                      : 'text-metrik-silver hover:text-white hover:bg-metrik-surface'
                    }
                  `}
                >
                  <Icon size={24} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

function App() {
  const { toasts, removeToast } = useToast();
  const [showMiniGame, setShowMiniGame] = useState(false);

  // Konami Code activates the mini-game!
  useKonamiCode(() => {
    setShowMiniGame(true);
  });

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-metrik-black text-metrik-text flex flex-col">
        <Navigation />
        
        {/* Main content avec flex-1 pour pousser le footer en bas */}
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/telemetry" element={<TelemetryPage />} />
            <Route path="/animation" element={<AnimationPage />} />
            <Route path="/pit-wall" element={<PitWallPage />} />
            <Route path="/championship" element={<ChampionshipPage />} />
            <Route path="/track-database" element={<TrackDatabasePage />} />
            <Route path="/f1-anatomy" element={<F1AnatomyPage />} />
          </Routes>
        </main>

        {/* ⭐ NOUVEAU : Footer apparaît sur toutes les pages ⭐ */}
        <Footer />

        <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
          {toasts.map((toast) => (
            <div key={toast.id} className="pointer-events-auto">
              <Toast
                id={toast.id}
                type={toast.type}
                message={toast.message}
                onClose={removeToast}
              />
            </div>
          ))}
        </div>

        {/* Mini-Game triggered by Konami Code */}
        {showMiniGame && (
          <F1CircuitGuesser onClose={() => setShowMiniGame(false)} />
        )}
      </div>
    </BrowserRouter>
  );
}

export default App;// Force deploy
