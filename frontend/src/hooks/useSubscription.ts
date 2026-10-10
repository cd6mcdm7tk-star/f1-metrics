import { useAuth } from '../contexts/AuthContext'

// From the clock, so each season becomes free once it's no longer the current one.
export const CURRENT_SEASON_YEAR = new Date().getFullYear()

/**
 * PRO access. Free: every past season. PRO: the current season, plus HD chart export.
 */
export function useSubscription() {
  const { isPremium, premiumLoading } = useAuth()

  const canAccessYear = (year: number): boolean => year < CURRENT_SEASON_YEAR || isPremium

  return {
    isPremium,
    isReady: !premiumLoading,
    canAccessYear,
  }
}
