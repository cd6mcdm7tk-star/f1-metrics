import { describe, expect, it } from 'vitest'
import { linkError, passwordProblem } from './recovery'

describe('password reset link', () => {
  it('reads nothing wrong in a valid link', () => {
    expect(linkError('https://metrikdelta.com/reset-password#access_token=abc&type=recovery')).toBeNull()
    expect(linkError('https://metrikdelta.com/reset-password?code=123')).toBeNull()
  })

  it('explains an expired or used link, and passes other errors on', () => {
    expect(linkError('https://metrikdelta.com/reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid'))
      .toBe('This reset link has expired or was already used. Ask for a new one.')
    expect(linkError('https://metrikdelta.com/reset-password?error=server_error&error_description=Something+broke')).toBe('Something broke')
  })
})

describe('new password', () => {
  it('needs Supabase\'s minimum length and the same twice', () => {
    expect(passwordProblem('abc', 'abc')).toBe('Use at least 6 characters.')
    expect(passwordProblem('abcdef', 'abcdeg')).toBe('The two passwords are different.')
    expect(passwordProblem('abcdef', 'abcdef')).toBeNull()
  })
})
