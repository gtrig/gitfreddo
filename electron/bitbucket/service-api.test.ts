import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { AppSettings } from '../../shared/ipc'

vi.mock('../settings', () => ({
  saveSettings: vi.fn(async (patch) => patch)
}))

vi.mock('./client', () => ({
  getAuthenticatedUser: vi.fn()
}))

vi.mock('./token-store', () => ({
  hasBitbucketToken: vi.fn(),
  loadBitbucketToken: vi.fn(),
  saveBitbucketToken: vi.fn(),
  clearBitbucketToken: vi.fn()
}))

vi.mock('./api/repos', () => ({
  clearRepoCache: vi.fn(),
  listUserRepos: vi.fn(async () => [
    {
      uuid: 'repo-1',
      fullName: 'gtrig/repo',
      name: 'repo',
      workspace: 'gtrig',
      isPrivate: false,
      htmlUrl: 'https://bitbucket.org/gtrig/repo',
      cloneUrl: 'https://bitbucket.org/gtrig/repo.git',
      defaultBranch: 'main',
      description: null
    }
  ]),
  listWorkspaces: vi.fn(async () => ['gtrig']),
  createRepo: vi.fn(async (params: { name: string }) => ({
    uuid: 'repo-2',
    fullName: `gtrig/${params.name}`,
    name: params.name,
    workspace: 'gtrig',
    isPrivate: false,
    htmlUrl: `https://bitbucket.org/gtrig/${params.name}`,
    cloneUrl: `https://bitbucket.org/gtrig/${params.name}.git`,
    defaultBranch: 'main',
    description: null
  })),
  forkRepo: vi.fn(async () => ({
    uuid: 'repo-3',
    fullName: 'gtrig/repo-fork',
    name: 'repo-fork',
    workspace: 'gtrig',
    isPrivate: false,
    htmlUrl: 'https://bitbucket.org/gtrig/repo-fork',
    cloneUrl: 'https://bitbucket.org/gtrig/repo-fork.git',
    defaultBranch: 'main',
    description: null
  }))
}))

vi.mock('./api/pulls', () => ({
  listPullRequests: vi.fn(async () => [{ number: 7, title: 'Feature', state: 'OPEN' }]),
  createPullRequest: vi.fn(async () => ({ number: 8, title: 'New PR', state: 'OPEN' })),
  mergePullRequest: vi.fn(async () => undefined)
}))

vi.mock('./api/issues', () => ({
  listIssues: vi.fn(async () => [{ number: 1, title: 'Bug', state: 'open' }]),
  createIssue: vi.fn(async () => ({ number: 2, title: 'New issue', state: 'open' })),
  updateIssue: vi.fn(async () => ({ number: 1, title: 'Updated', state: 'closed' }))
}))

vi.mock('./oauth', () => ({
  runBitbucketOAuthFlow: vi.fn(async () => ({ token: 'oauth-token', login: 'gtrig' }))
}))

vi.mock('./repo-context', () => ({
  resolveBitbucketRepoContext: vi.fn(async () => ({ workspace: 'gtrig', repo: 'repo' }))
}))

vi.mock('./ssh-keys', () => ({
  generateAndUploadSshKey: vi.fn(async () => ({ title: 'GitFreddo key', publicKey: 'ssh-rsa AAA...' })),
  findGitFreddoSshKeyTitle: vi.fn(async () => null)
}))

import { resolveBitbucketRepoContext } from './repo-context'
import { clearBitbucketToken, hasBitbucketToken, loadBitbucketToken, saveBitbucketToken } from './token-store'
import { getAuthenticatedUser } from './client'
import { saveSettings } from '../settings'
import {
  connectBitbucket,
  connectBitbucketAppPassword,
  createBitbucketIssue,
  createBitbucketPullRequest,
  createBitbucketRepo,
  disconnectBitbucket,
  forkBitbucketRepo,
  getBitbucketRepoContext,
  getBitbucketStatus,
  listBitbucketIssues,
  listBitbucketPullRequests,
  listBitbucketRepos,
  listBitbucketWorkspaces,
  mergeBitbucketPullRequest,
  tryGetBitbucketRepoContext,
  updateBitbucketIssue
} from './service'

