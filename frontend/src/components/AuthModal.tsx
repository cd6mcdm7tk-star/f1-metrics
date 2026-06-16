import { useState } from 'react'
import { X, Mail, CheckCircle } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { t } = useTranslation()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signUp, signIn } = useAuth()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isLogin) {
      // LOGIN
      const { error } = await signIn(email, password)
      
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        onClose()
        setEmail('')
        setPassword('')
        setLoading(false)
      }
    } else {
      // SIGNUP
      const { error } = await signUp(email, password)
      
      if (error) {
        setError(error.message)
        setLoading(false)
      } else {
        // Afficher le message de confirmation email
        setShowEmailConfirmation(true)
        setLoading(false)
      }
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
                <p className="text-metrik-silver text-sm mb-6">We sent a password reset link to <span className="text-metrik-turquoise font-bold">{email}</span>.</p>
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

  // Message de confirmation email après signup
  if (showEmailConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <div className="relative w-full max-w-md backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl shadow-metrik-turquoise/20">
          {/* Close button */}
          <button
            onClick={() => {
              setShowEmailConfirmation(false)
              onClose()
              setEmail('')
              setPassword('')
            }}
            className="absolute top-4 right-4 text-metrik-silver hover:text-white transition-colors z-10"
          >
            <X size={24} />
          </button>

          {/* Content */}
          <div className="p-8 text-center">
            {/* Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-metrik-turquoise/20 rounded-full blur-xl"></div>
                <div className="p-4 bg-metrik-turquoise/10 rounded-full border border-metrik-turquoise/30">
                  <Mail className="w-12 h-12 text-metrik-turquoise relative" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-rajdhani font-black text-white mb-3">
              Check Your Email! 📧
            </h2>

            {/* Description */}
            <p className="text-metrik-silver text-sm mb-4 leading-relaxed">
              We've sent a confirmation email to:
            </p>
            
            <div className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-metrik-turquoise font-rajdhani font-bold break-all">
                {email}
              </p>
            </div>

            <p className="text-metrik-silver text-sm mb-6 leading-relaxed">
              Please click the confirmation link in the email to activate your account and start exploring METRIK DELTA.
            </p>

            {/* Info box */}
            <div className="bg-metrik-turquoise/10 border border-metrik-turquoise/30 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3 text-left">
                <CheckCircle className="w-5 h-5 text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div className="text-xs text-metrik-silver">
                  <p className="font-rajdhani font-bold text-white mb-1">Didn't receive the email?</p>
                  <p>Check your spam folder or contact support if needed.</p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={() => {
                setShowEmailConfirmation(false)
                onClose()
                setEmail('')
                setPassword('')
              }}
              className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-bold rounded-lg transition-all"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Modal Login/Signup normal
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl shadow-2xl shadow-metrik-turquoise/20">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-metrik-silver hover:text-white transition-colors z-10"
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="p-8">
          <h2 className="text-3xl font-rajdhani font-black text-white mb-2">
            {isLogin ? t('auth.login') : t('auth.signup')}
          </h2>
          <p className="text-metrik-silver text-sm mb-6">
            {isLogin ? 'Log in to access your account' : 'Sign up to start analyzing F1 data'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-lg text-sm font-rajdhani">
                {error}
              </div>
            )}

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
              disabled={loading}
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