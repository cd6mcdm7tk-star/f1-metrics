import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

/**
 * Hook pour gérer l'accès aux fonctionnalités PRO
 * 
 * FREE : Accès à 2018-2025, pas de Live Timing
 * PRO : Accès à toutes les années (2018-2026), Live Timing
 */
export function useSubscription() {
  const { user, isPremium, premiumLoading } = useAuth()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    // Attendre que le statut premium soit chargé
    if (!premiumLoading) {
      setIsReady(true)
    }
  }, [premiumLoading])

  /**
   * Vérifier si l'utilisateur peut accéder à une année donnée
   * FREE : 2018-2025
   * PRO : 2018-2026+
   */
  const canAccessYear = (year: number): boolean => {
    // Les années historiques sont toujours accessibles
    if (year < 2026) {
      return true
    }
    
    // 2026+ nécessite PRO
    return isPremium || false
  }

  /**
   * Vérifier si l'utilisateur peut accéder au Live Timing
   * Nécessite PRO
   */
  const canAccessLiveTiming = (): boolean => {
    return isPremium || false
  }

  /**
   * Obtenir le message de blocage approprié selon la fonctionnalité
   */
  const getUpgradeReason = (feature: 'current_season' | 'live_timing'): string => {
    if (feature === 'current_season') {
      return 'Access to the 2026 season requires METRIK PRO'
    }
    if (feature === 'live_timing') {
      return 'Live Timing is available with METRIK PRO'
    }
    return 'This feature requires METRIK PRO'
  }

  /**
   * Vérifier si une année est la saison en cours (nécessite PRO)
   */
  const isCurrentSeason = (year: number): boolean => {
    const currentYear = new Date().getFullYear()
    return year === currentYear
  }

  /**
   * Obtenir le label à afficher pour une année
   */
  const getYearLabel = (year: number): string => {
    if (year < 2026) {
      return year.toString()
    }
    
    if (isPremium) {
      return `${year} ✨`  // Badge PRO
    }
    
    return `${year} 🔒`  // Badge locked
  }

  return {
    // Status
    isPremium: isPremium || false,
    isLoading: premiumLoading,
    isReady,
    user,
    
    // Access checks
    canAccessYear,
    canAccessLiveTiming,
    isCurrentSeason,
    
    // UI helpers
    getUpgradeReason,
    getYearLabel,
    
    // Backward compatibility avec useRateLimit (deprecated)
    canMakeRequest: true,  // Plus de limite de requêtes
    incrementRequest: () => {},  // No-op
    requestCount: 0,
    dailyLimit: Infinity,
    isUnlimited: isPremium || false,
    resetCount: () => {},
    loading: premiumLoading
  }
}