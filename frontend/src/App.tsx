import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider } from './contexts/AuthContext';
import GoogleAnalytics from './components/GoogleAnalytics';
import CookieConsent from './components/CookieConsent';
import { RESET_PASSWORD_PATH } from './lib/recovery';

const LandingPage    = lazy(() => import('./pages/LandingPage'));
const TelemetryPage  = lazy(() => import('./pages/TelemetryPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const SuccessPage    = lazy(() => import('./pages/SuccessPage'));
const CancelPage     = lazy(() => import('./pages/CancelPage'));
const AboutPage      = lazy(() => import('./pages/AboutPage'));
const MethodologyPage = lazy(() => import('./pages/MethodologyPage'));
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

const Spinner = () => (
  <div className="flex items-center justify-center h-screen" style={{ background: '#3d0c10' }}>
    <div className="w-6 h-6 rounded-full animate-spin" style={{ border: '1.5px solid rgba(242,230,216,0.15)', borderTopColor: 'rgba(242,230,216,0.7)' }} />
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <GoogleAnalytics />
        <CookieConsent />
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/"        element={<LandingPage />} />
            <Route path="/app"     element={<TelemetryPage />} />
            <Route path="/stats"   element={<StatisticsPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/cancel"  element={<CancelPage />} />
            <Route path="/about"   element={<AboutPage />} />
            <Route path="/methodology" element={<MethodologyPage />} />
            <Route path={RESET_PASSWORD_PATH} element={<ResetPasswordPage />} />
            <Route path="*"        element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
