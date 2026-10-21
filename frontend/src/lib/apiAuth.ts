import { CURRENT_SEASON_YEAR } from '../utils/season'

/** The signed-in user's token, for a request about the season `year`: the
 * current season's data needs it. Past seasons go without, as plain requests
 * the browser sends without a CORS preflight. Supabase loads on first use, so
 * code that only imports the callers (the statistics tests) needs no settings. */
export async function authHeaders(year: number): Promise<Record<string, string>> {
  if (year < CURRENT_SEASON_YEAR) return {}
  const { supabase } = await import('./supabase')
  const { data: { session } } = await supabase.auth.getSession()
  return session ? { Authorization: `Bearer ${session.access_token}` } : {}
}
