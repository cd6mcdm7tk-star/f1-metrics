import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

// Computed, not hardcoded — the gate used to be a literal `2026`, which
// would've silently kept gating 2026 forever (and never gating 2027) once
// the calendar actually moved past it. Deriving it from the real clock
// means free users automatically gain each season once it's no longer the
// current one, with no annual code change needed.
export const CURRENT_SEASON_YEAR = new Date().getFullYear()

/**
 * Hook pour gérer l'accès aux fonctionnalités PRO
 *
 * FREE : Accès à toutes les saisons passées
 * PRO : Accès à la saison en cours, export HD des graphiques
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
   * FREE : années passées
   * PRO : saison en cours (et au-delà)
   */
  const canAccessYear = (year: number): boolean => {
    // Les années historiques sont toujours accessibles
    if (year < CURRENT_SEASON_YEAR) {
      return true
    }

    // Saison en cours (et au-delà) nécessite PRO
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
      return `Access to the ${CURRENT_SEASON_YEAR} season requires METRIK PRO`
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
    return year === CURRENT_SEASON_YEAR
  }

  /**
   * Obtenir le label à afficher pour une année
   */
  const getYearLabel = (year: number): string => {
    if (year < CURRENT_SEASON_YEAR) {
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