import React from 'react';

const accent = '#f2e6d8';
const text = '#f2e6d8';
const text3 = 'rgba(242,230,216,0.32)';
const border = 'rgba(242,230,216,0.10)';

const h3: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 16,
  letterSpacing: '0.02em', textTransform: 'uppercase', color: text, margin: '0 0 8px',
};
const p: React.CSSProperties = { margin: '0 0 8px', fontSize: 13, lineHeight: 1.6 };
const ul: React.CSSProperties = { margin: '4px 0 0', paddingLeft: 20, fontSize: 13, lineHeight: 1.7 };
const strong: React.CSSProperties = { color: text, fontWeight: 700 };
const link: React.CSSProperties = { color: accent, textDecoration: 'underline' };
const section: React.CSSProperties = { marginBottom: 22 };

const TermsContent: React.FC = () => {
  return (
    <div>
      <p style={{ ...p, color: text3, fontSize: 'var(--fs-11)' }}>Last updated: November 1, 2026</p>

      <section style={section}>
        <h3 style={h3}>1. Acceptance of Terms</h3>
        <p style={p}>
          By accessing or using METRIK DELTA, you agree to be bound by these Terms. If you do not
          agree, please do not use the service.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>2. Use of Service</h3>
        <p style={p}>
          METRIK DELTA provides Formula 1 telemetry analysis and statistics visualization, free and
          without an account. You agree to use it only for lawful purposes.
        </p>
        <ul style={ul}>
          <li>No illegal activity</li>
          <li>No automated scraping or traffic that overloads the service</li>
          <li>No reselling or redistributing the data without permission from its sources (section 4)</li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h3}>3. Intellectual Property</h3>
        <p style={p}>
          The METRIK DELTA name, logo, mascot, videos, interface and original content are ours. The
          underlying F1 data is sourced from third parties (section 4) and remains subject to their own terms.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>4. Data Attribution</h3>
        <p style={p}>
          METRIK DELTA uses data from the FastF1 library, the OpenF1 API, and the Ergast/Jolpica API.
          Formula 1 trademarks, names, and official data belong to Formula One World Championship
          Limited. METRIK DELTA is an independent project and is not affiliated with, endorsed by, or
          sponsored by Formula 1.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>5. Limitation of Liability</h3>
        <p style={p}>
          METRIK DELTA is provided "as is," without warranty of any kind. Underlying F1 data can be
          incomplete, delayed, or occasionally incorrect at the source. We're not liable for damages
          arising from data inaccuracies, service interruptions, or reliance on the service for any
          purpose (including betting or wagering, which we do not endorse).
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>6. Changes to Terms</h3>
        <p style={p}>
          We may modify these Terms at any time. Material changes will be announced on the service.
          Continued use after a change means you accept the update.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>7. Governing Law</h3>
        <p style={p}>These Terms are governed by French law. Disputes fall under the jurisdiction of the French courts.</p>
      </section>

      <section style={{ ...section, marginBottom: 0 }}>
        <h3 style={h3}>8. Contact</h3>
        <div style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.15)', border: `1px solid ${border}`, borderRadius: 'var(--r)' }}>
          <p style={{ ...p, color: text, margin: 0 }}>
            <span style={strong}>Email:</span>{' '}
            <a href="mailto:contact@metrikdelta.com" style={link}>contact@metrikdelta.com</a>
          </p>
          <p style={{ ...p, color: text, margin: '4px 0 0' }}>
            <span style={strong}>Operator:</span> METRIK DELTA — individual auto-entrepreneur, France
          </p>
        </div>
      </section>
    </div>
  );
};

export default TermsContent;
