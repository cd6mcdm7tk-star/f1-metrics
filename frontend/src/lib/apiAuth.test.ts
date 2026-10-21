import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CURRENT_SEASON_YEAR } from '../utils/season'
import { authHeaders } from './apiAuth'

const session = vi.hoisted(() => ({ current: null as null | { access_token: string } }))
vi.mock('./supabase', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: session.current } }) } },
}))

describe('authHeaders', () => {
  beforeEach(() => { session.current = { access_token: 'token-1' } })

  it('sends the sign-in token with the current season', async () => {
    expect(await authHeaders(CURRENT_SEASON_YEAR)).toEqual({ Authorization: 'Bearer token-1' })
  })

  it('leaves past seasons as plain requests, signed in or not', async () => {
    expect(await authHeaders(CURRENT_SEASON_YEAR - 1)).toEqual({})
  })

  it('sends nothing when nobody is signed in', async () => {
    session.current = null
    expect(await authHeaders(CURRENT_SEASON_YEAR)).toEqual({})
  })
})
