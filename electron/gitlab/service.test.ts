import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../settings', () => ({
  saveSettings: vi.fn(async (patch) => patch)
}))

vi.mock('../../shared/forge-auth', () => ({
  isForgeAuthFailure: vi.fn(() => false)
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

vi.mock('./token-store', () => ({
  hasGitlabToken: vi.fn(),
  loadGitlabToken: vi.fn(),
  saveGitlabToken: vi.fn(),
  clearGitlabToken: vi.fn()
}))

vi.mock('./api/repos', () => ({
  clearRepoCache: vi.fn(),
  createRepo: vi.fn(),
  forkRepo: vi.fn(),
  listNamespaces: vi.fn(),
  listUserRepos: vi.fn()
}))

vi.mock('./api/pulls', () => ({
  createMergeRequest: vi.fn(),
  listMergeRequests: vi.fn(),
  mergeMergeRequest: vi.fn()
}))

vi.mock('./api/issues', () => ({
  listIssues: vi.fn(),
  createIssue: vi.fn(),
  updateIssue: vi.fn()
}))

vi.mock('./repo-context', () => ({
  resolveGitlabRepoContext: vi.fn()
}))

vi.mock('./oauth', () => ({
  runGitlabOAuthFlow: vi.fn()
}))

const gitlabCtx = { namespace: 'acme', owner: 'acme', repo: 'demo', host: 'gitlab.com' }

vi.mock('./ssh-keys', () => ({
  generateAndUploadSshKey: vi.fn(async () => ({
    title: 'GitFreddo key',
    publicKey: 'ssh-ed25519 AAA...'
  })),
  findGitFreddoSshKeyTitle: vi.fn(async () => null)
}))

import type { AppSettings } from '../../shared/ipc'
import { isForgeAuthFailure } from '../../shared/forge-auth'
import { getAuthenticatedUser } from './client'
import {
  connectGitlab,
  connectGitlabPat,
  createGitlabIssue,
  createGitlabPullRequest,
  createGitlabRepo,
  disconnectGitlab,
  forkGitlabRepo,
  getGitlabRepoContext,
  getGitlabStatus,
  listGitlabIssues,
  listGitlabNamespaces,
  listGitlabPullRequests,
  listGitlabRepos,
  mergeGitlabPullRequest,
  tryGetGitlabRepoContext,
  updateGitlabIssue,
  uploadGitlabSshKey
} from './service'
import {
  clearGitlabToken,
  hasGitlabToken,
  loadGitlabToken,
  saveGitlabToken
} from './token-store'
import { saveSettings } from '../settings'
import { generateAndUploadSshKey, findGitFreddoSshKeyTitle } from './ssh-keys'
import { createRepo, forkRepo, listNamespaces, listUserRepos } from './api/repos'
import { createMergeRequest, listMergeRequests, mergeMergeRequest } from './api/pulls'
import { createIssue, listIssues, updateIssue } from './api/issues'
import { resolveGitlabRepoContext } from './repo-context'
import { runGitlabOAuthFlow } from './oauth'

const baseSettings = {
  gitlabLogin: 'gtrig',
  gitlabConnectedAt: 1_700_000_000_000,
  gitlabAuthType: 'pat' as const,
  gitlabSshKeyTitle: '',
  gitlabHost: ''
}

describe('gitlab service', () => {
  beforeEach(() => {
    vi.mocked(hasGitlabToken).mockResolvedValue(true)
    vi.mocked(loadGitlabToken).mockResolvedValue('gl-token')
    vi.mocked(saveGitlabToken).mockResolvedValue(undefined)
    vi.mocked(clearGitlabToken).mockResolvedValue(undefined)
    vi.mocked(isForgeAuthFailure).mockReturnValue(false)
    vi.mocked(findGitFreddoSshKeyTitle).mockResolvedValue(null)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'gtrig',
      avatar_url: 'https://avatar.example/gtrig'
    })
    vi.mocked(saveSettings).mockImplementation(
      async (patch) => ({ ...baseSettings, ...patch }) as AppSettings
    )
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('reports disconnected when no token is stored', async () => {
    vi.mocked(hasGitlabToken).mockResolvedValue(false)

    const { status } = await getGitlabStatus(baseSettings as never)

    expect(status.connected).toBe(false)
    expect(status.login).toBeNull()
  })

  it('reports disconnected when the token cannot be loaded', async () => {
    vi.mocked(hasGitlabToken).mockResolvedValue(true)
    vi.mocked(loadGitlabToken).mockResolvedValue(null)

    const { status } = await getGitlabStatus(baseSettings as never)

    expect(status.connected).toBe(false)
    expect(getAuthenticatedUser).not.toHaveBeenCalled()
  })

  it('reports connected when the token resolves to the stored login', async () => {
    const { status } = await getGitlabStatus(baseSettings as never)

    expect(getAuthenticatedUser).toHaveBeenCalledWith('gl-token', null)
    expect(status).toEqual({
      connected: true,
      login: 'gtrig',
      avatarUrl: 'https://avatar.example/gtrig',
      authType: 'pat',
      sshKeyTitle: null,
      host: 'gitlab.com'
    })
    expect(saveSettings).not.toHaveBeenCalled()
  })

  it('updates the stored login when it changes', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'renamed',
      avatar_url: ''
    })

    const { status } = await getGitlabStatus(baseSettings as never)

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gitlabLogin: 'renamed' })
    )
    expect(status.login).toBe('renamed')
  })

  it('keeps the connection on a non-auth failure', async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('fetch failed'))

    const { status } = await getGitlabStatus(baseSettings as never)

    expect(status.connected).toBe(true)
    expect(status.login).toBe('gtrig')
  })

  it('clears the connection on an auth failure', async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('401'))
    vi.mocked(isForgeAuthFailure).mockReturnValue(true)

    const { status } = await getGitlabStatus(baseSettings as never)

    expect(clearGitlabToken).toHaveBeenCalled()
    expect(status.connected).toBe(false)
  })

  it('connects with a personal access token', async () => {
    const { status } = await connectGitlabPat('  pat-token  ', 'https://gitlab.example.com/')

    expect(saveGitlabToken).toHaveBeenCalledWith('pat-token')
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        gitlabLogin: 'gtrig',
        gitlabAuthType: 'pat',
        gitlabHost: 'gitlab.example.com'
      })
    )
    expect(status.connected).toBe(true)
    expect(status.authType).toBe('pat')
  })

  it('rejects a personal access token connection without a token', async () => {
    await expect(connectGitlabPat('   ')).rejects.toThrow(/required/i)
  })

  it('disconnects by clearing the stored connection', async () => {
    await disconnectGitlab(baseSettings as never)

    expect(clearGitlabToken).toHaveBeenCalled()
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gitlabLogin: '', gitlabAuthType: null })
    )
  })

  it('uploads an ssh key when connected', async () => {
    const { result } = await uploadGitlabSshKey(baseSettings as never, 'GitFreddo key')

    expect(generateAndUploadSshKey).toHaveBeenCalledWith('GitFreddo key', null)
    expect(saveSettings).toHaveBeenCalledWith({ gitlabSshKeyTitle: 'GitFreddo key' })
    expect(result.title).toBe('GitFreddo key')
  })

  it('rejects ssh key upload when no account is connected', async () => {
    await expect(
      uploadGitlabSshKey({ ...baseSettings, gitlabLogin: '' } as never, 'GitFreddo key')
    ).rejects.toThrow(/not connected/i)
    expect(generateAndUploadSshKey).not.toHaveBeenCalled()
  })

  it('connects via the OAuth flow and forwards progress events', async () => {
    vi.mocked(runGitlabOAuthFlow).mockImplementation(async (_host, onProgress) => {
      onProgress?.({ status: 'waiting', authorizationUri: 'https://gitlab.com/oauth/authorize' })
      onProgress?.({ status: 'exchanging' })
      return { token: 'oauth-token', login: 'gtrig' }
    })

    const events: string[] = []
    const { status } = await connectGitlab((p) => events.push(p.status))

    expect(events).toEqual(['waiting', 'exchanging'])
    expect(runGitlabOAuthFlow).toHaveBeenCalled()
    expect(saveGitlabToken).toHaveBeenCalledWith('oauth-token')
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({ gitlabLogin: 'gtrig', gitlabAuthType: 'oauth' })
    )
    expect(status.connected).toBe(true)
    expect(status.authType).toBe('oauth')
  })
})

