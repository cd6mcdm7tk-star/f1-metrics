import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { checkoutUrl, hasSubscription, type PlanType } from '../lib/subscription'
import AuthModal from '../components/AuthModal'

const signUp = (email: string, password: string) => supabase.auth.signUp({ email, password })
const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password })

interface AuthContextType {
  user: User | null
  loading: boolean
  signUp: typeof signUp
  signIn: typeof signIn
  signOut: () => Promise<void>
  setAuthModalOpen: (open: boolean) => void
  isPremium: boolean
  premiumLoading: boolean
  /** Reads the subscription again, e.g. while a payment is being confirmed */
  refreshPremium: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [premiumLoading, setPremiumLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
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
      .then(() => { if (!cancelled) setPremiumLoading(false) })
    return () => { cancelled = true }
  }, [user])

  const refreshPremium = useCallback(async () => {
    if (!user) return false
    const premium = await hasSubscription(user.id)
    setIsPremium(premium)
    return premium
  }, [user])

  // Checkout picked before signing in (see UpgradeModal): resumed once signed in
  useEffect(() => {
    if (!user || premiumLoading || isPremium) return
    const pending = sessionStorage.getItem('pendingUpgrade') as PlanType | null
    if (!pending) return
    sessionStorage.removeItem('pendingUpgrade')
    checkoutUrl(pending)
      .then(url => { window.location.href = url })
      .catch(err => console.error('Pending checkout failed:', err))
  }, [user, premiumLoading, isPremium])

  const signOut = async () => {
    await supabase.auth.signOut()
    setIsPremium(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, setAuthModalOpen, isPremium, premiumLoading, refreshPremium }}>
      {children}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
