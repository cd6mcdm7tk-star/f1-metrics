import { useState } from 'react'
import { X, Mail, CheckCircle, Loader2 } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

// Cream `.data-zone` palette (index.css), matching UpgradeModal — hardcoded
// rather than read via CSS vars so the modal looks the same wherever it opens.
// `bg` is the text colour on accent buttons. #b42318 errors: 5.3:1 on `panel`.
const P = {
  bg: '#f2e6d8', surface: '#e5dcc9', panel: '#ede5d5', input: '#f6f1e8',
  accent: '#5e1018', text: '#1c0407',
  text2: 'rgba(28,4,7,0.62)', text3: 'rgba(28,4,7,0.58)',
  border: 'rgba(94,16,24,0.22)', borderHi: 'rgba(94,16,24,0.48)',
  error: '#b42318', errorBg: 'rgba(180,35,24,0.07)', errorBorder: 'rgba(180,35,24,0.35)',
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

// ── Shared style fragments (mirrors SessionExplorer's SelectField / label
//    conventions: JetBrains Mono, uppercase, letter-spaced) ──────────────────

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
  color: P.text3,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', boxSizing: 'border-box',
  background: P.input,
  border: `1px solid ${P.borderHi}`,
  borderRadius: 'var(--r)',
  color: P.text,
  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
  outline: 'none',
}

const headingStyle: React.CSSProperties = {
  fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 24,
  letterSpacing: '0.04em', textTransform: 'uppercase',
  color: P.text, margin: '0 0 6px', lineHeight: 1.1,
}

const subStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, letterSpacing: '0.02em',
  color: P.text2, margin: '0 0 22px', lineHeight: 1.5,
}

const primaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: '12px 0',
  background: P.accent, color: P.bg,
  border: 'none', borderRadius: 'var(--r)',
  fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 11,
  letterSpacing: '0.14em', textTransform: 'uppercase',
  cursor: 'pointer', transition: 'opacity 0.15s',
}

const googleButtonStyle: React.CSSProperties = {
  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  padding: '11px 0', background: '#ffffff', color: '#3c4043',
  border: '1px solid rgba(0,0,0,0.12)', borderRadius: 'var(--r)',
  fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
  cursor: 'pointer', transition: 'opacity 0.15s',
}

const linkStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: P.text2,
  background: 'none', border: 'none', cursor: 'pointer', padding: 0,
  transition: 'color 0.15s',
}

function ErrorBanner({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: P.errorBg, border: `1px solid ${P.errorBorder}`,
      borderRadius: 'var(--r)', color: P.error,
      fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, lineHeight: 1.4,
      padding: '10px 12px', marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
      <div style={{ flex: 1, height: 1, background: P.border }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 8,
        letterSpacing: '0.16em', textTransform: 'uppercase', color: P.text3,
        whiteSpace: 'nowrap',
      }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: P.border }} />
    </div>
  )
}

