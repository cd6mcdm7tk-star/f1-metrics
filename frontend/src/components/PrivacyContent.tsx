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

const PrivacyContent: React.FC = () => {
  return (
    <div>
      <p style={{ ...p, color: text3, fontSize: 'var(--fs-11)' }}>Last updated: November 1, 2026</p>

      <section style={section}>
        <h3 style={h3}>1. Information We Collect</h3>
        <p style={p}>
          METRIK DELTA has no accounts and asks you for nothing. What is collected comes from your
          visit itself:
        </p>
        <ul style={ul}>
          <li>Pages visited, with the address stripped of everything but campaign tags (Vercel and Cloudflare Web Analytics, without cookies)</li>
          <li>Device information (browser type, operating system) and approximate country</li>
          <li>IP address, in our hosting providers' technical logs</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>
          The site also keeps data caches and the last page you viewed in your browser's local storage.
          They stay on your device and are never sent to us.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>2. How We Use It</h3>
        <ul style={ul}>
          <li>Run, secure and improve METRIK DELTA</li>
          <li>Count visits and see which features are used</li>
          <li>Detect and prevent abuse</li>
          <li>Answer you if you write to us</li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h3}>3. Third-Party Services</h3>
        <p style={p}>We use the following sub-processors:</p>
        <ul style={ul}>
          <li><span style={strong}>Vercel</span> — frontend hosting, CDN and cookieless analytics</li>
          <li><span style={strong}>Railway</span> — backend API hosting</li>
          <li><span style={strong}>Cloudflare</span> — DNS, DDoS protection and cookieless analytics</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>
          These providers may process data outside the EU (notably the US). Where that's the case, we
          rely on their Standard Contractual Clauses / equivalent safeguards.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>4. Your Rights Under GDPR</h3>
        <p style={p}>As a France-based service, we comply with GDPR. You have the right to:</p>
        <ul style={ul}>
          <li><span style={strong}>Access</span> — request a copy of your personal data</li>
          <li><span style={strong}>Erasure</span> — request deletion ("right to be forgotten")</li>
          <li><span style={strong}>Objection</span> — oppose certain processing</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>
          To exercise these rights, contact us at{' '}
          <a href="mailto:contact@metrikdelta.com" style={link}>contact@metrikdelta.com</a>.
          You also have the right to lodge a complaint with the CNIL (cnil.fr).
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>5. Cookies</h3>
        <p style={p}>
          METRIK DELTA sets no cookies: its analytics count visits without them, so there is nothing to
          consent to.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>6. Data Retention</h3>
        <p style={p}>
          We keep no personal data ourselves. Technical logs and analytics are kept by the providers above
          for their standard retention periods.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>7. Changes to This Policy</h3>
        <p style={p}>
          We may update this policy from time to time. Material changes will be announced on the service.
          The date above reflects the last update.
        </p>
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

export default PrivacyContent;
