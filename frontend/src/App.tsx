import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Home, Activity, Trophy, Map, Target, Film, Menu, X, Cpu, LogIn, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LanguageSelector from './components/LanguageSelector';
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
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useRateLimit } from './hooks/useRateLimit';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';

function Navigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isUnlimited: isSubscribed } = useRateLimit();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/telemetry', label: t('nav.telemetry'), icon: Activity },
    { path: '/animation', label: t('nav.animation'), icon: Film },
    { path: '/championship', label: t('nav.championship'), icon: Trophy },
    { path: '/track-database', label: t('nav.trackDatabase'), icon: Map },
    { path: '/pit-wall', label: t('nav.pitWall'), icon: Target },
    { path: '/f1-anatomy', label: t('nav.anatomy'), icon: Cpu },
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

              <div className="ml-4 flex items-center gap-3">
                <LanguageSelector />
                
                {user && isSubscribed && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-metrik-turquoise to-[#00d4bb] text-black text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-metrik-turquoise/20">
                    <Zap className="w-3.5 h-3.5" />
                    METRIK+
                  </span>
                )}

                {user ? (
                  <button
                    onClick={() => signOut()}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-semibold text-metrik-silver hover:text-white hover:bg-metrik-surface transition-all"
                  >
                    <LogIn size={18} />
                    <span>{t('nav.logout')}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => setAuthModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-semibold bg-metrik-turquoise/10 text-metrik-turquoise hover:bg-metrik-turquoise/20 transition-all"
                  >
                    <LogIn size={18} />
                    <span>{t('nav.login')}</span>
                  </button>
                )}
              </div>
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

            <div className="flex justify-center w-full max-w-xs mb-2">
              <LanguageSelector />
            </div>

            {user && isSubscribed && (
              <div className="flex justify-center w-full max-w-xs mb-2">
                <span className="px-4 py-2 bg-gradient-to-r from-metrik-turquoise to-[#00d4bb] text-black text-sm font-bold rounded-full flex items-center gap-2 shadow-lg shadow-metrik-turquoise/20">
                  <Zap className="w-4 h-4" />
                  METRIK+
                </span>
              </div>
            )}

            {user ? (
              <button
                onClick={() => {
                  signOut();
                  closeMobileMenu();
                }}
                className="flex items-center gap-3 px-6 py-4 rounded-xl font-rajdhani font-bold text-lg text-metrik-silver hover:text-white hover:bg-metrik-surface w-full max-w-xs transition-all"
              >
                <LogIn size={24} />
                <span>{t('nav.logout')}</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setAuthModalOpen(true);
                  closeMobileMenu();
                }}
                className="flex items-center gap-3 px-6 py-4 rounded-xl font-rajdhani font-bold text-lg bg-metrik-turquoise/10 text-metrik-turquoise border border-metrik-turquoise/30 w-full max-w-xs transition-all"
              >
                <LogIn size={24} />
                <span>{t('nav.login')}</span>
              </button>
            )}
          </div>
        </div>
      )}

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}

function App() {
  const { toasts, removeToast } = useToast();
  const [showMiniGame, setShowMiniGame] = useState(false);

  useKonamiCode(() => {
    setShowMiniGame(true);
  });

  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-metrik-black text-metrik-text flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/telemetry" element={<TelemetryPage />} />
              <Route path="/animation" element={<AnimationPage />} />
              <Route path="/pit-wall" element={<PitWallPage />} />
              <Route path="/championship" element={<ChampionshipPage />} />
              <Route path="/track-database" element={<TrackDatabasePage />} />
              <Route path="/f1-anatomy" element={<F1AnatomyPage />} />
              <Route path="/success" element={<SuccessPage />} />
              <Route path="/cancel" element={<CancelPage />} />
            </Routes>
          </main>
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

          {showMiniGame && (
            <F1CircuitGuesser onClose={() => setShowMiniGame(false)} />
          )}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;