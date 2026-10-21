import { useAuth } from '../contexts/AuthContext'
import { CURRENT_SEASON_YEAR } from '../utils/season'

export { CURRENT_SEASON_YEAR }

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
