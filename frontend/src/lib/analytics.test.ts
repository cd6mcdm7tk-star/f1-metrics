import { describe, expect, it } from 'vitest'
import { analyticsUrl } from './analytics'

describe('page address sent to analytics', () => {
  it('drops tokens from the query and the hash', () => {
    expect(analyticsUrl('https://metrikdelta.com/reset-password?token_hash=abc123&type=recovery')).toBe('https://metrikdelta.com/reset-password')
    expect(analyticsUrl('https://metrikdelta.com/success?session_id=cs_live_1')).toBe('https://metrikdelta.com/success')
    expect(analyticsUrl('https://metrikdelta.com/#access_token=abc&type=recovery')).toBe('https://metrikdelta.com/')
  })

  it('keeps campaign tags', () => {
    expect(analyticsUrl('https://metrikdelta.com/app?utm_source=reddit&ref=x&utm_campaign=austin'))
      .toBe('https://metrikdelta.com/app?utm_source=reddit&utm_campaign=austin')
  })
})
