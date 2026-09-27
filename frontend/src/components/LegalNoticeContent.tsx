import React from 'react';

const accent = '#f2e6d8';
const text = '#f2e6d8';
const text3 = 'rgba(242,230,216,0.32)';
const link: React.CSSProperties = { color: accent, textDecoration: 'underline' };

const h3: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16,
  letterSpacing: '0.02em', textTransform: 'uppercase', color: text, margin: '0 0 8px',
};
const p: React.CSSProperties = { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6 };
const strong: React.CSSProperties = { color: text, fontWeight: 700 };
const section: React.CSSProperties = { marginBottom: 22 };
// Flags a field that still needs a real value before this page can be
// considered complete — see TODO comment below.
const pending: React.CSSProperties = { color: '#ff6b6b', fontStyle: 'italic' };

// TODO: replace the two `pending` values below (SIRET + address) once
// provided — this page is not legally complete without them for a site
// with commercial activity (paid subscriptions via Stripe).
const LegalNoticeContent: React.FC = () => {
  return (
    <div>
      <p style={{ ...p, color: text3, fontSize: 11 }}>Last updated: September 27, 2026</p>

      <section style={section}>
        <h3 style={h3}>Site Publisher</h3>
        <p style={p}>
          <span style={strong}>METRIK DELTA</span> — sole proprietorship (auto-entrepreneur), France.
        </p>
        <p style={p}>SIRET: <span style={pending}>to be completed</span></p>
        <p style={p}>Address: <span style={pending}>to be completed</span></p>
        <p style={p}>
          Email: <a href="mailto:contact@metrikdelta.com" style={link}>contact@metrikdelta.com</a>
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>Publication Director</h3>
        <p style={p}>The individual operator of METRIK DELTA, in their capacity as auto-entrepreneur.</p>
      </section>

      <section style={section}>
        <h3 style={h3}>Hosting</h3>
        <p style={p}>
          <span style={strong}>Frontend:</span> Vercel Inc. — see{' '}
          <a href="https://vercel.com/legal" target="_blank" rel="noopener noreferrer" style={link}>vercel.com/legal</a>
        </p>
        <p style={p}>
          <span style={strong}>Backend / API:</span> Railway Corporation — see{' '}
          <a href="https://railway.com/legal" target="_blank" rel="noopener noreferrer" style={link}>railway.com/legal</a>
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>Intellectual Property</h3>
        <p style={p}>
          The METRIK DELTA name, interface, and original content on this site are the property of the
          publisher. The underlying Formula 1 data comes from third-party sources (FastF1, OpenF1,
          Ergast/Jolpica) and remains subject to their own terms — see the Terms of Service, section 7.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>Personal Data</h3>
        <p style={p}>
          The processing of personal data is detailed in our Privacy Policy, accessible from the same
          menu.
        </p>
      </section>

      <section style={{ ...section, marginBottom: 0 }}>
        <h3 style={h3}>Governing Law</h3>
        <p style={p}>This site is governed by French law. In the event of a dispute, the French courts have exclusive jurisdiction.</p>
      </section>
    </div>
  );
};

export default LegalNoticeContent;
