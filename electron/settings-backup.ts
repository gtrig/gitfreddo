import { dialog } from 'electron'
import { writeFile } from 'fs/promises'
import {
  parseSettingsBackup,
  serializeSettingsBackup,
  type SettingsBackupFile
} from '../shared/settings-backup'
import type { AppSettings } from '../shared/ipc'
import { loadSettings, saveSettings } from './settings'
import { loadGitHubToken, saveGitHubToken } from './github/token-store'
import { loadBitbucketToken, saveBitbucketToken } from './bitbucket/token-store'

function defaultBackupFilename(): string {
  const date = new Date().toISOString().slice(0, 10)
  return `gitfreddo-settings-backup-${date}.json`
}

export async function buildSettingsBackup(
  settings: AppSettings,
  appVersion: string
): Promise<SettingsBackupFile> {
  const githubToken = await loadGitHubToken()
  const bitbucketToken = await loadBitbucketToken()
  const secrets =
    githubToken || bitbucketToken
      ? {
          ...(githubToken ? { githubToken } : {}),
          ...(bitbucketToken ? { bitbucketToken } : {})
        }
      : undefined

  return {
    formatVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    settings,
    secrets
  }
}

export async function exportSettingsBackup(
  settings: AppSettings,
  appVersion: string
): Promise<string | null> {
  const result = await dialog.showSaveDialog({
    title: 'Export GitFreddo settings',
    defaultPath: defaultBackupFilename(),
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || !result.filePath) {
    return null
  }

  const backup = await buildSettingsBackup(settings, appVersion)
  await writeFile(result.filePath, serializeSettingsBackup(backup), 'utf8')
  return result.filePath
}

async function restoreIntegrationTokens(secrets: SettingsBackupFile['secrets']): Promise<void> {
  if (!secrets) {
    return
  }

  if (secrets.githubToken) {
    await saveGitHubToken(secrets.githubToken)
  }

  if (secrets.bitbucketToken) {
    await saveBitbucketToken(secrets.bitbucketToken)
  }
}

export async function importSettingsBackupFromFile(filePath: string): Promise<AppSettings> {
  const { readFile } = await import('fs/promises')
  const raw = await readFile(filePath, 'utf8')
  const parsed = parseSettingsBackup(raw)
  if (!parsed.ok) {
    throw new Error(parsed.error)
  }

  await saveSettings(parsed.backup.settings)
  await restoreIntegrationTokens(parsed.backup.secrets)
  return loadSettings()
}

export async function importSettingsBackup(): Promise<AppSettings | null> {
  const result = await dialog.showOpenDialog({
    title: 'Import GitFreddo settings',
    properties: ['openFile'],
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return null
  }

  return importSettingsBackupFromFile(result.filePaths[0])
}
