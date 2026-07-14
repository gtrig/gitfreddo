import { isForgeAuthFailure } from '../../shared/forge-auth'
import type { AppSettings } from '../../shared/ipc'

export interface ForgeStatusCheckOptions<TStatus> {
  settings: AppSettings
  hasToken: () => Promise<boolean>
  loadToken: () => Promise<string | null>
  disconnectedStatus: () => TStatus
  /**
   * Called when a non-auth failure occurs and a cached login still exists.
   * Return null to fall through to clearing the connection.
   */
  offlineFallbackStatus?: () => TStatus | null
  fetchConnectedStatus: (
    token: string,
    settings: AppSettings
  ) => Promise<{ settings: AppSettings; status: TStatus }>
  clearConnection: (settings: AppSettings) => Promise<AppSettings>
}

/**
 * Shared forge getStatus lifecycle:
 * token missing → disconnected;
 * fetch user/status;
 * non-auth failure with cached login → offline fallback;
 * auth failure → clear connection.
 */
export async function runForgeStatusCheck<TStatus>(
  options: ForgeStatusCheckOptions<TStatus>
): Promise<{ settings: AppSettings; status: TStatus }> {
  const {
    settings,
    hasToken,
    loadToken,
    disconnectedStatus,
    offlineFallbackStatus,
    fetchConnectedStatus,
    clearConnection
  } = options

  const tokenPresent = await hasToken()
  if (!tokenPresent) {
    return { settings, status: disconnectedStatus() }
  }

  try {
    const token = await loadToken()
    if (!token) {
      return { settings, status: disconnectedStatus() }
    }
    return await fetchConnectedStatus(token, settings)
  } catch (error) {
    if (!isForgeAuthFailure(error)) {
      const fallback = offlineFallbackStatus?.()
      if (fallback) {
        return { settings, status: fallback }
      }
    }
    const cleared = await clearConnection(settings)
    return { settings: cleared, status: disconnectedStatus() }
  }
}

export interface FinalizeForgeConnectionOptions<TStatus> {
  token: string
  saveToken: (token: string) => Promise<void>
  clearRepoCache: () => void
  resolveUser: () => Promise<{ login: string; avatar_url: string }>
  persistConnection: (user: {
    login: string
    avatar_url: string
  }) => Promise<AppSettings>
  toStatus: (settings: AppSettings, user: { login: string; avatar_url: string }) => TStatus
}

export async function finalizeForgeConnection<TStatus>(
  options: FinalizeForgeConnectionOptions<TStatus>
): Promise<{ settings: AppSettings; status: TStatus }> {
  await options.saveToken(options.token)
  options.clearRepoCache()
  const user = await options.resolveUser()
  const settings = await options.persistConnection(user)
  return {
    settings,
    status: options.toStatus(settings, user)
  }
}
