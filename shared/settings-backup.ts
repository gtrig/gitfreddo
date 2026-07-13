import type { AppSettings } from './ipc'

export const SETTINGS_BACKUP_FORMAT_VERSION = 1

export interface SettingsBackupSecrets {
  githubToken?: string
  bitbucketToken?: string
  gitlabToken?: string
}

export interface SettingsBackupFile {
  formatVersion: typeof SETTINGS_BACKUP_FORMAT_VERSION
  exportedAt: string
  appVersion?: string
  settings: AppSettings
  secrets?: SettingsBackupSecrets
}

export type SettingsBackupParseResult =
  | { ok: true; backup: SettingsBackupFile }
  | { ok: false; error: string }

const REQUIRED_SETTINGS_KEYS: (keyof AppSettings)[] = [
  'theme',
  'locale',
  'gitBinaryPath',
  'recentRepos',
  'pollIntervalMs'
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function looksLikeAppSettings(value: unknown): value is AppSettings {
  if (!isRecord(value)) return false
  return REQUIRED_SETTINGS_KEYS.every((key) => key in value)
}

function normalizeSecrets(value: unknown): SettingsBackupSecrets | undefined {
  if (!isRecord(value)) return undefined

  const secrets: SettingsBackupSecrets = {}
  if (typeof value.githubToken === 'string' && value.githubToken.trim()) {
    secrets.githubToken = value.githubToken
  }
  if (typeof value.bitbucketToken === 'string' && value.bitbucketToken.trim()) {
    secrets.bitbucketToken = value.bitbucketToken
  }
  if (typeof value.gitlabToken === 'string' && value.gitlabToken.trim()) {
    secrets.gitlabToken = value.gitlabToken
  }

  return Object.keys(secrets).length > 0 ? secrets : undefined
}

function normalizeBackup(value: Record<string, unknown>): SettingsBackupParseResult {
  if (value.formatVersion === SETTINGS_BACKUP_FORMAT_VERSION && isRecord(value.settings)) {
    if (!looksLikeAppSettings(value.settings)) {
      return { ok: false, error: 'Backup file is missing required settings fields.' }
    }

    return {
      ok: true,
      backup: {
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt:
          typeof value.exportedAt === 'string' ? value.exportedAt : new Date(0).toISOString(),
        appVersion: typeof value.appVersion === 'string' ? value.appVersion : undefined,
        settings: value.settings as AppSettings,
        secrets: normalizeSecrets(value.secrets)
      }
    }
  }

  if (value.formatVersion !== undefined) {
    return { ok: false, error: 'Unsupported settings backup format version.' }
  }

  if (looksLikeAppSettings(value)) {
    return {
      ok: true,
      backup: {
        formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
        exportedAt: new Date(0).toISOString(),
        settings: value as AppSettings
      }
    }
  }

  return { ok: false, error: 'File does not contain GitFreddo settings.' }
}

export function parseSettingsBackup(raw: string): SettingsBackupParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { ok: false, error: 'Backup file is not valid JSON.' }
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'File does not contain GitFreddo settings.' }
  }

  return normalizeBackup(parsed)
}

export function serializeSettingsBackup(backup: SettingsBackupFile): string {
  return `${JSON.stringify(backup, null, 2)}\n`
}