function Card({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(28,4,7,0.55)', backdropFilter: 'blur(4px)',
    }}>
      <div role="dialog" aria-modal="true" style={{
        position: 'relative', width: '100%', maxWidth: 420,
        background: P.panel, color: P.text,
        border: `1px solid ${P.borderHi}`, borderTop: `3px solid ${P.accent}`, borderRadius: 'var(--r2)',
        boxShadow: '0 24px 60px rgba(28,4,7,0.35)',
        padding: '32px 28px 28px',
      }}>
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 16, right: 16,
            color: P.text3, background: 'transparent', border: 'none',
            cursor: 'pointer', padding: 4, lineHeight: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = P.text }}
          onMouseLeave={e => { e.currentTarget.style.color = P.text3 }}
        >
          <X size={18} />
        </button>
        {children}
      </div>
    </div>
  )
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | null>(null)
  const [error, setError] = useState('')
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signUp, signIn } = useAuth()

  if (!isOpen) return null

  const handleGoogleLogin = async () => {
    setOauthLoading('google')
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) { setError(error.message); setOauthLoading(null) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isLogin) {
      const { error } = await signIn(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else { onClose(); setEmail(''); setPassword(''); setLoading(false) }
    } else {
      const { data, error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false) }
      else if (data.session) { onClose(); setEmail(''); setPassword(''); setLoading(false) }
      else { setShowEmailConfirmation(true); setLoading(false) }
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email address'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (error) { setError(error.message) } else { setResetSent(true) }
  }

  // ── Forgot password screen ─────────────────────────────────────────────────
  if (showForgotPassword) {
    return (
      <Card onClose={() => { setShowForgotPassword(false); setResetSent(false); setError('') }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: P.surface, border: `1px solid ${P.borderHi}`,
          }}>
            <Mail size={26} color={P.accent} />
          </div>
        </div>
        {resetSent ? (
          <>
            <h2 style={{ ...headingStyle, textAlign: 'center' }}>Check your email</h2>
            <p style={{ ...subStyle, textAlign: 'center' }}>
              We sent a reset link to <span style={{ color: P.accent, fontWeight: 700 }}>{email}</span>.
            </p>
            <button
              onClick={() => { setShowForgotPassword(false); setResetSent(false) }}
              style={primaryButtonStyle}
            >
              Back to login
            </button>
          </>
        ) : (
          <>
            <h2 style={{ ...headingStyle, textAlign: 'center' }}>Reset password</h2>
            <p style={{ ...subStyle, textAlign: 'center' }}>
              Enter your email and we'll send you a reset link.
            </p>
            <form onSubmit={handleForgotPassword}>
              {error && <ErrorBanner>{error}</ErrorBanner>}
              <div style={{ marginBottom: 18 }}>
                <span style={labelStyle}>Email</span>
                <input
                  type="email" required value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  style={inputStyle}
                />
              </div>
              <button type="submit" disabled={loading} style={{ ...primaryButtonStyle, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </Card>
    )
  }

  // ── Email confirmation screen ──────────────────────────────────────────────
  if (showEmailConfirmation) {
    return (
      <Card onClose={() => { setShowEmailConfirmation(false); onClose(); setEmail(''); setPassword('') }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: P.surface, border: `1px solid ${P.borderHi}`,
          }}>
            <Mail size={26} color={P.accent} />
          </div>
        </div>
        <h2 style={{ ...headingStyle, textAlign: 'center' }}>Check your email</h2>
        <p style={{ ...subStyle, marginBottom: 12, textAlign: 'center' }}>
          We've sent a confirmation email to:
        </p>
        <div style={{
          background: P.bg, border: `1px solid ${P.border}`, borderRadius: 'var(--r)',
          padding: '10px 14px', marginBottom: 18, textAlign: 'center',
        }}>
          <p style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 700,
            color: P.accent, margin: 0, wordBreak: 'break-all',
          }}>
            {email}
          </p>
        </div>
        <p style={{ ...subStyle, textAlign: 'center' }}>
          Click the confirmation link to activate your account and start exploring METRIK DELTA.
        </p>
        <div style={{
          background: P.surface, border: `1px solid ${P.border}`, borderRadius: 'var(--r)',
          padding: '12px 14px', marginBottom: 20,
          display: 'flex', gap: 10, alignItems: 'flex-start',
        }}>
          <CheckCircle size={16} color={P.accent} style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5, lineHeight: 1.5, color: P.text2 }}>
            <p style={{ margin: '0 0 3px', color: P.text, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Didn't receive it?
            </p>
            <p style={{ margin: 0 }}>Check your spam folder or contact support.</p>
          </div>
        </div>
        <button
          onClick={() => { setShowEmailConfirmation(false); onClose(); setEmail(''); setPassword('') }}
          style={primaryButtonStyle}
        >
          Got it
        </button>
      </Card>
    )
  }

  // ── Main login/signup modal ────────────────────────────────────────────────
  return (
    <Card onClose={onClose}>
      <h2 style={headingStyle}>{isLogin ? t('auth.login') : t('auth.signup')}</h2>
      <p style={subStyle}>
        {isLogin ? 'Log in to access your account' : 'Sign up to start analyzing F1 data'}
      </p>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      <button
        onClick={handleGoogleLogin}
        disabled={oauthLoading !== null}
        style={{ ...googleButtonStyle, opacity: oauthLoading !== null ? 0.6 : 1, cursor: oauthLoading !== null ? 'not-allowed' : 'pointer' }}
      >
        {oauthLoading === 'google' ? <Loader2 size={16} className="animate-spin" /> : <GoogleIcon />}
        Continue with Google
      </button>

      <Divider label="or continue with email" />

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 14 }}>
          <span style={labelStyle}>{t('auth.email')}</span>
          <input
            id="email" type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <span style={labelStyle}>{t('auth.password')}</span>
          <input
            id="password" type="password" required value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>
        <button
          type="submit"
          disabled={loading || oauthLoading !== null}
          style={{ ...primaryButtonStyle, opacity: (loading || oauthLoading !== null) ? 0.6 : 1 }}
        >
          {loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.signup'))}
        </button>
      </form>

      <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => { setIsLogin(!isLogin); setError('') }}
          style={linkStyle}
          onMouseEnter={e => { e.currentTarget.style.color = P.accent }}
          onMouseLeave={e => { e.currentTarget.style.color = P.text2 }}
        >
          {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
        </button>
        {isLogin && (
          <button
            onClick={() => { setShowForgotPassword(true); setError('') }}
            style={{ ...linkStyle, fontSize: 9, color: P.text3 }}
            onMouseEnter={e => { e.currentTarget.style.color = P.accent }}
            onMouseLeave={e => { e.currentTarget.style.color = P.text3 }}
          >
            Forgot password?
          </button>
        )}
      </div>
    </Card>
  )
}
