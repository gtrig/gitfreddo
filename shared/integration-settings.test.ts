import { describe, expect, it } from 'vitest'
import type { AppSettings } from './ipc'
import {
  inferBitbucketAuthType,
  pickUserSettings,
  preserveIntegrationSettings
} from './integration-settings'

const baseSettings = {
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
  githubLogin: 'octo',
  githubConnectedAt: 1,
  githubSshKeyTitle: '',
  bitbucketLogin: 'gtrig',
  bitbucketAuthLogin: 'user@example.com',
  bitbucketConnectedAt: 2,
  bitbucketAuthType: 'app_password',
  bitbucketSshKeyTitle: '',
  pullRebase: false,
  submoduleRecursion: 'on-demand',
  pushSubmoduleRecursion: 'check',
  diffViewMode: 'unified',
  uiZoomFactor: 1,
  updateChannel: 'stable',
  autoDownloadUpdates: false,
  checkForUpdatesOnStartup: true
} as AppSettings

describe('pickUserSettings', () => {
  it('removes forge integration fields from settings saves', () => {
    const patch = pickUserSettings(baseSettings)

    expect(patch.theme).toBe('black')
    expect(patch.githubLogin).toBeUndefined()
    expect(patch.bitbucketLogin).toBeUndefined()
    expect(patch.bitbucketAuthLogin).toBeUndefined()
    expect(patch.bitbucketAuthType).toBeUndefined()
  })

  it('removes workspace session fields from settings saves', () => {
    const patch = pickUserSettings({
      ...baseSettings,
      recentRepos: ['/tmp/a'],
      openRepoTabs: ['/tmp/a', '/tmp/b'],
      activeRepoTab: '/tmp/a'
    })

    expect(patch.recentRepos).toBeUndefined()
    expect(patch.openRepoTabs).toBeUndefined()
    expect(patch.activeRepoTab).toBeUndefined()
    expect(patch.theme).toBe('black')
  })
})

describe('preserveIntegrationSettings', () => {
  it('keeps bitbucket integration fields when a stale form tries to clear them', () => {
    const patch = preserveIntegrationSettings(
      baseSettings,
      {
        theme: 'iced-matcha',
        bitbucketLogin: '',
        bitbucketAuthLogin: '',
        bitbucketConnectedAt: null,
        bitbucketAuthType: null
      },
      { hasBitbucketToken: true, hasGitHubToken: false }
    )

    expect(patch.theme).toBe('iced-matcha')
    expect(patch.bitbucketLogin).toBe('gtrig')
    expect(patch.bitbucketAuthLogin).toBe('user@example.com')
    expect(patch.bitbucketAuthType).toBe('app_password')
  })
})

describe('inferBitbucketAuthType', () => {
  it('infers app password auth when only the auth email is stored', () => {
    expect(
      inferBitbucketAuthType({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: 'user@example.com',
        bitbucketAuthType: null
      })
    ).toBe('app_password')
  })
})
