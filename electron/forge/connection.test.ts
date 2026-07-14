import { describe, expect, it, vi } from 'vitest'
import { finalizeForgeConnection, runForgeStatusCheck } from './connection'

vi.mock('../../shared/forge-auth', () => ({
  isForgeAuthFailure: (error: unknown) =>
    error instanceof Error && error.message.includes('401')
}))

describe('runForgeStatusCheck', () => {
  it('returns disconnected when no token is present', async () => {
    const result = await runForgeStatusCheck({
      settings: {} as never,
      hasToken: async () => false,
      loadToken: async () => null,
      disconnectedStatus: () => ({ connected: false }),
      fetchConnectedStatus: async () => {
        throw new Error('should not run')
      },
      clearConnection: async (settings) => settings
    })
    expect(result.status).toEqual({ connected: false })
  })

  it('returns connected status from fetchConnectedStatus', async () => {
    const result = await runForgeStatusCheck({
      settings: { githubLogin: 'old' } as never,
      hasToken: async () => true,
      loadToken: async () => 'tok',
      disconnectedStatus: () => ({ connected: false }),
      fetchConnectedStatus: async () => ({
        settings: { githubLogin: 'new' } as never,
        status: { connected: true, login: 'new' }
      }),
      clearConnection: async (settings) => settings
    })
    expect(result.status).toEqual({ connected: true, login: 'new' })
    expect(result.settings).toEqual({ githubLogin: 'new' })
  })

  it('uses offline fallback for non-auth failures', async () => {
    const result = await runForgeStatusCheck({
      settings: {} as never,
      hasToken: async () => true,
      loadToken: async () => 'tok',
      disconnectedStatus: () => ({ connected: false }),
      offlineFallbackStatus: () => ({ connected: true, login: 'cached' }),
      fetchConnectedStatus: async () => {
        throw new Error('network down')
      },
      clearConnection: async () => {
        throw new Error('should not clear')
      }
    })
    expect(result.status).toEqual({ connected: true, login: 'cached' })
  })

  it('clears the connection on auth failure', async () => {
    const clearConnection = vi.fn(async () => ({ cleared: true }) as never)
    const result = await runForgeStatusCheck({
      settings: {} as never,
      hasToken: async () => true,
      loadToken: async () => 'tok',
      disconnectedStatus: () => ({ connected: false }),
      offlineFallbackStatus: () => ({ connected: true, login: 'cached' }),
      fetchConnectedStatus: async () => {
        throw new Error('401 unauthorized')
      },
      clearConnection
    })
    expect(clearConnection).toHaveBeenCalled()
    expect(result.settings).toEqual({ cleared: true })
    expect(result.status).toEqual({ connected: false })
  })
})

describe('finalizeForgeConnection', () => {
  it('saves token, clears cache, persists settings, and returns status', async () => {
    const saveToken = vi.fn(async () => undefined)
    const clearRepoCache = vi.fn()
    const result = await finalizeForgeConnection({
      token: 'tok',
      saveToken,
      clearRepoCache,
      resolveUser: async () => ({ login: 'alice', avatar_url: 'http://a' }),
      persistConnection: async (user) =>
        ({ githubLogin: user.login, githubSshKeyTitle: 'key' }) as never,
      toStatus: (settings, user) => ({
        connected: true,
        login: user.login,
        ssh: settings.githubSshKeyTitle
      })
    })

    expect(saveToken).toHaveBeenCalledWith('tok')
    expect(clearRepoCache).toHaveBeenCalled()
    expect(result.settings).toEqual({ githubLogin: 'alice', githubSshKeyTitle: 'key' })
    expect(result.status).toEqual({ connected: true, login: 'alice', ssh: 'key' })
  })
})
