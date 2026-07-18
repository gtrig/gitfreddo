import { describe, expect, it } from 'vitest'
import {
  AI_API_KEY_REDACTED,
  isAiApiKeyRedactedPlaceholder,
  normalizeAiApiKeyPatch,
  settingsForDisk,
  settingsForRenderer
} from './settings-secrets'
import type { AppSettings } from './ipc'

const base = {
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
  aiEnabled: true,
  aiProvider: 'api',
  aiBaseUrl: 'https://api.openai.com',
  aiApiKey: 'sk-secret',
  aiModel: '',
  aiSystemInstructions: '',
  aiCommitInstructions: '',
  aiStashInstructions: '',
  aiConflictInstructions: '',
  aiAnalyzeInstructions: '',
  githubLogin: '',
  githubConnectedAt: null,
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
  pushSubmoduleRecursion: 'no',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true,
  startupModalHiddenUntil: null,
  startupModalHiddenForVersion: null
} satisfies AppSettings

describe('settings-secrets', () => {
  it('redacts configured AI keys for the renderer', () => {
    expect(settingsForRenderer(base).aiApiKey).toBe(AI_API_KEY_REDACTED)
    expect(settingsForRenderer({ ...base, aiApiKey: '' }).aiApiKey).toBe('')
  })

  it('keeps existing key when patch sends the redacted placeholder', () => {
    const patch = normalizeAiApiKeyPatch(base, { aiApiKey: AI_API_KEY_REDACTED, theme: 'black' })
    expect(patch).not.toHaveProperty('aiApiKey')
    expect(patch.theme).toBe('black')
  })

  it('allows clearing or replacing the key', () => {
    expect(normalizeAiApiKeyPatch(base, { aiApiKey: '' })).toEqual({ aiApiKey: '' })
    expect(normalizeAiApiKeyPatch(base, { aiApiKey: 'sk-new' })).toEqual({ aiApiKey: 'sk-new' })
  })

  it('never writes the AI key to disk settings', () => {
    expect(settingsForDisk(base).aiApiKey).toBe('')
  })

  it('detects the redacted placeholder', () => {
    expect(isAiApiKeyRedactedPlaceholder(AI_API_KEY_REDACTED)).toBe(true)
  })
})
