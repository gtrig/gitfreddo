import type { AppSettings, BitbucketAuthSettings } from './ipc'

export const INTEGRATION_SETTINGS_KEYS = [
  'githubLogin',
  'githubConnectedAt',
  'githubSshKeyTitle',
  'bitbucketLogin',
  'bitbucketAuthLogin',
  'bitbucketConnectedAt',
  'bitbucketAuthType',
  'bitbucketSshKeyTitle',
  'gitlabLogin',
  'gitlabConnectedAt',
  'gitlabAuthType',
  'gitlabSshKeyTitle',
  'gitlabHost'
] as const satisfies readonly (keyof AppSettings)[]

export const SESSION_SETTINGS_KEYS = [
  'recentRepos',
  'openRepoTabs',
  'activeRepoTab'
] as const satisfies readonly (keyof AppSettings)[]

const excludedFromUserSave = new Set<string>([
  ...INTEGRATION_SETTINGS_KEYS,
  ...SESSION_SETTINGS_KEYS
])

export function pickUserSettings(settings: AppSettings): Partial<AppSettings> {
  return Object.fromEntries(
    Object.entries(settings).filter(([key]) => !excludedFromUserSave.has(key))
  ) as Partial<AppSettings>
}

export function inferBitbucketAuthType(
  settings: BitbucketAuthSettings
): NonNullable<AppSettings['bitbucketAuthType']> {
  if (settings.bitbucketAuthType === 'oauth' || settings.bitbucketAuthType === 'app_password') {
    return settings.bitbucketAuthType
  }
  if (settings.bitbucketAuthLogin?.includes('@')) {
    return 'app_password'
  }
  if (settings.bitbucketLogin?.includes('@')) {
    return 'app_password'
  }
  return 'oauth'
}

function patchClearsGitlabIntegration(patch: Partial<AppSettings>): boolean {
  return (
    ('gitlabLogin' in patch && !patch.gitlabLogin?.trim()) ||
    ('gitlabAuthType' in patch && !patch.gitlabAuthType) ||
    ('gitlabConnectedAt' in patch && patch.gitlabConnectedAt == null)
  )
}

function patchClearsBitbucketIntegration(patch: Partial<AppSettings>): boolean {
  return (
    ('bitbucketLogin' in patch && !patch.bitbucketLogin?.trim()) ||
    ('bitbucketAuthLogin' in patch && !patch.bitbucketAuthLogin?.trim()) ||
    ('bitbucketAuthType' in patch && !patch.bitbucketAuthType) ||
    ('bitbucketConnectedAt' in patch && patch.bitbucketConnectedAt == null)
  )
}

function patchClearsGitHubIntegration(patch: Partial<AppSettings>): boolean {
  return (
    ('githubLogin' in patch && !patch.githubLogin?.trim()) ||
    ('githubConnectedAt' in patch && patch.githubConnectedAt == null)
  )
}

export function preserveIntegrationSettings(
  current: AppSettings,
  patch: Partial<AppSettings>,
  options: { hasBitbucketToken: boolean; hasGitHubToken: boolean; hasGitlabToken: boolean }
): Partial<AppSettings> {
  const next = { ...patch }

  if (options.hasBitbucketToken && patchClearsBitbucketIntegration(patch)) {
    next.bitbucketLogin = current.bitbucketLogin
    next.bitbucketAuthLogin = current.bitbucketAuthLogin
    next.bitbucketConnectedAt = current.bitbucketConnectedAt
    next.bitbucketAuthType = current.bitbucketAuthType
    next.bitbucketSshKeyTitle = current.bitbucketSshKeyTitle
  }

  if (options.hasGitHubToken && patchClearsGitHubIntegration(patch)) {
    next.githubLogin = current.githubLogin
    next.githubConnectedAt = current.githubConnectedAt
    next.githubSshKeyTitle = current.githubSshKeyTitle
  }

  if (options.hasGitlabToken && patchClearsGitlabIntegration(patch)) {
    next.gitlabLogin = current.gitlabLogin
    next.gitlabConnectedAt = current.gitlabConnectedAt
    next.gitlabAuthType = current.gitlabAuthType
    next.gitlabSshKeyTitle = current.gitlabSshKeyTitle
    next.gitlabHost = current.gitlabHost
  }

  return next
}
