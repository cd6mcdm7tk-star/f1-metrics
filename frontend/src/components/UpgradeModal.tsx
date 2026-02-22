import { X, Zap, Check, Loader2, TrendingUp, Trophy, Radio } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  reason?: 'current_season' | 'live_timing' | 'rate_limit'
}

type PlanType = 'monthly' | 'annual'

export default function UpgradeModal({ isOpen, onClose, reason = 'current_season' }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('annual')
  const { user, setAuthModalOpen } = useAuth()

  if (!isOpen) return null

  const handleUpgrade = async () => {
    // Si pas connecté, ouvrir le modal de login
    if (!user) {
      setAuthModalOpen(true)
      onClose()
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('https://metrikdelta-backend-eu-production.up.railway.app/api/stripe/create-checkout-session', {
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
        return {
          icon: <Trophy className="text-metrik-turquoise" size={48} />,
          title: 'Unlock 2026 Season',
          description: 'Access live data from the current F1 season'
        }
      case 'live_timing':
        return {
          icon: <Radio className="text-metrik-turquoise" size={48} />,
          title: 'Live Timing Locked',
          description: 'Follow races in real-time with PRO'
        }
      default:
        return {
          icon: <Zap className="text-metrik-turquoise" size={48} />,
          title: 'Upgrade to PRO',
          description: 'Unlock all premium features'
        }
    }
  }

  const reasonContent = getReasonContent()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-metrik-card border border-metrik-turquoise/30 rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-metrik-silver hover:text-white transition-colors"
          disabled={loading}
        >
          <X size={24} />
        </button>

        <div className="p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-metrik-turquoise/10 rounded-full border border-metrik-turquoise/30">
                {reasonContent.icon}
              </div>
            </div>
            <h2 className="text-2xl sm:text-3xl font-rajdhani font-black text-white mb-2">
              {reasonContent.title}
            </h2>
            <p className="text-metrik-silver text-sm sm:text-base">
              {reasonContent.description}
            </p>
          </div>

          {/* Plan Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              disabled={loading}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-300
                ${selectedPlan === 'monthly'
                  ? 'border-metrik-turquoise bg-metrik-turquoise/10 scale-105'
                  : 'border-metrik-silver/20 bg-metrik-black/50 hover:border-metrik-turquoise/50'
                }
              `}
            >
              {selectedPlan === 'monthly' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-metrik-turquoise flex items-center justify-center">
                    <Check size={16} className="text-metrik-black" />
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-rajdhani font-bold text-white mb-2">
                  Monthly
                </h3>
                <div className="mb-4">
                  <span className="text-4xl font-rajdhani font-black text-metrik-turquoise">
                    1,99€
                  </span>
                  <span className="text-metrik-silver text-sm ml-1">/month</span>
                </div>
                <p className="text-xs text-metrik-silver">
                  Billed monthly • Cancel anytime
                </p>
              </div>
            </button>

            {/* Annual Plan */}
            <button
              onClick={() => setSelectedPlan('annual')}
              disabled={loading}
              className={`
                relative p-6 rounded-xl border-2 transition-all duration-300
                ${selectedPlan === 'annual'
                  ? 'border-metrik-turquoise bg-metrik-turquoise/10 scale-105'
                  : 'border-metrik-silver/20 bg-metrik-black/50 hover:border-metrik-turquoise/50'
                }
              `}
            >
              {/* Best Value Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
                  <span className="text-xs font-rajdhani font-black text-black uppercase">
                    Best Value
                  </span>
                </div>
              </div>

              {selectedPlan === 'annual' && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 rounded-full bg-metrik-turquoise flex items-center justify-center">
                    <Check size={16} className="text-metrik-black" />
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-lg font-rajdhani font-bold text-white mb-2">
                  Annual
                </h3>
                <div className="mb-2">
                  <span className="text-4xl font-rajdhani font-black text-metrik-turquoise">
                    14,99€
                  </span>
                  <span className="text-metrik-silver text-sm ml-1">/year</span>
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs text-metrik-silver line-through">
                    23,88€
                  </span>
                  <span className="px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-xs font-bold text-green-400">
                    SAVE 38%
                  </span>
                </div>
                <p className="text-xs text-metrik-silver">
                  Billed annually • 8,89€ saved
                </p>
              </div>
            </button>
          </div>

          {/* Features List */}
          <div className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-xl p-6 mb-6">
            <h4 className="text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wide mb-4 flex items-center gap-2">
              <TrendingUp size={16} />
              What's included in PRO
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-start gap-3">
                <Check size={18} className="text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-sm">2026 Season Access</p>
                  <p className="text-metrik-silver text-xs">Real-time data from current season</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check size={18} className="text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-sm">Live Timing</p>
                  <p className="text-metrik-silver text-xs">Follow races as they happen</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check size={18} className="text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-sm">Full Telemetry</p>
                  <p className="text-metrik-silver text-xs">Detailed lap-by-lap analysis</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Check size={18} className="text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-sm">Historical Data</p>
                  <p className="text-metrik-silver text-xs">Full access to 2018-2025</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-4 px-6 bg-gradient-to-r from-metrik-turquoise to-cyan-500 hover:from-metrik-turquoise/90 hover:to-cyan-500/90 text-metrik-black font-rajdhani font-black text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-metrik-turquoise/30"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Processing...
              </>
            ) : user ? (
              <>
                Upgrade to PRO - {selectedPlan === 'monthly' ? '1,99€/month' : '14,99€/year'}
              </>
            ) : (
              'Sign in to continue'
            )}
          </button>

          {/* Footer Note */}
          <p className="text-center text-xs text-metrik-silver mt-4">
            Cancel anytime • Secure payment via Stripe • Money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}