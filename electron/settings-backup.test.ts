import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn(),
    showMessageBox: vi.fn()
  }
}))

vi.mock('./settings', () => ({
  loadSettings: vi.fn(),
  saveSettings: vi.fn()
}))

vi.mock('./github/token-store', () => ({
  loadGitHubToken: vi.fn(),
  saveGitHubToken: vi.fn()
}))

vi.mock('./bitbucket/token-store', () => ({
  loadBitbucketToken: vi.fn(),
  saveBitbucketToken: vi.fn()
}))

vi.mock('./gitlab/token-store', () => ({
  loadGitlabToken: vi.fn(),
  saveGitlabToken: vi.fn()
}))

vi.mock('./ai/api-key-store', () => ({
  loadAiApiKey: vi.fn(),
  saveAiApiKey: vi.fn()
}))

import { dialog } from 'electron'
import { loadSettings, saveSettings } from './settings'
import { loadGitHubToken, saveGitHubToken } from './github/token-store'
import { loadBitbucketToken, saveBitbucketToken } from './bitbucket/token-store'
import { loadGitlabToken, saveGitlabToken } from './gitlab/token-store'
import { loadAiApiKey, saveAiApiKey } from './ai/api-key-store'
import {
  buildSettingsBackup,
  exportSettingsBackup,
  importSettingsBackup,
  importSettingsBackupFromFile
} from './settings-backup'
import type { AppSettings } from '../shared/ipc'

const sampleSettings = {
  theme: 'black',
  locale: 'en',
  gitBinaryPath: 'git',
  recentRepos: [],
  openRepoTabs: [],
  activeRepoTab: null,
  pollIntervalMs: 5000,
  defaultRemote: 'origin',
  editorCommand: '',
  logMaxCount: 500,
  aiEnabled: false,
  aiProvider: 'local',
  aiBaseUrl: 'http://localhost:1234',
  aiApiKey: '',
  aiModel: '',
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  aiConflictInstructions: '',
  aiAnalyzeInstructions: '',
  githubLogin: 'octocat',
  githubConnectedAt: 1,
  githubSshKeyTitle: 'GitFreddo key',
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
  pullMode: 'merge',
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true,
  startupModalHiddenUntil: null,
  startupModalHiddenForVersion: null
} satisfies AppSettings

