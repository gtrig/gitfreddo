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
  getGitHubClientId,
  pollForAccessToken,
  requestDeviceCode,
  runGitHubDeviceFlow
} from './oauth'

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

  it('throws when GitHub returns an incomplete device payload', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ device_code: 'only-device' })
    } as Response)

    await expect(requestDeviceCode('test-client-id')).rejects.toThrow(/invalid response/i)
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

  it('backs off when GitHub requests slow_down', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ error: 'slow_down', interval: 8 })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'delayed-token' })
      } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    await vi.advanceTimersByTimeAsync(9000)
    await vi.advanceTimersByTimeAsync(9000)
    await expect(promise).resolves.toBe('delayed-token')
  })

  it('throws when authorization is denied', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'access_denied' })
    } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    const assertion = expect(promise).rejects.toThrow(/denied/i)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('throws when the device code expires', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'expired_token' })
    } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    const assertion = expect(promise).rejects.toThrow(/expired/i)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('throws unknown OAuth errors with a description', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'bad_verification_code', error_description: 'Try again' })
    } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    const assertion = expect(promise).rejects.toThrow('Try again')
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('throws when polling fails with a non-OK response', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'server error'
    } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 120)
    const assertion = expect(promise).rejects.toThrow(/token poll failed/i)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
  })

  it('times out when authorization never completes', async () => {
    const mockFetch = vi.mocked(fetch)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'authorization_pending' })
    } as Response)

    const promise = pollForAccessToken('client', 'device-code', 5, 10)
    const assertion = expect(promise).rejects.toThrow(/timed out/i)
    await vi.advanceTimersByTimeAsync(15000)
    await assertion
  })
})

describe('runGitHubDeviceFlow', () => {
  const original = process.env.GITHUB_CLIENT_ID

  beforeEach(() => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
    if (original === undefined) {
      delete process.env.GITHUB_CLIENT_ID
    } else {
      process.env.GITHUB_CLIENT_ID = original
    }
    vi.unstubAllGlobals()
  })

  it('throws when GITHUB_CLIENT_ID is not configured', async () => {
    delete process.env.GITHUB_CLIENT_ID
    await expect(runGitHubDeviceFlow()).rejects.toThrow(/GITHUB_CLIENT_ID/)
  })

  it('opens the verification page and returns token plus login', async () => {
    process.env.GITHUB_CLIENT_ID = 'client-id'
    const mockFetch = vi.mocked(fetch)
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          device_code: 'device',
          user_code: 'ABCD-1234',
          verification_uri: 'https://github.com/login/device',
          expires_in: 900,
          interval: 5
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'gh-token' })
      } as Response)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({ login: 'octocat' } as never)

    const progress: Array<{ userCode: string; verificationUri: string }> = []
    const flowPromise = runGitHubDeviceFlow((value) => progress.push(value))
    await vi.advanceTimersByTimeAsync(5000)
    const result = await flowPromise

    expect(shell.openExternal).toHaveBeenCalledWith('https://github.com/login/device')
    expect(progress).toEqual([
      { userCode: 'ABCD-1234', verificationUri: 'https://github.com/login/device' }
    ])
    expect(getAuthenticatedUser).toHaveBeenCalledWith('gh-token')
    expect(result).toEqual({ token: 'gh-token', login: 'octocat' })
  })
})
