import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../contexts/AuthContext';
import { CURRENT_SEASON_YEAR } from '../hooks/useSubscription';
import { STATISTICS_SINCE, TELEMETRY_SINCE } from '../seo/pages';

/** How often, and how many times, the page checks the subscription is active (30 s in all) */
const ACTIVATION_INTERVAL_MS = 1500;
const ACTIVATION_CHECKS = 20;

const P = {
  bg:        '#5e1018',
  text:      '#f2e6d8',
  textSub:   'rgba(242,230,216,0.55)',
  textGhost: 'rgba(242,230,216,0.28)',
  border:    'rgba(242,230,216,0.18)',
};

export default function SuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session_id');
  const { loading: authLoading, refreshPremium } = useAuth();
  // Stripe tells the backend about the payment a few seconds after it redirects here
  const [activation, setActivation] = useState<'checking' | 'active' | 'late'>('checking');

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    const check = async () => {
      for (let attempt = 0; attempt < ACTIVATION_CHECKS; attempt++) {
        if (await refreshPremium()) {
          if (!cancelled) setActivation('active');
          return;
        }
        await new Promise(r => setTimeout(r, ACTIVATION_INTERVAL_MS));
        if (cancelled) return;
      }
      if (!cancelled) setActivation('late');
    };
    check();
    return () => { cancelled = true; };
  }, [authLoading, refreshPremium, sessionId]);

  if (activation === 'checking') {
    return (
      <div style={{ height: '100dvh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ width: 24, height: 24, border: `1.5px solid ${P.textGhost}`, borderTopColor: P.text, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-9)', letterSpacing: '0.24em', textTransform: 'uppercase', color: P.textSub }}>
          Activating subscription…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <>
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div style={{
        height: '100dvh', background: P.bg,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Rajdhani', sans-serif",
        textAlign: 'center', padding: '40px 24px',
        position: 'relative',
      }}>

        {/* Top wordmark */}
        <div style={{ position: 'absolute', top: 28, left: 36 }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: '0.22em', textTransform: 'uppercase', color: P.text }}>
            METRIK DELTA
          </span>
        </div>

        {/* Content */}
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-8)', letterSpacing: '0.30em', textTransform: 'uppercase', color: P.textSub }}>
          Subscription activated
        </span>

        <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.06em', textTransform: 'uppercase', color: P.text, margin: '16px 0 0', lineHeight: 1 }}>
          Welcome to Pro.
        </h1>

        <p style={{ fontWeight: 400, fontSize: 'clamp(13px, 1.2vw, 15px)', letterSpacing: '0.04em', color: P.textSub, margin: '16px 0 0', maxWidth: 340, lineHeight: 1.6 }}>
          Full telemetry access across the entire F1 calendar — every driver, every lap, every session.
        </p>

        {activation === 'late' && (
          <p style={{ fontWeight: 500, fontSize: 'clamp(12px, 1.1vw, 14px)', letterSpacing: '0.04em', color: P.text, margin: '14px 0 0', maxWidth: 340, lineHeight: 1.6 }}>
            Your payment went through. Pro can take a minute to switch on: refresh this page shortly,
            or write to contact@metrikdelta.com if it doesn't.
          </p>
        )}

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${P.textGhost}, transparent)`, margin: '36px 0' }} />

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 48, textAlign: 'left' }}>
          {[
            `The ${CURRENT_SEASON_YEAR} season, every session`,
            'Full telemetry, lap by lap',
            `Every past season: telemetry since ${TELEMETRY_SINCE}, statistics since ${STATISTICS_SINCE}`,
            'HD chart export',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: P.textSub, flexShrink: 0 }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-10)', letterSpacing: '0.10em', color: P.textSub }}>
                {f}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/app')}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 'var(--fs-10)',
            letterSpacing: '0.26em', textTransform: 'uppercase',
            color: P.textSub, background: 'transparent',
            border: `1px solid ${P.border}`,
            padding: '12px 44px', cursor: 'pointer',
            transition: 'border-color 0.2s, color 0.2s', outline: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = P.text; e.currentTarget.style.color = P.text; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.textSub; }}
        >
          Enter
        </button>

        {/* Footer */}
        <span style={{ position: 'absolute', bottom: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-8)', letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textGhost }}>
          A confirmation has been sent to your email
        </span>
      </div>
    </>
  );
}
