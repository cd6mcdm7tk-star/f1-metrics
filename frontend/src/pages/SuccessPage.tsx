import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, Zap, Radio, Activity, Database } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { Helmet } from 'react-helmet-async'

export default function SuccessPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    const verifyPayment = async () => {
      if (!sessionId) {
        setLoading(false)
        return
      }

      try {
        // Attendre 3 secondes pour laisser le webhook se traiter
        await new Promise(resolve => setTimeout(resolve, 3000))
        setVerified(true)
        setLoading(false)
      } catch (error) {
        console.error('Error verifying payment:', error)
        setLoading(false)
      }
    }

    verifyPayment()
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-metrik-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-metrik-turquoise animate-spin mx-auto mb-4" />
          <p className="text-white text-xl font-rajdhani font-bold">Activation de votre abonnement...</p>
        </div>
      </div>
    )
  }

  return (
    <>
    <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
    <div className="min-h-screen bg-metrik-black flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-3xl w-full backdrop-blur-xl bg-metrik-card/95 border-2 border-metrik-turquoise/50 rounded-xl p-6 sm:p-8 md:p-12 text-center shadow-2xl shadow-metrik-turquoise/20">
        
        {/* Success Icon with glow effect */}
        <div className="mb-6 sm:mb-8 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-metrik-turquoise/30 rounded-full animate-ping"></div>
            <div className="absolute inset-0 bg-metrik-turquoise/20 rounded-full blur-xl"></div>
            <CheckCircle className="w-20 h-20 sm:w-24 sm:h-24 text-metrik-turquoise relative" strokeWidth={2} />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-rajdhani font-black text-white mb-3 sm:mb-4">
          Welcome to METRIK PRO! 🏎️
        </h1>

        {/* Subtitle */}
        <p className="text-metrik-silver text-base sm:text-lg mb-6 sm:mb-8 max-w-2xl mx-auto">
          Your subscription has been activated. You now have full access to the 2026 season and all premium features!
        </p>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            {
              icon: <Activity className="w-5 h-5 sm:w-6 sm:h-6" />,
              title: '2026 Season Access',
              description: 'Real-time data from current season'
            },
            {
              icon: <Radio className="w-5 h-5 sm:w-6 sm:h-6" />,
              title: 'Live Timing',
              description: 'Follow races as they happen'
            },
            {
              icon: <Zap className="w-5 h-5 sm:w-6 sm:h-6" />,
              title: 'Full Telemetry',
              description: 'Detailed lap-by-lap analysis'
            },
            {
              icon: <Database className="w-5 h-5 sm:w-6 sm:h-6" />,
              title: 'Historical Data',
              description: 'Full access to 1950-2025'
            }
          ].map((feature, index) => (
            <div
              key={index}
              className="bg-metrik-black/50 border border-metrik-turquoise/20 rounded-lg p-4 sm:p-5 text-left hover:border-metrik-turquoise/40 transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-metrik-turquoise/10 rounded-lg text-metrik-turquoise flex-shrink-0">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-rajdhani font-bold text-white text-sm sm:text-base mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-metrik-silver text-xs sm:text-sm">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* PRO Badge */}
        <div className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-metrik-turquoise to-cyan-500 text-metrik-black font-rajdhani font-black text-sm sm:text-base rounded-full mb-6 sm:mb-8 shadow-lg shadow-metrik-turquoise/30">
          <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          METRIK PRO ACTIVATED
        </div>

        {/* CTA Button */}
        <button
          onClick={() => navigate('/')}
          className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 bg-metrik-turquoise hover:bg-metrik-turquoise/90 text-metrik-black font-rajdhani font-black text-base sm:text-lg rounded-lg transition-all hover:scale-105 shadow-lg shadow-metrik-turquoise/30"
        >
          Start Exploring →
        </button>

        {/* Footer Info */}
        <p className="text-xs sm:text-sm text-metrik-silver/60 mt-6 sm:mt-8">
          A confirmation email has been sent to your address
        </p>

        {/* Manage Subscription Link */}
        <button
          onClick={() => navigate('/')}
          className="text-xs sm:text-sm text-metrik-turquoise hover:text-metrik-turquoise/80 mt-3 sm:mt-4 font-rajdhani font-bold underline"
        >
          Manage your subscription in Profile menu
        </button>
      </div>
    </div>
    </>
  )
}