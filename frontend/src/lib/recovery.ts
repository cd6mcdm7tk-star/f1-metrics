/** Where Supabase's password reset links land (also in vercel.json's rewrites) */
export const RESET_PASSWORD_PATH = '/reset-password'

/** Supabase's own minimum password length */
export const MIN_PASSWORD_LENGTH = 6

/** Why a reset link can't be used, when Supabase sent it back with an error
 * (expired, already used), from the URL's fragment or query */
export function linkError(url: string): string | null {
  const { hash, searchParams } = new URL(url)
  const fragment = new URLSearchParams(hash.replace(/^#/, ''))
  const code = fragment.get('error_code') ?? searchParams.get('error_code')
  const description = fragment.get('error_description') ?? searchParams.get('error_description')
  if (!code && !description) return null
  if (code === 'otp_expired') return 'This reset link has expired or was already used. Ask for a new one.'
  return description ?? 'This reset link is not valid. Ask for a new one.'
}

/** What is wrong with a new password and its confirmation, if anything */
export function passwordProblem(password: string, confirmation: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Use at least ${MIN_PASSWORD_LENGTH} characters.`
  if (password !== confirmation) return 'The two passwords are different.'
  return null
}
