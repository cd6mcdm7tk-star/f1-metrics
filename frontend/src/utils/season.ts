// The calendar's year
export const CURRENT_SEASON_YEAR = new Date().getFullYear()
/** The season a first visit opens on: the current one once racing has started (March), the last one before */
export const LATEST_SEASON_YEAR = new Date().getMonth() < 2 ? CURRENT_SEASON_YEAR - 1 : CURRENT_SEASON_YEAR
