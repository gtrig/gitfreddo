import { describe, expect, it } from 'vitest'
import type { AppSettings } from './ipc'
import {
  SETTINGS_BACKUP_FORMAT_VERSION,
  parseSettingsBackup,
  serializeSettingsBackup,
  type SettingsBackupFile
} from './settings-backup'

const sampleSettings: AppSettings = {
  theme: 'black',
  locale: 'en',
  gitBinaryPath: 'git',
  recentRepos: ['/tmp/repo'],
  openRepoTabs: [],
  activeRepoTab: null,
  pollIntervalMs: 5000,
  defaultRemote: 'origin',
  editorCommand: '',
  logMaxCount: 500,
  aiEnabled: true,
  aiProvider: 'api',
  aiBaseUrl: 'https://api.example.com',
  aiApiKey: 'sk-test',
  aiModel: 'gpt-4',
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  aiConflictInstructions: '',
  githubLogin: 'octocat',
  githubConnectedAt: 1_700_000_000_000,
  githubSshKeyTitle: '',
  bitbucketLogin: '',
  bitbucketAuthLogin: '',
  bitbucketConnectedAt: null,
  bitbucketAuthType: null,
  bitbucketSshKeyTitle: '',
  gitlabLogin: '',
  gitlabConnectedAt: null,
  gitlabAuthType: null,
  gitlabSshKeyTitle: '',
  gitlabHost: 'gitlab.com',
  pullRebase: false,
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true,
  startupModalHiddenUntil: null,
  startupModalHiddenForVersion: null
}

describe('settings backup format', () => {
  it('serializes and parses a versioned backup file', () => {
    const backup: SettingsBackupFile = {
      formatVersion: SETTINGS_BACKUP_FORMAT_VERSION,
      exportedAt: '2026-07-08T08:00:00.000Z',
      appVersion: '1.2.3',
      settings: sampleSettings,
      secrets: {
        githubToken: 'gho_test',
        bitbucketToken: 'bb_test'
      }
    }

    const parsed = parseSettingsBackup(serializeSettingsBackup(backup))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.backup).toEqual(backup)
  })

  it('accepts legacy plain settings.json exports', () => {
    const parsed = parseSettingsBackup(JSON.stringify(sampleSettings))
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.backup.settings).toEqual(sampleSettings)
    expect(parsed.backup.formatVersion).toBe(SETTINGS_BACKUP_FORMAT_VERSION)
    expect(parsed.backup.secrets).toBeUndefined()
  })

  it('rejects invalid JSON', () => {
    const parsed = parseSettingsBackup('{not json')
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toMatch(/json/i)
  })

  it('rejects backups without recognizable settings', () => {
    const parsed = parseSettingsBackup(JSON.stringify({ formatVersion: 1, settings: { theme: 'black' } }))
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toMatch(/settings/i)
  })

  it('rejects unsupported format versions', () => {
    const parsed = parseSettingsBackup(
      JSON.stringify({
        formatVersion: 99,
        exportedAt: '2026-07-08T08:00:00.000Z',
        settings: sampleSettings
      })
    )
    expect(parsed.ok).toBe(false)
    if (parsed.ok) return
    expect(parsed.error).toMatch(/version/i)
  })
})
