import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { Home, Activity, Trophy, Map, Target, Radio, Menu, X, Cpu, LogIn, Zap, BarChart3, User, CreditCard, LogOut, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect, lazy, Suspense } from 'react';
import { useToast } from './hooks/useToast';
import Toast from './components/Toast';
import DonkeyLogo from './components/DonkeyLogo';
import { useKonamiCode } from './hooks/useKonamiCode';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useSubscription } from './hooks/useSubscription';
import { getBackendUrl } from './config';
import GoogleAnalytics from './components/GoogleAnalytics';

// Pages chargées en lazy — le bundle Three.js/D3/Recharts ne se télécharge
// que quand l'utilisateur navigue vers la page concernée.
const HomePage = lazy(() => import('./pages/HomePage'));
const TelemetryPage = lazy(() => import('./pages/TelemetryPage'));
const LiveTimingPage = lazy(() => import('./pages/LiveTimingPage'));
const PitWallPage = lazy(() => import('./pages/PitWallPage'));
const ChampionshipPage = lazy(() => import('./pages/ChampionshipPage'));
const TrackDatabasePage = lazy(() => import('./pages/TrackDatabasePage'));
const F1AnatomyPage = lazy(() => import('./pages/F1AnatomyPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const SuccessPage = lazy(() => import('./pages/SuccessPage'));
const CancelPage = lazy(() => import('./pages/CancelPage'));
const F1CircuitGuesser = lazy(() => import('./components/F1CircuitGuesser'));

function Navigation() {
  const location = useLocation();
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, signOut } = useAuth();
  const { canMakeRequest, incrementRequest, isPremium } = useSubscription();

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: t('nav.home'), icon: Home },
    { path: '/telemetry', label: t('nav.telemetry'), icon: Activity },
    { path: '/live-timing', label: 'F1 Live', icon: Radio },
    { path: '/championship', label: t('nav.championship'), icon: Trophy },
    { path: '/statistics', label: 'Statistics', icon: BarChart3 },
    { path: '/track-database', label: t('nav.trackDatabase'), icon: Map },
    { path: '/pit-wall', label: t('nav.pitWall'), icon: Target },
    { path: '/f1-anatomy', label: t('nav.anatomy'), icon: Cpu },
  ];

  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Customer Portal redirect
  const handleManageSubscription = async () => {
    if (!user) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        alert('Session expired, please log in again');
        return;
      }
      const response = await fetch(`${getBackendUrl()}/api/customer-portal/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();

      if (data.portal_url) {
        window.location.href = data.portal_url;
      } else {
        alert('Unable to open subscription portal');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      alert('Error opening subscription portal');
    }
  };

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
                  <span className="text-metrik-turquoise ml-1">DELTA</span>
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
                {user && isPremium && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-metrik-turquoise to-[#00d4bb] text-black text-xs font-bold rounded-full flex items-center gap-1.5 shadow-lg shadow-metrik-turquoise/20">
                    <Zap className="w-3.5 h-3.5" />
                    PRO
                  </span>
                )}

                {user ? (
                  // 🔥 PROFILE DROPDOWN
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg font-rajdhani font-semibold text-metrik-silver hover:text-white hover:bg-metrik-surface transition-all"
                    >
                      <User size={18} />
                      <span>Profile</span>
                      <ChevronDown size={16} className={`transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {profileDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-64 backdrop-blur-xl bg-metrik-card/95 border border-metrik-turquoise/30 rounded-lg shadow-lg shadow-metrik-turquoise/20 overflow-hidden">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-metrik-turquoise/20">
                          <p className="text-xs text-metrik-silver mb-1">Signed in as</p>
                          <p className="text-sm font-rajdhani font-bold text-white truncate">
                            {user.email}
                          </p>
                        </div>

                        {/* Menu Items */}
                        <div className="py-2">
                          {isPremium && (
                            <button
                              onClick={() => {
                                handleManageSubscription();
                                setProfileDropdownOpen(false);
                              }}
                              className="w-full px-4 py-2.5 flex items-center gap-3 text-left font-rajdhani font-semibold text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10 transition-all"
                            >
                              <CreditCard size={18} />
                              <span>Manage Subscription</span>
                            </button>
                          )}

                          <button
                            onClick={() => {
                              signOut();
                              setProfileDropdownOpen(false);
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 text-left font-rajdhani font-semibold text-metrik-silver hover:text-white hover:bg-metrik-turquoise/10 transition-all"
                          >
                            <LogOut size={18} />
                            <span>Logout</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

            {user && isPremium && (
              <div className="flex justify-center w-full max-w-xs mb-2">
                <span className="px-4 py-2 bg-gradient-to-r from-metrik-turquoise to-[#00d4bb] text-black text-sm font-bold rounded-full flex items-center gap-2 shadow-lg shadow-metrik-turquoise/20">
                  <Zap className="w-4 h-4" />
                  PRO
                </span>
              </div>
            )}

            {user ? (
              <>
                {isPremium && (
                  <button
                    onClick={() => {
                      handleManageSubscription();
                      closeMobileMenu();
                    }}
                    className="flex items-center gap-3 px-6 py-4 rounded-xl font-rajdhani font-bold text-lg text-metrik-silver hover:text-white hover:bg-metrik-surface w-full max-w-xs transition-all"
                  >
                    <CreditCard size={24} />
                    <span>Manage Subscription</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    signOut();
                    closeMobileMenu();
                  }}
                  className="flex items-center gap-3 px-6 py-4 rounded-xl font-rajdhani font-bold text-lg text-metrik-silver hover:text-white hover:bg-metrik-surface w-full max-w-xs transition-all"
                >
                  <LogOut size={24} />
                  <span>{t('nav.logout')}</span>
                </button>
              </>
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
        <GoogleAnalytics />
        
        <div className="min-h-screen bg-metrik-black text-metrik-text flex flex-col">
          <Navigation />
          <main className="flex-1">
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-10 h-10 border-4 border-metrik-turquoise/30 border-t-metrik-turquoise rounded-full animate-spin" />
              </div>
            }>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/telemetry" element={<TelemetryPage />} />
                <Route path="/live-timing" element={<LiveTimingPage />} />
                <Route path="/pit-wall" element={<PitWallPage />} />
                <Route path="/championship" element={<ChampionshipPage />} />
                <Route path="/track-database" element={<TrackDatabasePage />} />
                <Route path="/f1-anatomy" element={<F1AnatomyPage />} />
                <Route path="/statistics" element={<StatisticsPage />} />
                <Route path="/success" element={<SuccessPage />} />
                <Route path="/cancel" element={<CancelPage />} />
              </Routes>
            </Suspense>
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
            <Suspense fallback={null}>
              <F1CircuitGuesser onClose={() => setShowMiniGame(false)} />
            </Suspense>
          )}
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;