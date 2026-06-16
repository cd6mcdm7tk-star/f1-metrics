import { useState } from 'react'
import { X, Mail, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14.04 9.57c-.02-1.96 1.6-2.9 1.67-2.95-0.91-1.33-2.33-1.51-2.84-1.53-1.21-.12-2.36.71-2.97.71-.61 0-1.56-.69-2.56-.67-1.32.02-2.54.77-3.22 1.96-1.37 2.38-.35 5.9.98 7.83.65.94 1.42 2 2.44 1.96.98-.04 1.35-.63 2.54-.63 1.18 0 1.52.63 2.56.61 1.05-.02 1.71-.96 2.35-1.9.75-1.09 1.05-2.15 1.07-2.2-.02-.01-2.04-.78-2.06-3.09l.04.1zM12.1 3.56c.54-.65.9-1.56.8-2.46-.78.03-1.72.52-2.28 1.16-.5.58-.94 1.51-.82 2.4.87.07 1.75-.44 2.3-1.1z" fill="white"/>
    </svg>
  )
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
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

  const handleAppleLogin = async () => {
    setOauthLoading('apple')
    setError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
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
      const { error } = await signUp(email, password)
      if (error) { setError(error.message); setLoading(false) }
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

  // Forgot password screen
  if (showForgotPassword) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl shadow-metrik-turquoise/20">
          <button onClick={() => { setShowForgotPassword(false); setResetSent(false); setError('') }}
            className="absolute top-4 right-4 text-metrik-silver hover:text-white transition-colors z-10">
            <X size={24} />
          </button>
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-metrik-turquoise/10 rounded-full border border-metrik-turquoise/30">
                <Mail className="w-12 h-12 text-metrik-turquoise" />
              </div>
            </div>
            {resetSent ? (
              <>
                <h2 className="text-2xl font-rajdhani font-black text-white mb-3">Check your email</h2>
                <p className="text-metrik-silver text-sm mb-6">
                  We sent a reset link to <span className="text-metrik-turquoise font-bold">{email}</span>.
                </p>
                <button onClick={() => { setShowForgotPassword(false); setResetSent(false) }}
                  className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-bold rounded-lg transition-all">
                  Back to login
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-rajdhani font-black text-white mb-3">Reset password</h2>
                <p className="text-metrik-silver text-sm mb-6">Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleForgotPassword} className="space-y-4 text-left">
                  {error && <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
                  <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white placeholder-metrik-silver/50 focus:outline-none focus:ring-2 focus:ring-metrik-turquoise font-rajdhani" />
                  <button type="submit" disabled={loading}
                    className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-black rounded-lg transition-all disabled:opacity-50">
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Email confirmation screen
  if (showEmailConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl shadow-metrik-turquoise/20">
          <button onClick={() => { setShowEmailConfirmation(false); onClose(); setEmail(''); setPassword('') }}
            className="absolute top-4 right-4 text-metrik-silver hover:text-white transition-colors z-10">
            <X size={24} />
          </button>
          <div className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-metrik-turquoise/20 rounded-full blur-xl" />
                <div className="p-4 bg-metrik-turquoise/10 rounded-full border border-metrik-turquoise/30">
                  <Mail className="w-12 h-12 text-metrik-turquoise relative" />
                </div>
              </div>
            </div>
            <h2 className="text-2xl font-rajdhani font-black text-white mb-3">Check Your Email! 📧</h2>
            <p className="text-metrik-silver text-sm mb-4 leading-relaxed">We've sent a confirmation email to:</p>
            <div className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-metrik-turquoise font-rajdhani font-bold break-all">{email}</p>
            </div>
            <p className="text-metrik-silver text-sm mb-6 leading-relaxed">
              Please click the confirmation link to activate your account and start exploring METRIK DELTA.
            </p>
            <div className="bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div className="text-xs text-metrik-silver">
                  <p className="font-rajdhani font-bold text-white mb-1">Didn't receive the email?</p>
                  <p>Check your spam folder or contact support if needed.</p>
                </div>
              </div>
            </div>
            <button onClick={() => { setShowEmailConfirmation(false); onClose(); setEmail(''); setPassword('') }}
              className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-bold rounded-lg transition-all">
              Got it!
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main login/signup modal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl shadow-metrik-turquoise/20">
        <button onClick={onClose} className="absolute top-4 right-4 text-metrik-silver hover:text-white transition-colors z-10">
          <X size={24} />
        </button>

        <div className="p-8">
          <h2 className="text-3xl font-rajdhani font-black text-white mb-1">
            {isLogin ? t('auth.login') : t('auth.signup')}
          </h2>
          <p className="text-metrik-silver text-sm mb-6">
            {isLogin ? 'Log in to access your account' : 'Sign up to start analyzing F1 data'}
          </p>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm font-rajdhani mb-4">
              {error}
            </div>
          )}

          {/* OAuth buttons */}
          <div className="space-y-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-800 font-rajdhani font-bold text-sm rounded-lg transition-all border border-gray-200 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'google' ? (
                <span className="w-[18px] h-[18px] border-2 border-gray-400 border-t-gray-800 rounded-full animate-spin" />
              ) : <GoogleIcon />}
              Continue with Google
            </button>

            <button
              onClick={handleAppleLogin}
              disabled={oauthLoading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-black hover:bg-gray-900 text-white font-rajdhani font-bold text-sm rounded-lg transition-all border border-gray-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {oauthLoading === 'apple' ? (
                <span className="w-[18px] h-[18px] border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              ) : <AppleIcon />}
              Continue with Apple
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-metrik-turquoise/20" />
            <span className="text-metrik-silver/60 text-xs font-rajdhani">or continue with email</span>
            <div className="flex-1 h-px bg-metrik-turquoise/20" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-rajdhani font-bold text-metrik-silver mb-2">
                {t('auth.email')}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white placeholder-metrik-silver/50 focus:outline-none focus:ring-2 focus:ring-metrik-turquoise focus:border-transparent font-rajdhani transition-all"
                placeholder="your@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-rajdhani font-bold text-metrik-silver mb-2">
                {t('auth.password')}
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg text-white placeholder-metrik-silver/50 focus:outline-none focus:ring-2 focus:ring-metrik-turquoise focus:border-transparent font-rajdhani transition-all"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || oauthLoading !== null}
              className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-black rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-metrik-turquoise/30"
            >
              {loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.signup'))}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-3">
            <button
              onClick={() => { setIsLogin(!isLogin); setError('') }}
              className="text-sm font-rajdhani font-bold text-metrik-silver hover:text-metrik-turquoise transition-colors"
            >
              {isLogin ? t('auth.noAccount') : t('auth.hasAccount')}
            </button>
            {isLogin && (
              <button
                onClick={() => { setShowForgotPassword(true); setError('') }}
                className="text-xs font-rajdhani text-metrik-silver/60 hover:text-metrik-turquoise transition-colors"
              >
                Forgot password?
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