describe('gitlab service delegation', () => {
  const settings = { ...baseSettings, gitlabHost: 'gitlab.example.com' }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(resolveGitlabRepoContext).mockResolvedValue(gitlabCtx)
  })

  it('lists repositories with the configured host', async () => {
    vi.mocked(listUserRepos).mockResolvedValue([])
    await listGitlabRepos(settings as never, { search: 'x' })
    expect(listUserRepos).toHaveBeenCalledWith({ search: 'x' }, 'gitlab.example.com')
  })

  it('lists namespaces with the configured host', async () => {
    vi.mocked(listNamespaces).mockResolvedValue(['acme'])
    await listGitlabNamespaces(settings as never)
    expect(listNamespaces).toHaveBeenCalledWith('gitlab.example.com')
  })

  it('creates a repository', async () => {
    vi.mocked(createRepo).mockResolvedValue({} as never)
    await createGitlabRepo(settings as never, { namespace: 'acme', name: 'demo' })
    expect(createRepo).toHaveBeenCalledWith(
      { namespace: 'acme', name: 'demo' },
      'gitlab.example.com'
    )
  })

  it('forks a repository', async () => {
    vi.mocked(forkRepo).mockResolvedValue({} as never)
    await forkGitlabRepo(settings as never, 'acme', 'demo')
    expect(forkRepo).toHaveBeenCalledWith('acme', 'demo', 'gitlab.example.com')
  })

  it('lists pull requests via the resolved context', async () => {
    vi.mocked(listMergeRequests).mockResolvedValue([])
    await listGitlabPullRequests('/repo', settings as never)
    expect(resolveGitlabRepoContext).toHaveBeenCalledWith('/repo', settings)
    expect(listMergeRequests).toHaveBeenCalledWith('acme', 'demo', 'gitlab.example.com')
  })

  it('creates a pull request via the resolved context', async () => {
    vi.mocked(createMergeRequest).mockResolvedValue({} as never)
    await createGitlabPullRequest('/repo', settings as never, {
      title: 't',
      head: 'f',
      base: 'm'
    })
    expect(createMergeRequest).toHaveBeenCalledWith(
      'acme',
      'demo',
      { title: 't', head: 'f', base: 'm' },
      'gitlab.example.com'
    )
  })

  it('merges a pull request via the resolved context', async () => {
    vi.mocked(mergeMergeRequest).mockResolvedValue(undefined)
    await mergeGitlabPullRequest('/repo', settings as never, 5, 'squash')
    expect(mergeMergeRequest).toHaveBeenCalledWith('acme', 'demo', 5, 'squash', 'gitlab.example.com')
  })

  it('lists issues via the resolved context', async () => {
    vi.mocked(listIssues).mockResolvedValue([])
    await listGitlabIssues('/repo', settings as never, 'gtrig')
    expect(listIssues).toHaveBeenCalledWith('acme', 'demo', 'gtrig', 'gitlab.example.com')
  })

  it('creates an issue via the resolved context', async () => {
    vi.mocked(createIssue).mockResolvedValue({} as never)
    await createGitlabIssue('/repo', settings as never, { title: 't' })
    expect(createIssue).toHaveBeenCalledWith('acme', 'demo', { title: 't' }, 'gitlab.example.com')
  })

  it('updates an issue via the resolved context', async () => {
    vi.mocked(updateIssue).mockResolvedValue({} as never)
    await updateGitlabIssue('/repo', settings as never, 2, { state: 'closed' })
    expect(updateIssue).toHaveBeenCalledWith(
      'acme',
      'demo',
      2,
      { state: 'closed' },
      'gitlab.example.com'
    )
  })

  it('resolves the repo context directly', async () => {
    await expect(getGitlabRepoContext('/repo', settings as never)).resolves.toEqual(gitlabCtx)
  })

  it('returns the repo context or null when resolution fails', async () => {
    await expect(tryGetGitlabRepoContext('/repo', settings as never)).resolves.toEqual(gitlabCtx)

    vi.mocked(resolveGitlabRepoContext).mockRejectedValue(new Error('nope'))
    await expect(tryGetGitlabRepoContext('/repo', settings as never)).resolves.toBeNull()
  })
})
