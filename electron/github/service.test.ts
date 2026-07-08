import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../settings', () => ({
  saveSettings: vi.fn(async (patch) => patch)
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

vi.mock('./token-store', () => ({
  hasGitHubToken: vi.fn(),
  loadGitHubToken: vi.fn(),
  saveGitHubToken: vi.fn(),
  clearGitHubToken: vi.fn()
}))

vi.mock('./api/repos', () => ({
  clearRepoCache: vi.fn()
}))

vi.mock('./ssh-keys', () => ({
  generateAndUploadSshKey: vi.fn(async () => ({
    title: 'GitFreddo key',
    publicKey: 'ssh-rsa AAA...'
  })),
  findGitFreddoSshKeyTitle: vi.fn(async () => null)
}))

import type { AppSettings } from '../../shared/ipc'
import { getGitHubStatus, uploadGitHubSshKey } from './service'
import { hasGitHubToken, loadGitHubToken } from './token-store'
import { getAuthenticatedUser } from './client'
import { saveSettings } from '../settings'
import { findGitFreddoSshKeyTitle } from './ssh-keys'

describe('github service ssh key state', () => {
  beforeEach(() => {
    vi.mocked(hasGitHubToken).mockResolvedValue(true)
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'octo',
      avatar_url: 'https://avatar.example/octo'
    })
    vi.mocked(saveSettings).mockImplementation(async (patch) =>
      ({
        githubLogin: 'octo',
        githubConnectedAt: Date.now(),
        githubSshKeyTitle: '',
        ...patch
      }) as AppSettings
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns the stored ssh key title in status responses', async () => {
    const { status } = await getGitHubStatus({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: 'GitFreddo key'
    } as AppSettings)

    expect(status.sshKeyTitle).toBe('GitFreddo key')
    expect(findGitFreddoSshKeyTitle).not.toHaveBeenCalled()
  })

  it('discovers and persists a GitFreddo ssh key from the remote account', async () => {
    vi.mocked(findGitFreddoSshKeyTitle).mockResolvedValue('GitFreddo 2026-07-08T06:00:00.000Z')

    const { status, settings } = await getGitHubStatus({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: ''
    } as AppSettings)

    expect(findGitFreddoSshKeyTitle).toHaveBeenCalledWith('gho_test')
    expect(saveSettings).toHaveBeenCalledWith({
      githubSshKeyTitle: 'GitFreddo 2026-07-08T06:00:00.000Z'
    })
    expect(status.sshKeyTitle).toBe('GitFreddo 2026-07-08T06:00:00.000Z')
    expect(settings.githubSshKeyTitle).toBe('GitFreddo 2026-07-08T06:00:00.000Z')
  })

  it('persists the ssh key title after upload', async () => {
    const uploaded = await uploadGitHubSshKey(
      { githubLogin: 'octo', githubSshKeyTitle: '' } as AppSettings,
      'GitFreddo key'
    )

    expect(saveSettings).toHaveBeenCalledWith({ githubSshKeyTitle: 'GitFreddo key' })
    expect(uploaded.settings.githubSshKeyTitle).toBe('GitFreddo key')
  })
})
