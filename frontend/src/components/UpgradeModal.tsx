import { X, Loader2, Activity, BarChart3, Download } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { CURRENT_SEASON_YEAR } from '../hooks/useSubscription'
import { checkoutUrl, type PlanType } from '../lib/subscription'

export type UpgradeReason = 'current_season' | 'export'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: UpgradeReason
}


const PLANS: Record<PlanType, { label: string; price: string; period: string; note: string }> = {
  annual:  { label: 'Annual',  price: '14,99€', period: '/ year',  note: '1,25€/mo · save 37%' },
  monthly: { label: 'Monthly', price: '1,99€',  period: '/ month', note: 'Cancel anytime' },
}

const FEATURES: { key: 'telemetry' | 'statistics' | 'export'; icon: LucideIcon; title: string; desc: string }[] = [
  {
    key: 'telemetry', icon: Activity, title: `${CURRENT_SEASON_YEAR} telemetry`,
    desc: 'Lap times plus speed, throttle, brake and gear traces for every session of the season.',
  },
  {
    key: 'statistics', icon: BarChart3, title: `${CURRENT_SEASON_YEAR} statistics`,
    desc: 'Head-to-heads, standings and season stats for the current grid.',
  },
  {
    key: 'export', icon: Download, title: 'HD chart export',
    desc: 'Download any chart as a 3600 px image, ready to post.',
  },
]

const HEADINGS: Record<UpgradeReason, { title: string; subtitle: string }> = {
  current_season: {
    title: `Unlock the ${CURRENT_SEASON_YEAR} season`,
    subtitle: `Telemetry and statistics for every ${CURRENT_SEASON_YEAR} session, plus HD chart export.`,
  },
  export: {
    title: 'Export HD charts',
    subtitle: `Chart export comes with METRIK PRO, along with the full ${CURRENT_SEASON_YEAR} season.`,
  },
}

const mono = "'JetBrains Mono', monospace"
const display = "'Rajdhani', sans-serif"

