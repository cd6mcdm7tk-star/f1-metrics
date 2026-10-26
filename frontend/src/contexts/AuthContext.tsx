import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { checkoutUrl, hasSubscription, type PlanType } from '../lib/subscription'
import AuthModal, { type AuthMode } from '../components/AuthModal'
import { RESET_PASSWORD_PATH } from '../lib/recovery'

const signUp = (email: string, password: string) => supabase.auth.signUp({ email, password })
const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password })

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: typeof signUp
  signIn: typeof signIn
  signOut: () => Promise<void>
  /** Opens the sign-in window on the login form, or on sign-up */
  setAuthModalOpen: (open: boolean, mode?: AuthMode) => void
  isPremium: boolean
  premiumLoading: boolean
  /** Reads the subscription again, e.g. while a payment is being confirmed */
  refreshPremium: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  // Each opening starts the window afresh, on the form asked for
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: AuthMode; opened: number }>({ open: false, mode: 'login', opened: 0 })
  const setAuthModalOpen = useCallback((open: boolean, mode: AuthMode = 'login') => {
    setAuthModal(current => (open ? { open, mode, opened: current.opened + 1 } : { ...current, open }))
  }, [])
  const [isPremium, setIsPremium] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)
  // Whose subscription isPremium was read for: right after signing in it is still the previous user's
  const [premiumFor, setPremiumFor] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
      // A reset link that Supabase sent to another page still ends on the form to choose the new password
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== RESET_PASSWORD_PATH) window.location.assign(RESET_PASSWORD_PATH)
    })
    return () => subscription.unsubscribe()
  }, [])

  // PRO = an active subscription row in Supabase
  useEffect(() => {
    if (!user) {
      setIsPremium(false)
      setPremiumLoading(false)
      return
    }
    let cancelled = false
    setPremiumLoading(true)
    hasSubscription(user.id)
      .then(premium => { if (!cancelled) setIsPremium(premium) }, () => { if (!cancelled) setIsPremium(false) })
      .then(() => { if (!cancelled) { setPremiumLoading(false); setPremiumFor(user.id) } })
    return () => { cancelled = true }
  }, [user])

  const refreshPremium = useCallback(async () => {
    if (!user) return false
    const premium = await hasSubscription(user.id)
    setIsPremium(premium)
    return premium
  }, [user])

  // Checkout picked before signing in, the waiver already ticked (see UpgradeModal): resumed once
  // signed in and known not to be PRO already
  useEffect(() => {
    if (!user || premiumFor !== user.id || isPremium) return
    const pending = sessionStorage.getItem('pendingUpgrade') as PlanType | null
    if (!pending) return
    sessionStorage.removeItem('pendingUpgrade')
    checkoutUrl(pending, true)
      .then(url => { window.location.href = url })
      .catch(err => console.error('Pending checkout failed:', err))
  }, [user, premiumFor, isPremium])

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsPremium(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, setAuthModalOpen, isPremium, premiumLoading, refreshPremium }}>
      {children}
      <AuthModal key={authModal.opened} isOpen={authModal.open} mode={authModal.mode} onClose={() => setAuthModalOpen(false)} />
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
