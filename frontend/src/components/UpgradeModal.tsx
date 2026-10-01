import { X, Zap, Check, Loader2, TrendingUp, Trophy, Radio } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { CURRENT_SEASON_YEAR } from '../hooks/useSubscription'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'current_season' | 'live_timing' | 'rate_limit'
}

type PlanType = 'monthly' | 'annual'

// Same self-contained dark "chrome" palette as AuthModal — see that file for
// why it's hardcoded rather than read via CSS vars.
const P = {
  bg: '#3d0c10', surface: '#4d1016', panel: '#57121c',
  accent: '#f2e6d8', text: '#f2e6d8',
  text2: 'rgba(242,230,216,0.55)', text3: 'rgba(242,230,216,0.32)',
  border: 'rgba(242,230,216,0.10)', borderHi: 'rgba(242,230,216,0.20)',
  green: '#4ADE80', // 7.99:1 against `panel`
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace", fontSize: 9, letterSpacing: '0.14em',
  textTransform: 'uppercase', color: P.text3,
}

export default function UpgradeModal({ isOpen, onClose, reason = 'current_season' }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')
  const { user, setAuthModalOpen } = useAuth()

  if (!isOpen) return null

  const handleUpgrade = async () => {
    if (!user) {
      // Mémoriser l'intent de paiement → sera auto-déclenché après login
      sessionStorage.setItem('pendingUpgrade', selectedPlan)
      setAuthModalOpen(true)
      onClose()
      return
    }

    setLoading(true)

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL_EU || import.meta.env.VITE_API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: user.id,
          plan_type: selectedPlan  // 'monthly' ou 'annual'
        })
      })

      const data = await response.json()

      if (data.checkout_url) {
        window.location.href = data.checkout_url
      } else {
        throw new Error('No checkout URL received')
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      alert('Error creating payment session')
      setLoading(false)
    }
  }

  const getReasonContent = () => {
    switch (reason) {
      case 'current_season':
        return { icon: <Trophy size={32} color={P.accent} />, title: `Unlock ${CURRENT_SEASON_YEAR} Season`, description: 'Access live data from the current F1 season' }
      case 'live_timing':
        return { icon: <Radio size={32} color={P.accent} />, title: 'Live Timing Locked', description: 'Follow races in real-time with PRO' }
      default:
        return { icon: <Zap size={32} color={P.accent} />, title: 'Upgrade to PRO', description: 'Unlock all premium features' }
    }
  }

  const reasonContent = getReasonContent()

  const planCardStyle = (selected: boolean): React.CSSProperties => ({
    position: 'relative', padding: '18px 16px', borderRadius: 'var(--r2)',
    border: `2px solid ${selected ? P.accent : P.border}`,
    background: selected ? 'rgba(242,230,216,0.08)' : P.bg,
    cursor: loading ? 'not-allowed' : 'pointer',
    textAlign: 'center', transition: 'all 0.2s',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
    }}>
      <div style={{
        position: 'relative', width: '100%', maxWidth: 620, maxHeight: '92vh', overflowY: 'auto',
        background: P.panel, border: `1px solid ${P.borderHi}`, borderRadius: 'var(--r2)',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        padding: '32px 28px 28px',
      }}>
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute', top: 16, right: 16,
            color: P.text3, background: 'transparent', border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', padding: 4, lineHeight: 0, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = P.text }}
          onMouseLeave={e => { e.currentTarget.style.color = P.text3 }}
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: P.surface, border: `1px solid ${P.borderHi}`,
            }}>
              {reasonContent.icon}
            </div>
          </div>
          <h2 style={{
            fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 24,
            letterSpacing: '0.04em', textTransform: 'uppercase', color: P.text, margin: '0 0 6px',
          }}>
            {reasonContent.title}
          </h2>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10.5, color: P.text2, margin: 0 }}>
            {reasonContent.description}
          </p>
        </div>

        {/* Plan selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <button onClick={() => setSelectedPlan('monthly')} disabled={loading} style={planCardStyle(selectedPlan === 'monthly')}>
            {selectedPlan === 'monthly' && (
              <div style={{
                position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%',
                background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} color={P.bg} />
              </div>
            )}
            <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: P.text, margin: '0 0 8px' }}>Monthly</h3>
            <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: P.green, marginBottom: 6 }}>7 days free</span>
            <div style={{ marginBottom: 10 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 30, color: P.accent }}>1,99€</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: P.text2 }}>/mo</span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: P.text3, margin: 0, lineHeight: 1.5 }}>
              Then billed monthly · Cancel anytime
            </p>
          </button>

          <button onClick={() => setSelectedPlan('annual')} disabled={loading} style={planCardStyle(selectedPlan === 'annual')}>
            <div style={{
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              padding: '2px 10px', borderRadius: 'var(--r)',
              background: P.accent,
            }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: P.bg }}>Best</span>
            </div>
            {selectedPlan === 'annual' && (
              <div style={{
                position: 'absolute', top: 10, right: 10, width: 20, height: 20, borderRadius: '50%',
                background: P.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} color={P.bg} />
              </div>
            )}
            <h3 style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', color: P.text, margin: '0 0 8px' }}>Annual</h3>
            <span style={{ display: 'block', fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: P.green, marginBottom: 6 }}>7 days free</span>
            <div style={{ marginBottom: 6 }}>
              <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 800, fontSize: 30, color: P.accent }}>14,99€</span>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: P.text2 }}>/yr</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: P.text3, textDecoration: 'line-through' }}>23,88€</span>
              <span style={{
                padding: '1px 6px', borderRadius: 'var(--r)',
                background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)',
                fontFamily: "'JetBrains Mono', monospace", fontSize: 9, fontWeight: 700, color: P.green,
              }}>
                -38%
              </span>
            </div>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: P.text3, margin: 0, lineHeight: 1.5 }}>
              Then billed yearly · 8,89€ saved
            </p>
          </button>
        </div>

        {/* Features */}
        <div style={{ background: P.bg, border: `1px solid ${P.border}`, borderRadius: 'var(--r2)', padding: 16, marginBottom: 20 }}>
          <h4 style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase',
            color: P.accent, margin: '0 0 12px', fontWeight: 700,
          }}>
            <TrendingUp size={13} />
            What's included in PRO
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { title: `${CURRENT_SEASON_YEAR} Season Access`, desc: 'Real-time data from current season' },
              { title: 'Live Timing', desc: 'Live data, GPS tracking, sector times & radio' },
              { title: 'Full Telemetry', desc: `Detailed lap-by-lap analysis ${CURRENT_SEASON_YEAR} season` },
              { title: 'Historical Data', desc: `Full access to 1950-${CURRENT_SEASON_YEAR - 1}` },
            ].map(({ title, desc }) => (
              <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Check size={14} color={P.accent} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 13, color: P.text, margin: '0 0 2px' }}>{title}</p>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: P.text2, margin: 0, lineHeight: 1.4 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          disabled={loading}
          style={{
            width: '100%', padding: '13px 0',
            background: P.accent, color: P.bg,
            border: 'none', borderRadius: 'var(--r)',
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 12,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'opacity 0.15s',
          }}
        >
          {loading ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Processing...
            </>
          ) : user ? (
            <>Start 7-day free trial → {selectedPlan === 'monthly' ? '1,99€/mo after' : '14,99€/yr after'}</>
          ) : (
            <>Start 7-day free trial</>
          )}
        </button>

        <p style={{ ...labelStyle, textAlign: 'center', marginTop: 14, lineHeight: 1.6, letterSpacing: '0.04em' }}>
          7 days free • No charge until trial ends • Cancel anytime • Secure payment via Stripe
        </p>
      </div>
    </div>
  )
}
