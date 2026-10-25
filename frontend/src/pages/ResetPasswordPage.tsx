import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Loader2 } from 'lucide-react'
import { Card, ErrorBanner } from '../components/AuthCard'
import { headingStyle, inputStyle, labelStyle, P, primaryButtonStyle, subStyle } from '../components/authStyle'
import { useAuth } from '../contexts/AuthContext'
import { EXPIRED_LINK, linkError, MIN_PASSWORD_LENGTH, passwordProblem, RESET_PASSWORD_PATH, recoveryToken } from '../lib/recovery'
import { supabase } from '../lib/supabase'

function Icon() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
      <div style={{
        width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: P.surface, border: `1px solid ${P.borderHi}`,
      }}>
        <KeyRound size={26} color={P.accent} />
      </div>
    </div>
  )
}

/** Where a password reset email leads. Our email's link carries a one-time
 * token the page exchanges for a session; a link through Supabase arrives
 * signed in already. Then the user chooses their new password. An expired or
 * used link says so. */
export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading, setAuthModalOpen } = useAuth()
  const [problem, setProblem] = useState(() => linkError(window.location.href))
  const [token] = useState(() => recoveryToken(window.location.href))
  const [verifying, setVerifying] = useState(token != null)
  const exchanged = useRef(false)

  useEffect(() => {
    // Once: the token works a single time (React runs effects twice in development)
    if (!token || exchanged.current) return
    exchanged.current = true
    supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' }).then(({ error: failed }) => {
      if (failed) setProblem(EXPIRED_LINK)
      // A refresh must not try the used token again
      window.history.replaceState(null, '', RESET_PASSWORD_PATH)
      setVerifying(false)
    })
  }, [token])
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const toApp = () => navigate('/app')
  const askAgain = () => { navigate('/app'); setAuthModalOpen(true, 'login') }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const invalid = passwordProblem(password, confirmation)
    if (invalid) { setError(invalid); return }
    setSaving(true)
    setError('')
    const { error: failed } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (failed) setError(failed.message)
    else setDone(true)
  }

  const content = () => {
    if (loading || verifying) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0' }}>
          <Loader2 size={24} color={P.accent} className="animate-spin" />
        </div>
      )
    }
    if (problem || !user) {
      return (
        <>
          <Icon />
          <h2 style={{ ...headingStyle, textAlign: 'center' }}>Link not valid</h2>
          <p style={{ ...subStyle, textAlign: 'center' }}>
            {problem ?? 'Open the latest reset link from your email, or ask for a new one from the login window.'}
          </p>
          <button onClick={askAgain} style={primaryButtonStyle}>Back to login</button>
        </>
      )
    }
    if (done) {
      return (
        <>
          <Icon />
          <h2 style={{ ...headingStyle, textAlign: 'center' }}>Password changed</h2>
          <p style={{ ...subStyle, textAlign: 'center' }}>You're signed in with your new password.</p>
          <button onClick={toApp} style={primaryButtonStyle}>Open the telemetry</button>
        </>
      )
    }
    return (
      <>
        <Icon />
        <h2 style={{ ...headingStyle, textAlign: 'center' }}>New password</h2>
        <p style={{ ...subStyle, textAlign: 'center' }}>
          For <span style={{ color: P.accent, fontWeight: 700 }}>{user.email}</span>. At least {MIN_PASSWORD_LENGTH} characters.
        </p>
        <form onSubmit={submit}>
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <label style={{ display: 'block', marginBottom: 14 }}>
            <span style={labelStyle}>New password</span>
            <input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </label>
          <label style={{ display: 'block', marginBottom: 18 }}>
            <span style={labelStyle}>Confirm it</span>
            <input type="password" required autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} style={inputStyle} />
          </label>
          <button type="submit" disabled={saving} style={{ ...primaryButtonStyle, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving...' : 'Save the new password'}
          </button>
        </form>
      </>
    )
  }

  return (
    <>
      <Helmet>
        <title>Reset your password | METRIK DELTA</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{ minHeight: '100dvh', background: '#5e1018' }}>
        <Card onClose={toApp}>{content()}</Card>
      </div>
    </>
  )
}
