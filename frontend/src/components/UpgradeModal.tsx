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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl bg-metrik-card border border-metrik-turquoise/30 rounded-xl shadow-2xl overflow-hidden max-h-[95vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 text-metrik-silver hover:text-white transition-colors"
          disabled={loading}
        >
          <X size={24} />
        </button>

        <div className="p-4 sm:p-6 md:p-8">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <div className="flex justify-center mb-2 sm:mb-3 md:mb-4">
              <div className="p-2 sm:p-3 md:p-4 bg-metrik-turquoise/10 rounded-full border border-metrik-turquoise/30">
                {reasonContent.icon}
              </div>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-rajdhani font-black text-white mb-1 sm:mb-2">
              {reasonContent.title}
            </h2>
            <p className="text-metrik-silver text-xs sm:text-sm md:text-base px-2">
              {reasonContent.description}
            </p>
          </div>

          {/* Plan Selector */}
          <div className="grid grid-cols-2 md:grid-cols-2 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              disabled={loading}
              className={`
                relative p-3 sm:p-4 md:p-6 rounded-lg md:rounded-xl border-2 transition-all duration-300
                ${selectedPlan === 'monthly'
                  ? 'border-metrik-turquoise bg-metrik-turquoise/10 md:scale-105'
                  : 'border-metrik-silver/20 bg-metrik-black/50 hover:border-metrik-turquoise/50'
                }
              `}
            >
              {selectedPlan === 'monthly' && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-metrik-turquoise flex items-center justify-center">
                    <Check size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-metrik-black" />
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xs sm:text-sm md:text-lg font-rajdhani font-bold text-white mb-1 sm:mb-2">
                  Monthly
                </h3>
                <div className="mb-1 sm:mb-2 md:mb-4">
                  <span className="text-xl sm:text-2xl md:text-4xl font-rajdhani font-black text-metrik-turquoise">
                    1,99€
                  </span>
                  <span className="text-metrik-silver text-[10px] sm:text-xs md:text-sm ml-0.5 sm:ml-1">/mo</span>
                </div>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-metrik-silver leading-tight">
                  Billed monthly<br className="md:hidden" /><span className="hidden md:inline"> • </span>Cancel anytime
                </p>
              </div>
            </button>

            {/* Annual Plan */}
            <button
              onClick={() => setSelectedPlan('annual')}
              disabled={loading}
              className={`
                relative p-3 sm:p-4 md:p-6 rounded-lg md:rounded-xl border-2 transition-all duration-300
                ${selectedPlan === 'annual'
                  ? 'border-metrik-turquoise bg-metrik-turquoise/10 md:scale-105'
                  : 'border-metrik-silver/20 bg-metrik-black/50 hover:border-metrik-turquoise/50'
                }
              `}
            >
              {/* Best Value Badge - Repositionné en haut à gauche sur mobile, en haut au centre sur desktop */}
              <div className="absolute top-1.5 left-1.5 md:-top-3 md:left-1/2 md:transform md:-translate-x-1/2">
                <div className="px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-0.5 md:py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full">
                  <span className="text-[8px] sm:text-[9px] md:text-xs font-rajdhani font-black text-black uppercase">
                    Best
                  </span>
                </div>
              </div>

              {selectedPlan === 'annual' && (
                <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 md:top-3 md:right-3">
                  <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 rounded-full bg-metrik-turquoise flex items-center justify-center">
                    <Check size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 text-metrik-black" />
                  </div>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xs sm:text-sm md:text-lg font-rajdhani font-bold text-white mb-1 sm:mb-2">
                  Annual
                </h3>
                <div className="mb-1 sm:mb-2">
                  <span className="text-xl sm:text-2xl md:text-4xl font-rajdhani font-black text-metrik-turquoise">
                    14,99€
                  </span>
                  <span className="text-metrik-silver text-[10px] sm:text-xs md:text-sm ml-0.5 sm:ml-1">/yr</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-2 mb-1 sm:mb-2">
                  <span className="text-[9px] sm:text-[10px] md:text-xs text-metrik-silver line-through">
                    23,88€
                  </span>
                  <span className="px-1 sm:px-1.5 md:px-2 py-0.5 bg-green-500/20 border border-green-500/50 rounded text-[8px] sm:text-[9px] md:text-xs font-bold text-green-400">
                    -38%
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] md:text-xs text-metrik-silver leading-tight">
                  Billed yearly<br className="md:hidden" /><span className="hidden md:inline"> • </span>8,89€ saved
                </p>
              </div>
            </button>
          </div>

          {/* Features List */}
          <div className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg md:rounded-xl p-3 sm:p-4 md:p-6 mb-3 sm:mb-4 md:mb-6">
            <h4 className="text-[10px] sm:text-xs md:text-sm font-rajdhani font-bold text-metrik-turquoise uppercase tracking-wide mb-2 sm:mb-3 md:mb-4 flex items-center gap-1.5 sm:gap-2">
              <TrendingUp size={12} className="sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
              What's included in PRO
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 md:gap-3">
              <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3">
                <Check size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-[11px] sm:text-xs md:text-sm leading-tight">2026 Season Access</p>
                  <p className="text-metrik-silver text-[9px] sm:text-[10px] md:text-xs leading-tight">Real-time data from current season</p>
                </div>
              </div>

              <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3">
                <Check size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-[11px] sm:text-xs md:text-sm leading-tight">Live Timing</p>
                  <p className="text-metrik-silver text-[9px] sm:text-[10px] md:text-xs leading-tight">Live data, GPS tracking, sector times & radio</p>
                </div>
              </div>

              <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3">
                <Check size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-[11px] sm:text-xs md:text-sm leading-tight">Full Telemetry</p>
                  <p className="text-metrik-silver text-[9px] sm:text-[10px] md:text-xs leading-tight">Detailed lap-by-lap analysis 2026 season</p>
                </div>
              </div>

              <div className="flex items-start gap-1.5 sm:gap-2 md:gap-3">
                <Check size={14} className="sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] text-metrik-turquoise flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white font-rajdhani font-bold text-[11px] sm:text-xs md:text-sm leading-tight">Historical Data</p>
                  <p className="text-metrik-silver text-[9px] sm:text-[10px] md:text-xs leading-tight">Full access to 1950-2025</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full py-2.5 sm:py-3 md:py-4 px-4 sm:px-4 md:px-6 bg-gradient-to-r from-metrik-turquoise to-cyan-500 hover:from-metrik-turquoise/90 hover:to-cyan-500/90 text-metrik-black font-rajdhani font-black text-sm sm:text-base md:text-lg rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-metrik-turquoise/30"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 sm:w-5 sm:h-5" />
                <span className="text-xs sm:text-sm md:text-base">Processing...</span>
              </>
            ) : user ? (
              <span className="text-xs sm:text-sm md:text-base">
                Upgrade to PRO - {selectedPlan === 'monthly' ? '1,99€/month' : '14,99€/year'}
              </span>
            ) : (
              <span className="text-xs sm:text-sm md:text-base">Sign in to continue</span>
            )}
          </button>

          {/* Footer Note */}
          <p className="text-center text-[9px] sm:text-[10px] md:text-xs text-metrik-silver mt-2 sm:mt-3 md:mt-4 leading-tight px-2">
            Cancel anytime • Secure payment via Stripe • Money-back guarantee
          </p>
        </div>
      </div>
    </div>
  )
}