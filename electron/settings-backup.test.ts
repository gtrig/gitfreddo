import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { mkdtemp, readFile, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

vi.mock('electron', () => ({
  dialog: {
    showSaveDialog: vi.fn(),
    showOpenDialog: vi.fn()
  }
}))

vi.mock('./settings', () => ({
  loadSettings: vi.fn()
}))

vi.mock('./github/token-store', () => ({
  loadGitHubToken: vi.fn(),
  saveGitHubToken: vi.fn()
}))

vi.mock('./bitbucket/token-store', () => ({
  loadBitbucketToken: vi.fn(),
  saveBitbucketToken: vi.fn()
}))

import { dialog } from 'electron'
import { loadSettings } from './settings'
import { loadGitHubToken, saveGitHubToken } from './github/token-store'
import { loadBitbucketToken, saveBitbucketToken } from './bitbucket/token-store'
import { buildSettingsBackup, exportSettingsBackup, importSettingsBackup } from './settings-backup'
import type { AppSettings } from '../shared/ipc'

const sampleSettings = {
  theme: 'dark',
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
  githubLogin: 'octocat',
  githubConnectedAt: 1,
  githubSshKeyTitle: 'GitFreddo key',
  bitbucketLogin: '',
  bitbucketAuthLogin: '',
  bitbucketConnectedAt: null,
  bitbucketAuthType: null,
  bitbucketSshKeyTitle: '',
  pullRebase: false,
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true
} satisfies AppSettings

describe('settings backup service', () => {
  let settingsDir = ''

  beforeEach(async () => {
    settingsDir = await mkdtemp(join(tmpdir(), 'gitfreddo-backup-'))
    process.env.GITFREDDO_SETTINGS_DIR = settingsDir
    vi.mocked(loadSettings).mockResolvedValue(sampleSettings)
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    vi.mocked(loadBitbucketToken).mockResolvedValue(null)
    vi.mocked(saveGitHubToken).mockResolvedValue(undefined)
    vi.mocked(saveBitbucketToken).mockResolvedValue(undefined)
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

  it('exports a backup file when the save dialog succeeds', async () => {
    const exportPath = join(settingsDir, 'backup.json')
    vi.mocked(dialog.showSaveDialog).mockResolvedValue({
      canceled: false,
      filePath: exportPath
    })

    const result = await exportSettingsBackup(sampleSettings, '1.0.0')
    expect(result).toBe(exportPath)

    const raw = await readFile(exportPath, 'utf8')
    expect(raw).toContain('"githubToken": "gho_test"')
    expect(raw).toContain('"githubLogin": "octocat"')
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
          settings: { ...sampleSettings, theme: 'paper', locale: 'el' },
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
    vi.mocked(loadSettings).mockResolvedValue({ ...sampleSettings, theme: 'paper', locale: 'el' })

    const restored = await importSettingsBackup()
    expect(restored).toEqual({ ...sampleSettings, theme: 'paper', locale: 'el' })
    expect(saveGitHubToken).toHaveBeenCalledWith('gho_restore')
    expect(saveBitbucketToken).toHaveBeenCalledWith('bb_restore')
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
