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
  gitlabLogin: 'gtrig',
  gitlabConnectedAt: 3,
  gitlabAuthType: 'oauth',
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
  startupModalHiddenForVersion: null,
  startupModalHiddenUntil: null
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
      { hasBitbucketToken: true, hasGitHubToken: false, hasGitlabToken: false }
    )

    expect(patch.theme).toBe('iced-matcha')
    expect(patch.bitbucketLogin).toBe('gtrig')
    expect(patch.bitbucketAuthLogin).toBe('user@example.com')
    expect(patch.bitbucketAuthType).toBe('app_password')
  })

  it('keeps github integration fields when a stale form tries to clear them', () => {
    const patch = preserveIntegrationSettings(
      baseSettings,
      {
        githubLogin: '',
        githubConnectedAt: null
      },
      { hasBitbucketToken: false, hasGitHubToken: true, hasGitlabToken: false }
    )

    expect(patch.githubLogin).toBe('octo')
    expect(patch.githubConnectedAt).toBe(1)
    expect(patch.githubSshKeyTitle).toBe('')
  })

  it('keeps gitlab integration fields when a stale form tries to clear them', () => {
    const patch = preserveIntegrationSettings(
      baseSettings,
      {
        gitlabLogin: '',
        gitlabConnectedAt: null,
        gitlabAuthType: null
      },
      { hasBitbucketToken: false, hasGitHubToken: false, hasGitlabToken: true }
    )

    expect(patch.gitlabLogin).toBe('gtrig')
    expect(patch.gitlabConnectedAt).toBe(3)
    expect(patch.gitlabAuthType).toBe('oauth')
    expect(patch.gitlabHost).toBe('gitlab.com')
  })

  it('does not restore integration fields when no token is stored', () => {
    const patch = preserveIntegrationSettings(
      baseSettings,
      {
        bitbucketLogin: '',
        githubLogin: '',
        gitlabLogin: ''
      },
      { hasBitbucketToken: false, hasGitHubToken: false, hasGitlabToken: false }
    )

    expect(patch.bitbucketLogin).toBe('')
    expect(patch.githubLogin).toBe('')
    expect(patch.gitlabLogin).toBe('')
  })

  it('preserves ssh key titles when restoring cleared integrations', () => {
    const patch = preserveIntegrationSettings(
      { ...baseSettings, githubSshKeyTitle: 'gh-key', gitlabSshKeyTitle: 'gl-key' },
      { githubLogin: '', githubConnectedAt: null },
      { hasBitbucketToken: false, hasGitHubToken: true, hasGitlabToken: false }
    )
    expect(patch.githubSshKeyTitle).toBe('gh-key')

    const gitlabPatch = preserveIntegrationSettings(
      { ...baseSettings, gitlabSshKeyTitle: 'gl-key' },
      { gitlabLogin: '', gitlabConnectedAt: null, gitlabAuthType: null },
      { hasBitbucketToken: false, hasGitHubToken: false, hasGitlabToken: true }
    )
    expect(gitlabPatch.gitlabSshKeyTitle).toBe('gl-key')
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

  it('returns explicit oauth or app_password when already set', () => {
    expect(
      inferBitbucketAuthType({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: null,
        bitbucketAuthType: 'oauth'
      })
    ).toBe('oauth')
    expect(
      inferBitbucketAuthType({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: null,
        bitbucketAuthType: 'app_password'
      })
    ).toBe('app_password')
  })

  it('infers app password from bitbucketLogin email and defaults to oauth', () => {
    expect(
      inferBitbucketAuthType({
        bitbucketLogin: 'user@example.com',
        bitbucketAuthLogin: null,
        bitbucketAuthType: null
      })
    ).toBe('app_password')
    expect(
      inferBitbucketAuthType({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: null,
        bitbucketAuthType: null
      })
    ).toBe('oauth')
  })
})
