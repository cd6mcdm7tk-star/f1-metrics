import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

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
  const [loading, setLoading] = useState(true);
  const sessionId = searchParams.get('session_id');

  useEffect(() => {
    const verify = async () => {
      if (sessionId) await new Promise(r => setTimeout(r, 3000));
      setLoading(false);
    };
    verify();
  }, [sessionId]);

  if (loading) {
    return (
      <div style={{ height: '100dvh', background: P.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20 }}>
        <div style={{ width: 24, height: 24, border: `1.5px solid ${P.textGhost}`, borderTopColor: P.text, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.24em', textTransform: 'uppercase', color: P.textSub }}>
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
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.30em', textTransform: 'uppercase', color: P.textSub }}>
          Subscription activated
        </span>

        <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.06em', textTransform: 'uppercase', color: P.text, margin: '16px 0 0', lineHeight: 1 }}>
          Welcome to Pro.
        </h1>

        <p style={{ fontWeight: 400, fontSize: 'clamp(13px, 1.2vw, 15px)', letterSpacing: '0.04em', color: P.textSub, margin: '16px 0 0', maxWidth: 340, lineHeight: 1.6 }}>
          Full telemetry access across the entire F1 calendar — every driver, every lap, every session.
        </p>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${P.textGhost}, transparent)`, margin: '36px 0' }} />

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 48, textAlign: 'left' }}>
          {[
            '2026 season — real-time data',
            'Full telemetry, lap by lap',
            'Historical access 1950–2025',
            'Unlimited comparisons',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 3, height: 3, borderRadius: '50%', background: P.textSub, flexShrink: 0 }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.10em', color: P.textSub }}>
                {f}
              </span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/app')}
          style={{
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 10,
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
        <span style={{ position: 'absolute', bottom: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textGhost }}>
          A confirmation has been sent to your email
        </span>
      </div>
    </>
  );
}
