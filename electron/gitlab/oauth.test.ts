import { get as httpGet } from 'http'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const resolvedEnv = {
  gitlabClientId: 'client-id',
  gitlabClientSecret: 'client-secret',
  gitlabHost: ''
}

vi.mock('../forge-oauth-env', () => ({
  getResolvedForgeOAuthEnv: vi.fn(() => resolvedEnv)
}))

vi.mock('./api/http', () => ({
  getGitlabWebBase: vi.fn(() => 'https://gitlab.com')
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

const openExternal = vi.fn()

vi.mock('electron', () => ({
  shell: { openExternal: (...args: unknown[]) => openExternal(...args) }
}))

import { getAuthenticatedUser } from './client'
import {
  exchangeAuthorizationCode,
  getGitlabClientId,
  getGitlabClientSecret,
  runGitlabOAuthFlow
} from './oauth'

describe('gitlab oauth', () => {
  beforeEach(() => {
    resolvedEnv.gitlabClientId = 'client-id'
    resolvedEnv.gitlabClientSecret = 'client-secret'
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes the configured client id and secret', () => {
    expect(getGitlabClientId()).toBe('client-id')
    expect(getGitlabClientSecret()).toBe('client-secret')
  })

  it('exchanges an authorization code for an access token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'gl-token' })
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      exchangeAuthorizationCode('id', 'secret', 'code', 'http://127.0.0.1:8785/callback')
    ).resolves.toBe('gl-token')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://gitlab.com/oauth/token',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('throws when the token exchange fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid_grant'
      })
    )

    await expect(
      exchangeAuthorizationCode('id', 'secret', 'code', 'http://127.0.0.1:8785/callback')
    ).rejects.toThrow(/token exchange failed/i)
  })

  it('throws when no access token is returned', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ error: 'nope' })
      })
    )

    await expect(
      exchangeAuthorizationCode('id', 'secret', 'code', 'http://127.0.0.1:8785/callback')
    ).rejects.toThrow(/nope/i)
  })

  it('throws when OAuth credentials are not configured', async () => {
    resolvedEnv.gitlabClientId = ''
    resolvedEnv.gitlabClientSecret = ''

    await expect(runGitlabOAuthFlow(null)).rejects.toThrow(/GITLAB_CLIENT_ID/)
  })

  it('completes the full OAuth flow through the callback server', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'gl-token' })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: 'gtrig', avatar_url: '' })

    openExternal.mockImplementation(async (uri: string) => {
      const url = new URL(uri)
      const redirectUri = url.searchParams.get('redirect_uri') as string
      const state = url.searchParams.get('state') as string
      await new Promise<void>((resolve, reject) => {
        httpGet(`${redirectUri}?code=the-code&state=${state}`, (res) => {
          res.resume()
          res.on('end', () => resolve())
        }).on('error', reject)
      })
    })

    const events: string[] = []
    const result = await runGitlabOAuthFlow(null, (p) => events.push(p.status))

    expect(result).toEqual({ token: 'gl-token', login: 'gtrig' })
    expect(events).toEqual(expect.arrayContaining(['waiting', 'exchanging']))
    expect(getAuthenticatedUser).toHaveBeenCalledWith('gl-token', null)
  })
})
