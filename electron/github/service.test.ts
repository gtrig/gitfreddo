import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { AppSettings } from '../../shared/ipc'

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
  clearRepoCache: vi.fn(),
  listUserRepos: vi.fn(async () => [
    {
      id: 1,
      fullName: 'octo/repo',
      name: 'repo',
      owner: 'octo',
      private: false,
      htmlUrl: 'https://github.com/octo/repo',
      repository: { owner: 'octo', repo: 'repo' },
      cloneUrl: 'https://github.com/octo/repo.git',
      defaultBranch: 'main',
      description: null
    }
  ]),
  createRepo: vi.fn(async (params: { name: string }) => ({
    id: 2,
    fullName: `octo/${params.name}`,
    name: params.name,
    owner: 'octo',
    private: false,
    htmlUrl: `https://github.com/octo/${params.name}`,
    repository: { owner: 'octo', repo: params.name },
    cloneUrl: `https://github.com/octo/${params.name}.git`,
    defaultBranch: 'main',
    description: null
  })),
  forkRepo: vi.fn(async () => ({
    id: 3,
    fullName: 'octo/repo-fork',
    name: 'repo-fork',
    owner: 'octo',
    private: false,
    htmlUrl: 'https://github.com/octo/repo-fork',
    repository: { owner: 'octo', repo: 'repo-fork' },
    cloneUrl: 'https://github.com/octo/repo-fork.git',
    defaultBranch: 'main',
    description: null
  }))
}))

