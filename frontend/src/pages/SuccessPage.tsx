import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckCircle, Loader2, Home } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

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
        // Attendre 2 secondes pour laisser le webhook se traiter
        await new Promise(resolve => setTimeout(resolve, 2000))
        
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
          <Loader2 className="w-16 h-16 text-turquoise-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Vérification du paiement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-metrik-black flex items-center justify-center p-6">
      <div className="max-w-2xl w-full bg-metrik-card rounded-2xl border border-turquoise-500/30 p-8 md:p-12 text-center">
        {/* Success Icon with animation */}
        <div className="mb-6 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-turquoise-500/20 rounded-full animate-ping"></div>
            <CheckCircle className="w-24 h-24 text-turquoise-500 relative" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Bienvenue dans METRIK+ ! 🎉
        </h1>

        {/* Description */}
        <p className="text-gray-300 text-lg mb-8">
          Votre abonnement a été activé avec succès. Vous avez maintenant accès à toutes les fonctionnalités premium !
        </p>

        {/* Features */}
        <div className="bg-metrik-black/50 rounded-xl p-6 mb-8 border border-turquoise-500/20">
          <h2 className="text-xl font-bold text-turquoise-500 mb-4">
            Ce qui est débloqué :
          </h2>
          <ul className="space-y-3 text-left">
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-turquoise-500 flex-shrink-0" />
              <span>Requêtes illimitées sur toutes les analyses</span>
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-turquoise-500 flex-shrink-0" />
              <span>Accès à l'easter egg exclusif</span>
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-turquoise-500 flex-shrink-0" />
              <span>Export PDF et PNG (bientôt disponible)</span>
            </li>
            <li className="flex items-center gap-3 text-gray-300">
              <CheckCircle className="w-5 h-5 text-turquoise-500 flex-shrink-0" />
              <span>Support prioritaire</span>
            </li>
          </ul>
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate('/')}
          className="w-full md:w-auto px-8 py-4 bg-turquoise-500 hover:bg-[#00d4bb] text-black font-bold rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto"
        >
          <Home className="w-5 h-5" />
          Commencer l'exploration
        </button>

        {/* Info */}
        <p className="text-sm text-gray-500 mt-6">
          Un email de confirmation a été envoyé à votre adresse
        </p>
      </div>
    </div>
  )
}