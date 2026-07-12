import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repos from './repos'
import * as http from './http'

vi.mock('./http', () => ({
  bitbucketJson: vi.fn(),
  bitbucketJsonAllPages: vi.fn()
}))

describe('Bitbucket repos API', () => {
  const settings = {
    bitbucketLogin: 'gtrig',
    bitbucketAuthLogin: '',
    bitbucketAuthType: 'oauth' as const
  }

  const rawRepo = {
    uuid: '{repo-uuid}',
    full_name: 'workspace/demo',
    name: 'demo',
    slug: 'demo',
    workspace: { slug: 'workspace' },
    is_private: true,
    links: {
      clone: [{ name: 'https', href: 'https://bitbucket.org/workspace/demo.git' }],
      html: { href: 'https://bitbucket.org/workspace/demo' }
    },
    description: 'Demo repo',
    mainbranch: { name: 'main' }
  }

  beforeEach(() => {
    vi.mocked(http.bitbucketJson).mockReset()
    vi.mocked(http.bitbucketJsonAllPages).mockReset()
    repos.clearRepoCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps and caches user repositories', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([rawRepo])

    const first = await repos.listUserRepos({}, settings)
    const second = await repos.listUserRepos({}, settings)

    expect(first).toEqual([
      {
        uuid: '{repo-uuid}',
        fullName: 'workspace/demo',
        name: 'demo',
        workspace: 'workspace',
        owner: 'workspace',
        private: true,
        cloneUrl: 'https://bitbucket.org/workspace/demo.git',
        description: 'Demo repo',
        defaultBranch: 'main'
      }
    ])
    expect(second).toEqual(first)
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledTimes(1)
  })

  it('filters repositories by search term', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([
      rawRepo,
      {
        ...rawRepo,
        full_name: 'workspace/other',
        name: 'other',
        slug: 'other',
        description: 'Unrelated project'
      }
    ])

    const filtered = await repos.listUserRepos({ search: 'demo' }, settings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.fullName).toBe('workspace/demo')
  })

  it('lists unique sorted workspace slugs', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([
      { slug: 'beta' },
      { slug: 'alpha' },
      { slug: 'beta' }
    ])

    await expect(repos.listWorkspaces(settings)).resolves.toEqual(['alpha', 'beta'])
  })

  it('creates a repository and clears the cache', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([rawRepo])
    vi.mocked(http.bitbucketJson).mockResolvedValue({
      ...rawRepo,
      full_name: 'workspace/new-repo',
      name: 'new-repo',
      slug: 'new-repo'
    })

    await repos.listUserRepos({}, settings)
    const created = await repos.createRepo(
      { workspace: 'workspace', name: 'new-repo', description: 'Created from GitFreddo' },
      settings
    )

    expect(created.fullName).toBe('workspace/new-repo')
    expect(http.bitbucketJson).toHaveBeenCalledWith(
      '/repositories/workspace/new-repo',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          scm: 'git',
          is_private: false,
          description: 'Created from GitFreddo'
        })
      }),
      undefined,
      settings
    )
  })

  it('requires workspace and repository name when creating', async () => {
    await expect(repos.createRepo({ workspace: '', name: '' }, settings)).rejects.toThrow(
      /required/i
    )
  })

  it('forks a repository and clears the cache', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([rawRepo])
    vi.mocked(http.bitbucketJson).mockResolvedValue({
      ...rawRepo,
      full_name: 'workspace/demo-fork'
    })

    await repos.listUserRepos({}, settings)
    const forked = await repos.forkRepo('workspace', 'demo', settings)

    expect(forked.fullName).toBe('workspace/demo-fork')
    expect(http.bitbucketJson).toHaveBeenCalledWith(
      '/repositories/workspace/demo/forks',
      expect.objectContaining({ method: 'POST' }),
      undefined,
      settings
    )
  })
})
