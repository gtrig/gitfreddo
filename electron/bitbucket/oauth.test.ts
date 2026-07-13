import { get } from 'http'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('electron', () => ({
  shell: { openExternal: vi.fn(async () => undefined) }
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

import { shell } from 'electron'
import { getAuthenticatedUser } from './client'
import {
  exchangeAuthorizationCode,
  getBitbucketClientId,
  getBitbucketClientSecret,
  runBitbucketOAuthFlow
} from './oauth'

function requestCallback(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    get(url, (res) => {
      res.resume()
      resolve(res.statusCode ?? 0)
    }).on('error', reject)
  })
}

function callbackBase(progress: Array<{ authorizationUri?: string }>): string {
  const authorizationUri = progress[0]!.authorizationUri!
  const redirectUri = new URL(authorizationUri).searchParams.get('redirect_uri')!
  const { port } = new URL(redirectUri)
  return `http://127.0.0.1:${port || '8765'}`
}

async function waitForAuthorizationUri(
  progress: Array<{ authorizationUri?: string }>,
  flowPromise: Promise<unknown>
): Promise<string> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (progress[0]?.authorizationUri) {
      return progress[0].authorizationUri
    }
    if (await Promise.race([flowPromise.then(() => 'settled'), Promise.resolve('pending')]) === 'settled') {
      break
    }
    await new Promise((resolve) => setTimeout(resolve, 25))
  }
  throw new Error('Bitbucket OAuth flow did not publish an authorization URI')
}

// OAuth flow tests bind a local HTTP port — run sequentially to avoid EADDRINUSE.
describe.sequential('bitbucket oauth helpers', () => {
  const originalEnv = { ...process.env }
  const activeFlows: Promise<unknown>[] = []

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.GITFREDDO_OAUTH_PORT
  })

  afterEach(async () => {
    await Promise.allSettled(activeFlows.splice(0))
    process.env = originalEnv
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    await new Promise((resolve) => setTimeout(resolve, 100))
  })

  function startFlow(progress: Array<{ authorizationUri?: string }>) {
    const flowPromise = runBitbucketOAuthFlow((value) => progress.push(value))
    activeFlows.push(flowPromise)
    return flowPromise
  }

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

  it('throws when token exchange fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'invalid_grant'
      })
    )

    await expect(
      exchangeAuthorizationCode('id', 'secret', 'code', 'http://127.0.0.1:8765/callback')
    ).rejects.toThrow(/token exchange failed/i)
  })

  it('throws when response omits access token', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ error: 'invalid_request' })
      })
    )

    await expect(
      exchangeAuthorizationCode('id', 'secret', 'code', 'http://127.0.0.1:8765/callback')
    ).rejects.toThrow(/invalid_request/)
  })

  it('rejects when the callback reports an oauth error', async () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'

    const progress: Array<{ authorizationUri?: string }> = []
    const flowPromise = startFlow(progress)
    const authorizationUri = await waitForAuthorizationUri(progress, flowPromise)
    const state = new URL(authorizationUri).searchParams.get('state')!

    const rejection = expect(flowPromise).rejects.toThrow(/authorization failed/i)
    const status = await requestCallback(
      `${callbackBase(progress)}/callback?error=access_denied&state=${state}`
    )
    expect(status).toBe(400)
    await rejection
  })

  it('rejects invalid callback state', async () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'

    const progress: Array<{ authorizationUri?: string }> = []
    const flowPromise = startFlow(progress)
    await waitForAuthorizationUri(progress, flowPromise)
    const base = callbackBase(progress)

    const rejection = expect(flowPromise).rejects.toThrow(/invalid/i)
    const invalidState = await requestCallback(`${base}/callback?code=auth-code&state=wrong`)
    expect(invalidState).toBe(400)
    await rejection
  })

  it('rejects callback when authorization code is missing', async () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'

    const progress: Array<{ authorizationUri?: string }> = []
    const flowPromise = startFlow(progress)
    const authorizationUri = await waitForAuthorizationUri(progress, flowPromise)
    const state = new URL(authorizationUri).searchParams.get('state')!
    const rejection = expect(flowPromise).rejects.toThrow(/invalid/i)
    const missingCode = await requestCallback(`${callbackBase(progress)}/callback?state=${state}`)
    expect(missingCode).toBe(400)
    await rejection
  })

  it('returns 404 for non-callback paths', async () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'

    const progress: Array<{ authorizationUri?: string }> = []
    const flowPromise = startFlow(progress)
    const authorizationUri = await waitForAuthorizationUri(progress, flowPromise)
    const base = callbackBase(progress)
    const state = new URL(authorizationUri).searchParams.get('state')!

    const status = await requestCallback(`${base}/other`)
    expect(status).toBe(404)

    const rejection = expect(flowPromise).rejects.toThrow(/authorization failed/i)
    await requestCallback(`${base}/callback?error=access_denied&state=${state}`)
    await rejection
  })

  it('completes the oauth flow when the callback arrives', async () => {
    process.env.BITBUCKET_CLIENT_ID = 'client-id'
    process.env.BITBUCKET_CLIENT_SECRET = 'client-secret'

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: 'oauth-token' })
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: 'bb-user' } as never)

    const progress: Array<{ status: string; authorizationUri?: string }> = []
    const flowPromise = startFlow(progress)
    const authorizationUri = await waitForAuthorizationUri(progress, flowPromise)
    const state = new URL(authorizationUri).searchParams.get('state')!

    const callbackResponse = await requestCallback(
      `${callbackBase(progress)}/callback?code=auth-code&state=${state}`
    )
    expect(callbackResponse).toBe(200)

    const result = await flowPromise
    expect(shell.openExternal).toHaveBeenCalledWith(authorizationUri)
    expect(progress[1]).toEqual({ status: 'exchanging' })
    expect(getAuthenticatedUser).toHaveBeenCalledWith('oauth-token', 'oauth')
    expect(result).toEqual({ token: 'oauth-token', login: 'bb-user' })
  })
})