vi.mock('./api/pulls', () => ({
  listPullRequests: vi.fn(async () => [
    {
      number: 7,
      title: 'Feature',
      state: 'open',
      htmlUrl: 'https://github.com/octo/repo/pull/7',
      repository: { owner: 'octo', repo: 'repo' },
      head: { ref: 'feature', sha: 'abc' },
      base: { ref: 'main', sha: 'def' },
      body: '',
      draft: false,
      mergeable: true,
      user: 'octo'
    }
  ]),
  getPullRequest: vi.fn(async () => ({
    number: 7,
    title: 'Feature',
    state: 'open',
    htmlUrl: 'https://github.com/octo/repo/pull/7',
    repository: { owner: 'octo', repo: 'repo' },
    head: { ref: 'feature', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    body: '',
    draft: false,
    mergeable: true,
    user: 'octo'
  })),
  createPullRequest: vi.fn(async () => ({
    number: 8,
    title: 'New PR',
    state: 'open',
    htmlUrl: 'https://github.com/octo/repo/pull/8',
    repository: { owner: 'octo', repo: 'repo' },
    head: { ref: 'feature', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    body: '',
    draft: false,
    mergeable: true,
    user: 'octo'
  })),
  mergePullRequest: vi.fn(async () => undefined),
  listPullRequestFiles: vi.fn(async () => []),
  listPullRequestCommits: vi.fn(async () => []),
  listPullRequestConversationComments: vi.fn(async () => []),
  listPullRequestReviewComments: vi.fn(async () => []),
  listPullRequestReviews: vi.fn(async () => []),
  postPullRequestConversationComment: vi.fn(async () => undefined),
  postPullRequestReviewComment: vi.fn(async () => undefined),
  findPendingPullRequestReviewId: vi.fn(async () => null),
  reopenPullRequest: vi.fn(async () => ({
    number: 7,
    title: 'Feature',
    state: 'open',
    htmlUrl: 'https://github.com/octo/repo/pull/7',
    repository: { owner: 'octo', repo: 'repo' },
    head: { ref: 'feature', sha: 'abc' },
    base: { ref: 'main', sha: 'def' },
    body: '',
    draft: false,
    mergeable: true,
    user: 'octo'
  }))
}))

vi.mock('./api/issues', () => ({
  listIssues: vi.fn(async () => [{ number: 1, title: 'Bug', state: 'open' }]),
  createIssue: vi.fn(async () => ({ number: 2, title: 'New issue', state: 'open' })),
  updateIssue: vi.fn(async () => ({ number: 1, title: 'Updated', state: 'closed' }))
}))

vi.mock('./api/pullThreads', () => ({
  listPullRequestReviewThreads: vi.fn(async () => []),
  replyToPullRequestReviewComment: vi.fn(async () => undefined),
  resolvePullRequestReviewThread: vi.fn(async () => undefined),
  unresolvePullRequestReviewThread: vi.fn(async () => undefined)
}))

vi.mock('./api/http', () => ({
  getGitHubTokenOrThrow: vi.fn(async () => 'gho_test')
}))

vi.mock('./oauth', () => ({
  runGitHubDeviceFlow: vi.fn(async () => ({ token: 'gho_device', login: 'octo' }))
}))

vi.mock('./repo-context', () => ({
  resolveGitHubRepoContext: vi.fn(),
  listGitHubRepoContexts: vi.fn()
}))

import { resolveGitHubRepoContext, listGitHubRepoContexts } from './repo-context'

vi.mock('./ssh-keys', () => ({
  generateAndUploadSshKey: vi.fn(async () => ({
    title: 'GitFreddo key',
    publicKey: 'ssh-rsa AAA...'
  })),
  findGitFreddoSshKeyTitle: vi.fn(async () => null)
}))

import { clearRepoCache } from './api/repos'
import {
  getGitHubStatus,
  uploadGitHubSshKey,
  disconnectGitHub,
  listGitHubRepos,
  connectGitHubPat,
  connectGitHub,
  listGitHubPullRequests,
  getGitHubPullRequest,
  createGitHubRepo,
  forkGitHubRepo,
  createGitHubPullRequest,
  mergeGitHubPullRequest,
  listGitHubIssues,
  createGitHubIssue,
  updateGitHubIssue,
  getGitHubRepoContext,
  tryGetGitHubRepoContext,
  listGitHubPullRequestFiles,
  reopenGitHubPullRequest,
  postGitHubPullRequestComment,
  resolveGitHubPullRequestReviewThread
} from './service'
import { hasGitHubToken, loadGitHubToken, clearGitHubToken, saveGitHubToken } from './token-store'
import { getAuthenticatedUser } from './client'
import { saveSettings } from '../settings'
import { findGitFreddoSshKeyTitle } from './ssh-keys'

describe('github service ssh key state', () => {
  beforeEach(() => {
    vi.mocked(resolveGitHubRepoContext).mockResolvedValue({ owner: 'octo', repo: 'repo', host: 'github.com' })
    vi.mocked(listGitHubRepoContexts).mockResolvedValue([{ owner: 'octo', repo: 'repo', host: 'github.com' }])
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

  it('keeps the connection when ssh key discovery fails after a valid token auth', async () => {
    vi.mocked(findGitFreddoSshKeyTitle).mockRejectedValue(
      new Error('GitHub API error (403): Resource not accessible by personal access token')
    )

    const { status, settings } = await getGitHubStatus({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: ''
    } as AppSettings)

    expect(status).toEqual({
      connected: true,
      login: 'octo',
      avatarUrl: 'https://avatar.example/octo',
      sshKeyTitle: null
    })
    expect(settings.githubLogin).toBe('octo')
    expect(saveSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        githubLogin: '',
        githubConnectedAt: null
      })
    )
  })

  it('keeps a stored connection when status refresh hits a non-auth failure', async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(new Error('fetch failed'))

    const { status, settings } = await getGitHubStatus({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: 'GitFreddo key'
    } as AppSettings)

    expect(status).toEqual({
      connected: true,
      login: 'octo',
      avatarUrl: '',
      sshKeyTitle: 'GitFreddo key'
    })
    expect(settings.githubLogin).toBe('octo')
    expect(saveSettings).not.toHaveBeenCalledWith(
      expect.objectContaining({
        githubLogin: '',
        githubConnectedAt: null
      })
    )
  })

  it('clears the connection on auth failures during status refresh', async () => {
    vi.mocked(getAuthenticatedUser).mockRejectedValue(
      new Error('GitHub API error (401): Bad credentials')
    )
    vi.mocked(clearGitHubToken).mockResolvedValue(undefined)

    const { status } = await getGitHubStatus({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: 'GitFreddo key'
    } as AppSettings)

    expect(status.connected).toBe(false)
    expect(clearGitHubToken).toHaveBeenCalled()
    expect(saveSettings).toHaveBeenCalledWith({
      githubLogin: '',
      githubConnectedAt: null,
      githubSshKeyTitle: ''
    })
  })

  it('disconnectGitHub clears stored credentials and settings', async () => {
    vi.mocked(clearGitHubToken).mockResolvedValue(undefined)
    vi.mocked(saveSettings).mockImplementation(async (patch) =>
      ({
        githubLogin: '',
        githubConnectedAt: null,
        githubSshKeyTitle: '',
        ...patch
      }) as AppSettings
    )

    const settings = await disconnectGitHub({
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: 'GitFreddo key'
    } as AppSettings)

    expect(clearGitHubToken).toHaveBeenCalled()
    expect(clearRepoCache).toHaveBeenCalled()
    expect(settings.githubLogin).toBe('')
  })

  it('listGitHubRepos returns repos from the API layer', async () => {
    const repos = await listGitHubRepos()
    expect(repos).toHaveLength(1)
    expect(repos[0]?.fullName).toBe('octo/repo')
  })

  it('connectGitHubPat stores token and returns connected status', async () => {
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'octo',
      avatar_url: 'https://avatar.example/octo'
    })
    vi.mocked(saveGitHubToken).mockResolvedValue(undefined)
    vi.mocked(saveSettings).mockImplementation(async (patch) =>
      ({
        githubLogin: 'octo',
        githubConnectedAt: Date.now(),
        githubSshKeyTitle: '',
        ...patch
      }) as AppSettings
    )

    const { status, settings } = await connectGitHubPat('ghp_test_token')
    expect(status.connected).toBe(true)
    expect(status.login).toBe('octo')
    expect(settings.githubLogin).toBe('octo')
  })

  it('connectGitHubPat rejects blank tokens', async () => {
    await expect(connectGitHubPat('   ')).rejects.toThrow(/required/i)
  })

  it('listGitHubPullRequests resolves repo context and lists PRs', async () => {
    vi.mocked(hasGitHubToken).mockResolvedValue(true)
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    const prs = await listGitHubPullRequests('/tmp/repo', {
      githubLogin: 'octo',
      githubConnectedAt: Date.now(),
      githubSshKeyTitle: ''
    } as AppSettings)
    expect(prs).toHaveLength(1)
    expect(prs[0]?.number).toBe(7)
  })

  it('getGitHubPullRequest fetches a pull request by number', async () => {
    vi.mocked(hasGitHubToken).mockResolvedValue(true)
    vi.mocked(loadGitHubToken).mockResolvedValue('gho_test')
    const pr = await getGitHubPullRequest('/tmp/repo', { githubLogin: 'octo' } as AppSettings, 7)
    expect(pr.number).toBe(7)
    expect(pr.title).toBe('Feature')
  })

  it('returns disconnected status when no token is stored', async () => {
    vi.mocked(hasGitHubToken).mockResolvedValue(false)
    const { status } = await getGitHubStatus({ githubLogin: '' } as AppSettings)
    expect(status.connected).toBe(false)
  })

  it('connectGitHub completes device flow auth', async () => {
    vi.mocked(saveGitHubToken).mockResolvedValue(undefined)
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

    const { status } = await connectGitHub()
    expect(status.connected).toBe(true)
    expect(status.login).toBe('octo')
  })

  it('createGitHubRepo delegates to the API layer', async () => {
    const repo = await createGitHubRepo({ name: 'new-repo', private: false })
    expect(repo.fullName).toBe('octo/new-repo')
  })

  it('forkGitHubRepo delegates to the API layer', async () => {
    const repo = await forkGitHubRepo('octo', 'repo')
    expect(repo.fullName).toBe('octo/repo-fork')
  })

  it('createGitHubPullRequest resolves repo context and creates a PR', async () => {
    const pr = await createGitHubPullRequest('/tmp/repo', { githubLogin: 'octo' } as AppSettings, {
      title: 'New PR',
      head: 'feature',
      base: 'main'
    })
    expect(pr.number).toBe(8)
  })

  it('mergeGitHubPullRequest resolves repo context and merges', async () => {
    await expect(
      mergeGitHubPullRequest('/tmp/repo', { githubLogin: 'octo' } as AppSettings, 7, 'squash')
    ).resolves.toBeUndefined()
  })

  it('lists, creates, and updates GitHub issues', async () => {
    const settings = { githubLogin: 'octo' } as AppSettings
    const issues = await listGitHubIssues('/tmp/repo', settings)
    expect(issues).toHaveLength(1)

    const created = await createGitHubIssue('/tmp/repo', settings, { title: 'New issue' })
    expect(created.number).toBe(2)

    const updated = await updateGitHubIssue('/tmp/repo', settings, 1, { state: 'closed' })
    expect(updated.state).toBe('closed')
  })

  it('getGitHubRepoContext and tryGetGitHubRepoContext resolve repo context', async () => {
    const settings = { githubLogin: 'octo' } as AppSettings
    await expect(getGitHubRepoContext('/tmp/repo', settings)).resolves.toEqual({
      owner: 'octo',
      repo: 'repo',
      host: 'github.com'
    })
    await expect(tryGetGitHubRepoContext('/tmp/repo', settings)).resolves.toEqual({
      owner: 'octo',
      repo: 'repo',
      host: 'github.com'
    })
  })

  it('listGitHubPullRequestFiles uses explicit repository when provided', async () => {
    const files = await listGitHubPullRequestFiles(
      '/tmp/repo',
      { githubLogin: 'octo' } as AppSettings,
      7,
      { owner: 'octo', repo: 'repo' }
    )
    expect(files).toEqual([])
  })

  it('reopens pull requests and posts comments', async () => {
    const settings = { githubLogin: 'octo' } as AppSettings
    const reopened = await reopenGitHubPullRequest('/tmp/repo', settings, 7)
    expect(reopened.state).toBe('open')
    await expect(
      postGitHubPullRequestComment('/tmp/repo', settings, 7, 'Looks good')
    ).resolves.toBeUndefined()
  })

  it('tryGetGitHubRepoContext returns null when repo context cannot be resolved', async () => {
    vi.mocked(resolveGitHubRepoContext).mockRejectedValue(new Error('not github'))
    await expect(tryGetGitHubRepoContext('/tmp/repo', { githubLogin: 'octo' } as AppSettings)).resolves.toBeNull()
  })

  it('resolves pull request review threads by id', async () => {
    await expect(
      resolveGitHubPullRequestReviewThread('/tmp/repo', { githubLogin: 'octo' } as AppSettings, 'thread-1')
    ).resolves.toBeUndefined()
  })
})