describe('settings backup service', () => {
  let settingsDir = ''

  beforeEach(async () => {
    settingsDir = await mkdtemp(join(tmpdir(), 'gitfreddo-backup-'))
    process.env.GITFREDDO_SETTINGS_DIR = settingsDir
    vi.mocked(loadSettings).mockResolvedValue(sampleSettings)
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(loadGitlabToken).mockResolvedValue(null)
    vi.mocked(loadAiApiKey).mockResolvedValue(null)
    vi.mocked(saveGitHubToken).mockResolvedValue(undefined)
    vi.mocked(saveBitbucketToken).mockResolvedValue(undefined)
    vi.mocked(saveGitlabToken).mockResolvedValue(undefined)
    vi.mocked(saveAiApiKey).mockResolvedValue(undefined)
    vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 0 } as Electron.MessageBoxReturnValue)
  })

  afterEach(() => {
    delete process.env.GITFREDDO_SETTINGS_DIR
    vi.clearAllMocks()
  })

  it('builds a backup payload with stored integration tokens', async () => {
    const backup = await buildSettingsBackup(sampleSettings, '1.0.0')
    expect(backup.settings).toEqual(sampleSettings)
    expect(backup.appVersion).toBe('1.0.0')
    expect(backup.secrets).toEqual({ githubToken: 'gho_test' })
  })

  it('includes gitlab tokens in backup secrets when present', async () => {
    vi.mocked(loadGitlabToken).mockResolvedValue('gl_test')
    const backup = await buildSettingsBackup(sampleSettings, '1.0.0')
    expect(backup.secrets).toEqual({ githubToken: 'gho_test', gitlabToken: 'gl_test' })
  })

  it('includes bitbucket tokens in backup secrets when present', async () => {
    vi.mocked(loadBitbucketToken).mockResolvedValue('bb_test')
    const backup = await buildSettingsBackup(sampleSettings, '1.0.0')
    expect(backup.secrets).toEqual({ githubToken: 'gho_test', bitbucketToken: 'bb_test' })
  })

  it('includes AI API keys in backup secrets and strips them from settings', async () => {
    const withKey = { ...sampleSettings, aiApiKey: 'sk-secret' }
    const backup = await buildSettingsBackup(withKey, '1.0.0')
    expect(backup.settings.aiApiKey).toBe('')
    expect(backup.secrets).toEqual({ githubToken: 'gho_test', aiApiKey: 'sk-secret' })
  })

  it('exports a backup file when the save dialog succeeds', async () => {
    const exportPath = join(settingsDir, 'backup.json')
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: exportPath
    })

    const result = await exportSettingsBackup(sampleSettings, '1.0.0')
    expect(result).toBe(exportPath)
    expect(dialog.showMessageBox).toHaveBeenCalled()

    const raw = await readFile(exportPath, 'utf8')
    expect(raw).toContain('"githubToken": "gho_test"')
    expect(raw).toContain('"githubLogin": "octocat"')
  })

  it('returns null when export warning is cancelled', async () => {
    vi.mocked(dialog.showMessageBox).mockResolvedValue({ response: 1 } as Electron.MessageBoxReturnValue)
    await expect(exportSettingsBackup(sampleSettings, '1.0.0')).resolves.toBeNull()
    expect(dialog.showSaveDialog).not.toHaveBeenCalled()
  })

  it('returns null when export is cancelled', async () => {
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: true,
      filePath: ''
    })
    await expect(exportSettingsBackup(sampleSettings, '1.0.0')).resolves.toBeNull()
  })

  it('imports a backup file and restores tokens', async () => {
    const importPath = join(settingsDir, 'restore.json')
    await writeFile(
      importPath,
      JSON.stringify(
        {
          formatVersion: 1,
          exportedAt: '2026-07-08T08:00:00.000Z',
          settings: { ...sampleSettings, theme: 'iced-latte', locale: 'el' },
          secrets: { githubToken: 'gho_restore', bitbucketToken: 'bb_restore' }
        },
        null,
        2
      ),
      'utf8'
    )

    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: [importPath]
    })
    vi.mocked(loadSettings).mockResolvedValue({ ...sampleSettings, theme: 'iced-latte', locale: 'el' })
    vi.mocked(saveSettings).mockResolvedValue({ ...sampleSettings, theme: 'iced-latte', locale: 'el' })

    const restored = await importSettingsBackup()
    expect(restored).toEqual({ ...sampleSettings, theme: 'iced-latte', locale: 'el' })
    expect(saveSettings).toHaveBeenCalledWith({ ...sampleSettings, theme: 'iced-latte', locale: 'el' })
    expect(saveGitHubToken).toHaveBeenCalledWith('gho_restore')
    expect(saveBitbucketToken).toHaveBeenCalledWith('bb_restore')
    expect(saveGitlabToken).not.toHaveBeenCalled()
  })

  it('returns null when import is cancelled', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: true,
      filePaths: []
    })
    await expect(importSettingsBackup()).resolves.toBeNull()
  })

  it('imports directly from a provided file path', async () => {
    const importPath = join(settingsDir, 'direct.json')
    await writeFile(
      importPath,
      JSON.stringify({
        formatVersion: 1,
        exportedAt: '2026-07-08T08:00:00.000Z',
        settings: { ...sampleSettings, locale: 'el' },
        secrets: { gitlabToken: 'gl_restore' }
      }),
      'utf8'
    )
    vi.mocked(loadSettings).mockResolvedValue({ ...sampleSettings, locale: 'el' })
    vi.mocked(saveSettings).mockResolvedValue({ ...sampleSettings, locale: 'el' })

    const restored = await importSettingsBackupFromFile(importPath)
    expect(restored.locale).toBe('el')
    expect(saveGitlabToken).toHaveBeenCalledWith('gl_restore')
  })

  it('throws when import file is invalid', async () => {
    const importPath = join(settingsDir, 'bad.json')
    await writeFile(importPath, '{', 'utf8')
    vi.mocked(dialog.showOpenDialog).mockResolvedValue({
      canceled: false,
      filePaths: [importPath]
    })

    await expect(importSettingsBackup()).rejects.toThrow(/json/i)
  })
})
