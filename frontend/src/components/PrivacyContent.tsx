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
      <p style={{ ...p, color: text3, fontSize: 11 }}>Last updated: September 27, 2026</p>

      <section style={section}>
        <h3 style={h3}>1. Information We Collect</h3>
        <p style={p}>We collect the following types of information:</p>
        <p style={{ ...p, color: text }}><span style={strong}>Information you provide:</span></p>
        <ul style={ul}>
          <li>Email address (account creation and authentication, via Supabase)</li>
          <li>Payment information (processed directly by Stripe — we never see your card details)</li>
        </ul>
        <p style={{ ...p, color: text, marginTop: 10 }}><span style={strong}>Automatically collected:</span></p>
        <ul style={ul}>
          <li>Usage data (pages visited, features used)</li>
          <li>Device information (browser type, operating system)</li>
          <li>IP address and approximate location</li>
          <li>Cookies — see section 6, gated behind the consent banner</li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h3}>2. How We Use Your Information</h3>
        <ul style={ul}>
          <li>Provide, maintain, and improve METRIK DELTA</li>
          <li>Process transactions and manage subscriptions</li>
          <li>Send service-related emails (account, billing)</li>
          <li>Analyze usage patterns to improve the platform (only with cookie consent)</li>
          <li>Detect and prevent fraud or abuse</li>
          <li>Respond to support requests</li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h3}>3. Data Storage and Security</h3>
        <p style={p}>
          Your data is stored using Supabase (PostgreSQL) with encryption in transit (HTTPS/TLS)
          and at rest, secure password hashing, and access controls.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>4. Third-Party Services</h3>
        <p style={p}>We use the following sub-processors:</p>
        <ul style={ul}>
          <li><span style={strong}>Stripe</span> — payment processing and subscription management (PCI DSS compliant)</li>
          <li><span style={strong}>Supabase</span> — database hosting and user authentication</li>
          <li><span style={strong}>Vercel</span> — frontend hosting and CDN</li>
          <li><span style={strong}>Railway</span> — backend API hosting</li>
          <li><span style={strong}>Cloudflare</span> — DNS and DDoS protection</li>
          <li><span style={strong}>Google Analytics</span> — usage analytics, only loaded after you accept cookies (section 6)</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>
          These providers may process data outside the EU (notably the US). Where that's the case, we
          rely on their Standard Contractual Clauses / equivalent safeguards.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>5. Your Rights Under GDPR</h3>
        <p style={p}>As a France-based service, we comply with GDPR. You have the right to:</p>
        <ul style={ul}>
          <li><span style={strong}>Access</span> — request a copy of your personal data</li>
          <li><span style={strong}>Rectification</span> — correct inaccurate data</li>
          <li><span style={strong}>Erasure</span> — request deletion ("right to be forgotten")</li>
          <li><span style={strong}>Restriction</span> — limit how we process your data</li>
          <li><span style={strong}>Portability</span> — receive your data in a structured format</li>
          <li><span style={strong}>Objection</span> — oppose certain processing</li>
          <li><span style={strong}>Withdraw consent</span> — at any time, for anything based on consent (e.g. analytics cookies)</li>
        </ul>
        <p style={{ ...p, marginTop: 10 }}>
          To exercise these rights, contact us at{' '}
          <a href="mailto:contact@metrikdelta.com" style={link}>contact@metrikdelta.com</a>.
          You also have the right to lodge a complaint with the CNIL (cnil.fr).
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>6. Cookies and Tracking</h3>
        <p style={p}>We use two categories of cookies:</p>
        <ul style={ul}>
          <li><span style={strong}>Essential cookies</span> — authentication and security. Always active; the service can't work without them, so they don't require consent.</li>
          <li><span style={strong}>Analytics cookies (Google Analytics)</span> — only set after you accept them in the cookie banner shown on your first visit. You can withdraw consent at any time from the banner.</li>
        </ul>
      </section>

      <section style={section}>
        <h3 style={h3}>7. Data Retention</h3>
        <p style={p}>
          We keep personal data only as long as necessary for the purposes above, or as required by law.
          Account data is deleted within 30 days of account closure, except where retention is legally required
          (e.g. invoicing records).
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>8. Minors</h3>
        <p style={p}>
          METRIK DELTA is not directed at children. In line with French law, we do not knowingly collect
          personal data from users under 15 without parental consent. Contact us if you believe a minor has
          provided us with personal data.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>9. International Data Transfers</h3>
        <p style={p}>
          Some sub-processors (Vercel, Railway, Google) may process data outside the EU/EEA. We rely on
          Standard Contractual Clauses or equivalent safeguards where this occurs.
        </p>
      </section>

      <section style={section}>
        <h3 style={h3}>10. Changes to This Policy</h3>
        <p style={p}>
          We may update this policy from time to time. Material changes will be notified via email or a
          notice on the service. The date above reflects the last update.
        </p>
      </section>

      <section style={{ ...section, marginBottom: 0 }}>
        <h3 style={h3}>11. Contact</h3>
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
