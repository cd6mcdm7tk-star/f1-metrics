import { X, Zap, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useTranslation } from 'react-i18next'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onUpgrade: () => void
}

export default function UpgradeModal({ isOpen, onClose, onUpgrade }: UpgradeModalProps) {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
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
          user_id: user.id
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
      alert('Erreur lors de la création de la session de paiement')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-lg border border-gray-800 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          disabled={loading}
        >
          <X size={24} />
        </button>

        <div className="p-8">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-metrik-turquoise/10 rounded-full">
              <Zap size={48} className="text-metrik-turquoise" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {t('rateLimit.title')}
          </h2>

          <div className="bg-gradient-to-br from-metrik-turquoise/10 to-transparent border border-metrik-turquoise/30 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{t('upgrade.title')}</h3>
              <div className="text-right">
                <p className="text-2xl font-bold text-metrik-turquoise">{t('upgrade.price')}</p>
                <p className="text-xs text-gray-400">par mois</p>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              <li className="flex items-center gap-3 text-gray-300">
                <Check size={20} className="text-metrik-turquoise flex-shrink-0" />
                <span>{t('upgrade.features.unlimited')}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check size={20} className="text-metrik-turquoise flex-shrink-0" />
                <span>{t('upgrade.features.exclusive')}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check size={20} className="text-metrik-turquoise flex-shrink-0" />
                <span>{t('upgrade.features.export')}</span>
              </li>
              <li className="flex items-center gap-3 text-gray-300">
                <Check size={20} className="text-metrik-turquoise flex-shrink-0" />
                <span>{t('upgrade.features.priority')}</span>
              </li>
            </ul>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 px-4 bg-metrik-turquoise hover:bg-[#00d4bb] text-black font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  {t('common.loading')}...
                </>
              ) : user ? (
                t('upgrade.cta')
              ) : (
                t('nav.login')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}