const settings = {
  bitbucketLogin: 'gtrig',
  bitbucketAuthLogin: 'user@example.com',
  bitbucketConnectedAt: Date.now(),
  bitbucketAuthType: 'app_password' as const,
  bitbucketSshKeyTitle: ''
} as AppSettings

describe('bitbucket service API delegation', () => {
  beforeEach(() => {
    vi.mocked(hasBitbucketToken).mockResolvedValue(true)
    vi.mocked(loadBitbucketToken).mockResolvedValue('app-password-token')
    vi.mocked(saveBitbucketToken).mockResolvedValue(undefined)
    vi.mocked(clearBitbucketToken).mockResolvedValue(undefined)
    vi.mocked(getAuthenticatedUser).mockResolvedValue({
      login: 'gtrig',
      avatar_url: 'https://avatar.example/gtrig'
    })
    vi.mocked(saveSettings).mockImplementation(async (patch) => ({ ...settings, ...patch }) as AppSettings)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('connectBitbucket completes OAuth flow', async () => {
    const { status } = await connectBitbucket()
    expect(status.connected).toBe(true)
    expect(status.login).toBe('gtrig')
  })

  it('connectBitbucketAppPassword rejects blank credentials', async () => {
    await expect(connectBitbucketAppPassword('  ', 'secret')).rejects.toThrow(/required/i)
  })

  it('disconnectBitbucket clears stored credentials', async () => {
    const next = await disconnectBitbucket(settings)
    expect(clearBitbucketToken).toHaveBeenCalled()
    expect(next.bitbucketLogin).toBe('')
  })

  it('returns disconnected status when no token is stored', async () => {
    vi.mocked(hasBitbucketToken).mockResolvedValue(false)
    const { status } = await getBitbucketStatus({ bitbucketLogin: '' } as AppSettings)
    expect(status.connected).toBe(false)
  })

  it('lists repos and workspaces', async () => {
    const repos = await listBitbucketRepos(settings)
    expect(repos).toHaveLength(1)
    expect(repos[0]?.fullName).toBe('gtrig/repo')

    const workspaces = await listBitbucketWorkspaces(settings)
    expect(workspaces).toEqual(['gtrig'])
  })

  it('creates and forks repositories', async () => {
    const created = await createBitbucketRepo(settings, { name: 'new-repo', isPrivate: false, workspace: 'gtrig' })
    expect(created.fullName).toBe('gtrig/new-repo')

    const forked = await forkBitbucketRepo(settings, 'gtrig', 'repo')
    expect(forked.fullName).toBe('gtrig/repo-fork')
  })

  it('lists, creates, and merges pull requests', async () => {
    const prs = await listBitbucketPullRequests('/tmp/repo', settings)
    expect(prs).toHaveLength(1)

    const created = await createBitbucketPullRequest('/tmp/repo', settings, {
      title: 'New PR',
      head: 'feature',
      base: 'main'
    })
    expect(created.number).toBe(8)

    await expect(
      mergeBitbucketPullRequest('/tmp/repo', settings, 7, 'squash')
    ).resolves.toBeUndefined()
  })

  it('lists, creates, and updates issues', async () => {
    const issues = await listBitbucketIssues('/tmp/repo', settings, 'gtrig')
    expect(issues).toHaveLength(1)

    const created = await createBitbucketIssue('/tmp/repo', settings, { title: 'New issue' })
    expect(created.number).toBe(2)

    const updated = await updateBitbucketIssue('/tmp/repo', settings, 1, { state: 'closed' })
    expect(updated.state).toBe('closed')
  })

  it('resolves repo context and returns null when resolution fails', async () => {
    await expect(getBitbucketRepoContext('/tmp/repo', settings)).resolves.toEqual({
      workspace: 'gtrig',
      repo: 'repo'
    })

    vi.mocked(resolveBitbucketRepoContext).mockRejectedValue(new Error('not bitbucket'))
    await expect(tryGetBitbucketRepoContext('/tmp/repo', settings)).resolves.toBeNull()
  })
})
