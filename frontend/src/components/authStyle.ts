import type { CSSProperties } from 'react'

// Cream `.data-zone` palette (index.css), matching UpgradeModal — hardcoded
// rather than read via CSS vars so the modal looks the same wherever it opens.
// `bg` is the text colour on accent buttons. #b42318 errors: 5.3:1 on `panel`.
export const P = {
  bg: '#f2e6d8', surface: '#e5dcc9', panel: '#ede5d5', input: '#f6f1e8',
  accent: '#5e1018', text: '#1c0407',
  text2: 'rgba(28,4,7,0.62)', text3: 'rgba(28,4,7,0.58)',
  border: 'rgba(94,16,24,0.22)', borderHi: 'rgba(94,16,24,0.48)',
  error: '#b42318', errorBg: 'rgba(180,35,24,0.07)', errorBorder: 'rgba(180,35,24,0.35)',
}

// ── Shared style fragments (mirrors SessionExplorer's SelectField / label
//    conventions: JetBrains Mono, uppercase, letter-spaced) ──────────────────

export const labelStyle: CSSProperties = {
  display: 'block', marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: P.text3,
}

export const inputStyle: CSSProperties = {
  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
  background: P.input,
  border: `1px solid ${P.borderHi}`,
  borderRadius: 'var(--r)',
  color: P.text,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  outline: 'none',
}

export const headingStyle: CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 24,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: P.text, margin: '0 0 6px', lineHeight: 1.1,
}

export const subStyle: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.02em',
  color: P.text2, margin: '0 0 22px', lineHeight: 1.5,
}

export const primaryButtonStyle: CSSProperties = {
  width: '100%', padding: '12px 0',
  background: P.accent, color: P.bg,
  border: 'none', borderRadius: 'var(--r)',
  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  cursor: 'pointer', transition: 'opacity 0.15s',
}

export const googleButtonStyle: CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '11px 0', background: '#ffffff', color: '#3c4043',
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--r)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  cursor: 'pointer', transition: 'opacity 0.15s',
}

export const linkStyle: CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: P.text2,
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  transition: 'color 0.15s',
}
