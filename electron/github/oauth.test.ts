import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { getGitHubClientId, pollForAccessToken, requestDeviceCode } from './oauth'

describe('getGitHubClientId', () => {
  const original = process.env.GITHUB_CLIENT_ID

  afterEach(() => {
    if (original === undefined) {
      delete process.env.GITHUB_CLIENT_ID
    } else {
      process.env.GITHUB_CLIENT_ID = original
    }
  })

  it('returns trimmed env value when set', () => {
    process.env.GITHUB_CLIENT_ID = '  abc123  '
    expect(getGitHubClientId()).toBe('abc123')
  })

  it('returns empty string when unset', () => {
    delete process.env.GITHUB_CLIENT_ID
    expect(getGitHubClientId()).toBe('')
  })
})

describe('requestDeviceCode', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('posts client_id and scope to GitHub device endpoint', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        device_code: 'device',
        user_code: 'ABCD-1234',
        verification_uri: 'https://github.com/login/device',
        expires_in: 900,
        interval: 5
      })
    } as Response)

    const result = await requestDeviceCode('test-client-id')

    expect(mockFetch).toHaveBeenCalledWith(
      'https://github.com/login/device/code',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          client_id: 'test-client-id',
          scope: 'repo admin:public_key workflow'
        })
      })
    )
    expect(result.user_code).toBe('ABCD-1234')
    expect(result.device_code).toBe('device')
  })

  it('throws when GitHub returns an error', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => 'bad request'
    } as Response)

    await expect(requestDeviceCode('test-client-id')).rejects.toThrow(
      'Failed to start GitHub device flow (400)'
    )
  })
})

describe('pollForAccessToken', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('returns an access token when authorization completes', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'authorization_pending' })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gh-token' })
      } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    await vi.advanceTimersByTimeAsync(5000)
    await vi.advanceTimersByTimeAsync(5000)
    await expect(promise).resolves.toBe('gh-token')
  })
})
