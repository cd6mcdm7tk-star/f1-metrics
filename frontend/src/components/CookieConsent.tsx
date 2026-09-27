import { useEffect, useState } from 'react';
import { CONSENT_KEY, CONSENT_EVENT } from './GoogleAnalytics';

// Same self-contained dark "chrome" palette as AuthModal/Modal/UpgradeModal.
const P = {
  panel: '#57121c', accent: '#f2e6d8', text: '#f2e6d8',
  text2: 'rgba(242,230,216,0.62)',
  border: 'rgba(242,230,216,0.14)', borderHi: 'rgba(242,230,216,0.24)',
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let existing: string | null = null;
    try {
      existing = localStorage.getItem(CONSENT_KEY);
    } catch {
      // localStorage unavailable — don't show a banner that can't persist a choice
    }
    if (!existing) setVisible(true);
  }, []);

  const choose = (value: 'accepted' | 'declined') => {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch {
      // ignore — worst case the banner reappears next visit
    }
    window.dispatchEvent(new Event(CONSENT_EVENT));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, zIndex: 100,
      display: 'flex', justifyContent: 'center',
    }}>
      <div style={{
        width: '100%', maxWidth: 560,
        background: P.panel, border: `1px solid ${P.borderHi}`, borderRadius: 'var(--r2)',
        boxShadow: '0 16px 40px rgba(0,0,0,0.45)',
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <p style={{
          margin: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 13,
          lineHeight: 1.6, color: P.text2,
        }}>
          We use essential cookies to run METRIK DELTA, and — only with your consent — analytics cookies
          to understand how the site is used. You can change your mind at any time.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <button
            onClick={() => choose('declined')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: P.text2, background: 'transparent', border: `1px solid ${P.border}`,
              borderRadius: 'var(--r)', padding: '9px 18px', cursor: 'pointer',
            }}
          >
            Decline
          </button>
          <button
            onClick={() => choose('accepted')}
            style={{
              fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
              letterSpacing: '0.10em', textTransform: 'uppercase',
              color: P.panel, background: P.accent, border: `1px solid ${P.accent}`,
              borderRadius: 'var(--r)', padding: '9px 18px', cursor: 'pointer', fontWeight: 700,
            }}
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
