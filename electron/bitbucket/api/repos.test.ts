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

  function mockWorkspaceScopedRepos(
    workspaces: Array<{ slug: string; repos: typeof rawRepo[] }>
  ) {
    vi.mocked(http.bitbucketJsonAllPages).mockImplementation(async (path) => {
      if (path.startsWith('/user/workspaces')) {
        return workspaces.map(({ slug }) => ({ workspace: { slug } }))
      }
      for (const workspace of workspaces) {
        const prefix = `/repositories/${encodeURIComponent(workspace.slug)}?`
        if (path.startsWith(prefix)) {
          return workspace.repos
        }
      }
      return []
    })
  }

  it('maps and caches user repositories from workspace-scoped endpoints', async () => {
    mockWorkspaceScopedRepos([{ slug: 'workspace', repos: [rawRepo] }])

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
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledWith(
      '/user/workspaces?pagelen=100',
      settings
    )
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledWith(
      '/repositories/workspace?role=member&pagelen=100&sort=-updated_on',
      settings
    )
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledTimes(2)
  })

  it('aggregates repositories across all accessible workspaces', async () => {
    mockWorkspaceScopedRepos([
      { slug: 'alpha', repos: [rawRepo] },
      {
        slug: 'beta',
        repos: [
          {
            ...rawRepo,
            uuid: '{repo-uuid-2}',
            full_name: 'beta/other',
            name: 'other',
            slug: 'other',
            workspace: { slug: 'beta' }
          }
        ]
      }
    ])

    const listed = await repos.listUserRepos({}, settings)

    expect(listed.map((repo) => repo.fullName)).toEqual(['workspace/demo', 'beta/other'])
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledWith(
      '/repositories/alpha?role=member&pagelen=100&sort=-updated_on',
      settings
    )
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledWith(
      '/repositories/beta?role=member&pagelen=100&sort=-updated_on',
      settings
    )
  })

  it('filters repositories by search term', async () => {
    mockWorkspaceScopedRepos([
      {
        slug: 'workspace',
        repos: [
          rawRepo,
          {
            ...rawRepo,
            uuid: '{repo-uuid-2}',
            full_name: 'workspace/other',
            name: 'other',
            slug: 'other',
            description: 'Unrelated project'
          }
        ]
      }
    ])

    const filtered = await repos.listUserRepos({ search: 'demo' }, settings)

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.fullName).toBe('workspace/demo')
  })

  it('lists unique sorted workspace slugs from user workspaces', async () => {
    vi.mocked(http.bitbucketJsonAllPages).mockResolvedValue([
      { workspace: { slug: 'beta' } },
      { workspace: { slug: 'alpha' } },
      { workspace: { slug: 'beta' } }
    ])

    await expect(repos.listWorkspaces(settings)).resolves.toEqual(['alpha', 'beta'])
    expect(http.bitbucketJsonAllPages).toHaveBeenCalledWith('/user/workspaces?pagelen=100', settings)
  })

  it('creates a repository and clears the cache', async () => {
    mockWorkspaceScopedRepos([{ slug: 'workspace', repos: [rawRepo] }])
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
    mockWorkspaceScopedRepos([{ slug: 'workspace', repos: [rawRepo] }])
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
