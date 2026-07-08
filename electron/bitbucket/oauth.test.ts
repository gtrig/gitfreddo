import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

import {
  exchangeAuthorizationCode,
  getBitbucketClientId,
  getBitbucketClientSecret,
  runBitbucketOAuthFlow
} from './oauth'

describe('bitbucket oauth helpers', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
    vi.restoreAllMocks()
  })

  it('reads client credentials from env', () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'
    expect(getBitbucketClientId()).toBe('client-id')
    expect(getBitbucketClientSecret()).toBe('client-secret')
  })

  it('throws when oauth env is missing', async () => {
    delete process.env.BITBUCKET_CLIENT_ID
    delete process.env.BITBUCKET_CLIENT_SECRET
    await expect(runBitbucketOAuthFlow()).rejects.toThrow(/BITBUCKET_CLIENT_ID/)
  })

  it('exchanges authorization code for access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'oauth-token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    const token = await exchangeAuthorizationCode(
      'client-id',
      'client-secret',
      'auth-code',
      'http://127.0.0.1:8765/callback'
    )

    expect(token).toBe('oauth-token')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bitbucket.org/site/oauth2/access_token',
      expect.objectContaining({ method: 'POST' })
    )
  })
})
