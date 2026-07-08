import type { BitbucketAuthSettings } from '../../shared/ipc'

export function resolveBitbucketAuthLogin(
  settings: BitbucketAuthSettings
): string | undefined {
  if (settings.bitbucketAuthType !== 'app_password') {
    return undefined
  }
  const authLogin = settings.bitbucketAuthLogin?.trim()
  if (authLogin) return authLogin
  return settings.bitbucketLogin?.trim() || undefined
}
