import type { BitbucketAuthSettings } from '../../shared/ipc'
import { inferBitbucketAuthType } from '../../shared/integration-settings'

export function resolveBitbucketAuthLogin(
  settings: BitbucketAuthSettings
): string | undefined {
  if (inferBitbucketAuthType(settings) !== 'app_password') {
    return undefined
  }
  const authLogin = settings.bitbucketAuthLogin?.trim()
  if (authLogin) return authLogin
  return settings.bitbucketLogin?.trim() || undefined
}
