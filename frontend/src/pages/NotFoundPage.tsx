import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { NOT_FOUND } from '../seo/pages';

const P = {
  bg:        '#5e1018',
  text:      '#f2e6d8',
  textSub:   'rgba(242,230,216,0.55)',
  border:    'rgba(242,230,216,0.18)',
};

const button = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-10)', letterSpacing: '0.26em', textTransform: 'uppercase' as const,
  textDecoration: 'none', padding: '12px 36px', border: `1px solid ${P.border}`, color: P.textSub,
};

/** Any address the site doesn't have: served with a 404 status (vercel.json) */
export default function NotFoundPage() {
  return (
    <>
      <SEO page={NOT_FOUND} />
      <main style={{
        height: '100dvh', background: P.bg, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px',
        fontFamily: "'Rajdhani', sans-serif",
      }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'var(--fs-8)', letterSpacing: '0.30em', textTransform: 'uppercase', color: P.textSub }}>
          Error 404
        </span>
        <h1 style={{ fontWeight: 700, fontSize: 'clamp(28px, 4vw, 48px)', letterSpacing: '0.06em', textTransform: 'uppercase', color: P.text, margin: '16px 0 0', lineHeight: 1 }}>
          Page not found.
        </h1>
        <p style={{ fontSize: 'clamp(13px, 1.2vw, 15px)', letterSpacing: '0.04em', color: P.textSub, margin: '16px 0 36px', maxWidth: 320, lineHeight: 1.6 }}>
          This address doesn't exist. The telemetry and the statistics are one click away.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/" style={button}>Home</Link>
          <Link to="/app" style={{ ...button, color: P.text, borderColor: P.text }}>Telemetry</Link>
          <Link to="/stats" style={button}>Statistics</Link>
        </div>
      </main>
    </>
  );
}