// Cream `.data-zone` palette, like the Telemetry and Statistics pages it opens from.
export default function UpgradeModal({ isOpen, onClose, reason = 'current_season' }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')
  // PRO starts at once: the 14-day withdrawal period is waived, as the Terms (section 5) explain
  const [waived, setWaived] = useState(false)
  const { user, setAuthModalOpen } = useAuth()

  // Asked again each time the modal opens
  useEffect(() => {
    if (!isOpen) setWaived(false)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [isOpen, loading, onClose])

  if (!isOpen) return null

  const handleUpgrade = async () => {
    if (!user) {
      // Remembered intent: checkout starts automatically after sign-in.
      // Someone without an account yet is far likelier to be new: sign-up first
      sessionStorage.setItem('pendingUpgrade', selectedPlan)
      setAuthModalOpen(true, 'signup')
      onClose()
      return
    }

    setLoading(true)
    try {
      window.location.href = await checkoutUrl(selectedPlan, true)
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error creating payment session')
      setLoading(false)
    }
  }

  const heading = HEADINGS[reason]
  // The feature that brought the user here comes first
  const features = reason === 'export'
    ? [...FEATURES.filter(f => f.key === 'export'), ...FEATURES.filter(f => f.key !== 'export')]
    : FEATURES
  const plan = PLANS[selectedPlan]

  return (
    <div
      className="data-zone"
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        onClick={() => { if (!loading) onClose() }}
        style={{ position: 'absolute', inset: 0, background: 'rgba(28,4,7,0.55)', backdropFilter: 'blur(4px)' }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-title"
        style={{
          position: 'relative', width: '100%', maxWidth: 520, maxHeight: '92vh', overflowY: 'auto',
          background: 'var(--bg)', color: 'var(--text)',
          border: '1px solid var(--border-hi)', borderTop: '3px solid var(--accent)', borderRadius: 'var(--r2)',
          boxShadow: '0 24px 60px rgba(28,4,7,0.35)',
          padding: '26px 26px 22px',
        }}
      >
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14,
            color: 'var(--text-2)', background: 'transparent', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', padding: 4, lineHeight: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <p style={{ fontFamily: mono, fontSize: 'var(--fs-9)', fontWeight: 700, letterSpacing: '0.2em', color: 'var(--accent)', margin: '0 0 8px' }}>
          METRIK PRO
        </p>
        <h2 id="upgrade-title" style={{
          fontFamily: display, fontWeight: 700, fontSize: 26, lineHeight: 1.1,
          letterSpacing: '0.02em', textTransform: 'uppercase', margin: '0 0 8px', paddingRight: 24,
        }}>
          {heading.title}
        </h2>
        <p style={{ fontFamily: mono, fontSize: 'var(--fs-11)', lineHeight: 1.6, color: 'var(--text-2)', margin: '0 0 20px' }}>
          {heading.subtitle}
        </p>

        {/* Features */}
        <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, borderTop: '1px solid var(--border)' }}>
          {features.map(({ key, icon: Icon, title, desc }) => (
            <li key={key} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <Icon size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
              <div>
                <p style={{ fontFamily: display, fontWeight: 700, fontSize: 15, margin: '0 0 2px' }}>{title}</p>
                <p style={{ fontFamily: mono, fontSize: 'var(--fs-10)', lineHeight: 1.5, color: 'var(--text-2)', margin: 0 }}>{desc}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Plans */}
        <div role="radiogroup" aria-label="Billing period" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          {(['annual', 'monthly'] as PlanType[]).map(type => {
            const p = PLANS[type]
            const selected = selectedPlan === type
            return (
              <button
                key={type}
                role="radio"
                aria-checked={selected}
                onClick={() => setSelectedPlan(type)}
                disabled={loading}
                style={{
                  position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-start',
                  textAlign: 'left', padding: '14px 14px 12px',
                  borderRadius: 'var(--r2)', outline: 'none',
                  border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
                  background: selected ? 'var(--accent-10)' : 'var(--surface)',
                  color: 'var(--text)', cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'border-color 0.15s, background 0.15s',
                }}
              >
                {type === 'annual' && (
                  <span style={{
                    position: 'absolute', top: -8, right: 10, whiteSpace: 'nowrap', lineHeight: 1,
                    fontFamily: mono, fontSize: 'var(--fs-8)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
                    padding: '3px 6px', borderRadius: 'var(--r)', background: 'var(--accent)', color: '#f2e6d8',
                  }}>
                    Best value
                  </span>
                )}
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8, fontFamily: mono, fontSize: 'var(--fs-9)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                  <span aria-hidden="true" style={{
                    width: 12, height: 12, borderRadius: '50%', flexShrink: 0,
                    border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--border-hi)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selected && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
                  </span>
                  {p.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontFamily: display, fontWeight: 700, fontSize: 28, lineHeight: 1 }}>{p.price}</span>
                  <span style={{ fontFamily: mono, fontSize: 'var(--fs-10)', color: 'var(--text-2)' }}>{p.period}</span>
                </div>
                <span style={{ fontFamily: mono, fontSize: 'var(--fs-9)', color: type === 'annual' ? 'var(--accent)' : 'var(--text-2)' }}>
                  {p.note}
                </span>
              </button>
            )
          })}
        </div>

        {/* Withdrawal waiver: required before paying */}
        <label style={{
          display: 'flex', gap: 10, alignItems: 'flex-start', margin: '0 0 14px', cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: mono, fontSize: 'var(--fs-10)', lineHeight: 1.6, color: 'var(--text-2)',
        }}>
          <input
            type="checkbox"
            checked={waived}
            onChange={e => setWaived(e.target.checked)}
            disabled={loading}
            style={{ marginTop: 2, accentColor: 'var(--accent)', flexShrink: 0 }}
          />
          <span>
            I want PRO to start right away, and I acknowledge that I lose my 14-day right of
            withdrawal once it starts (Terms, section 5).
          </span>
        </label>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading || !waived}
          style={{
            width: '100%', padding: '14px 0',
            background: 'var(--accent)', color: '#f2e6d8',
            border: 'none', borderRadius: 'var(--r)',
            fontFamily: mono, fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: loading || !waived ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : waived ? 1 : 0.45,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { if (!loading && waived) e.currentTarget.style.opacity = '0.88' }}
          onMouseLeave={e => { if (!loading && waived) e.currentTarget.style.opacity = '1' }}
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" />Redirecting to payment…</>
            : <>Get PRO · {plan.price} {plan.period}</>}
        </button>

        <p style={{ fontFamily: mono, fontSize: 'var(--fs-9)', lineHeight: 1.7, color: 'var(--text-2)', textAlign: 'center', margin: '12px 0 0' }}>
          {!user && <>You'll sign in first.<br /></>}
          Secure payment by Stripe · Cancel anytime
          <br />
          Every season up to {CURRENT_SEASON_YEAR - 1} stays free.
        </p>
      </div>
    </div>
  )
}
