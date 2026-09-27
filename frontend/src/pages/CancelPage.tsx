import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const P = {
  bg:        '#5e1018',
  text:      '#f2e6d8',
  textSub:   'rgba(242,230,216,0.55)',
  textGhost: 'rgba(242,230,216,0.28)',
  border:    'rgba(242,230,216,0.18)',
};

export default function CancelPage() {
  const navigate = useNavigate();

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
          Payment not completed
        </span>

        <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.06em', textTransform: 'uppercase', color: P.text, margin: '16px 0 0', lineHeight: 1 }}>
          No charge made.
        </h1>

        <p style={{ fontWeight: 400, fontSize: 'clamp(13px, 1.2vw, 15px)', letterSpacing: '0.04em', color: P.textSub, margin: '16px 0 0', maxWidth: 320, lineHeight: 1.6 }}>
          Your payment was cancelled. You can continue with free access or subscribe at any time.
        </p>

        {/* Divider */}
        <div style={{ width: 1, height: 40, background: `linear-gradient(to bottom, transparent, ${P.textGhost}, transparent)`, margin: '36px 0' }} />

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 10,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: P.textSub, background: 'transparent',
              border: `1px solid ${P.border}`,
              padding: '12px 36px', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.text; e.currentTarget.style.color = P.text; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.color = P.textSub; }}
          >
            Back to home
          </button>

          <button
            onClick={() => navigate('/app')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontWeight: 400, fontSize: 10,
              letterSpacing: '0.26em', textTransform: 'uppercase',
              color: P.text, background: 'transparent',
              border: `1px solid ${P.text}`,
              padding: '12px 36px', cursor: 'pointer',
              transition: 'border-color 0.2s, color 0.2s, background 0.2s', outline: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(242,230,216,0.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
          >
            Continue free
          </button>
        </div>

        {/* Footer */}
        <span style={{ position: 'absolute', bottom: 28, fontFamily: "'JetBrains Mono', monospace", fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: P.textGhost }}>
          Questions? @metrikdelta on X
        </span>
      </div>
    </>
  );
}
