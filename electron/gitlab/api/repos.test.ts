import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repos from './repos'
import * as http from './http'

vi.mock('./http', () => ({
  gitlabJson: vi.fn(),
  gitlabJsonAllPages: vi.fn(),
  getGitlabWebBase: vi.fn(() => 'https://gitlab.com')
}))

const rawProject = {
  id: 42,
  path_with_namespace: 'acme/demo',
  name: 'demo',
  namespace: { full_path: 'acme' },
  visibility: 'private',
  http_url_to_repo: 'https://gitlab.com/acme/demo.git',
  description: 'Demo repo',
  default_branch: 'main'
}

describe('GitLab repos API', () => {
  beforeEach(() => {
    vi.mocked(http.gitlabJson).mockReset()
    vi.mocked(http.gitlabJsonAllPages).mockReset()
    repos.clearRepoCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('maps and caches user repositories', async () => {
    vi.mocked(http.gitlabJsonAllPages).mockResolvedValue([rawProject])

    const first = await repos.listUserRepos({}, 'gitlab.com')
    const second = await repos.listUserRepos({}, 'gitlab.com')

    expect(first).toEqual([
      {
        id: 42,
        fullName: 'acme/demo',
        name: 'demo',
        namespace: 'acme',
        owner: 'acme',
        private: true,
        cloneUrl: 'https://gitlab.com/acme/demo.git',
        description: 'Demo repo',
        defaultBranch: 'main'
      }
    ])
    expect(second).toEqual(first)
    expect(http.gitlabJsonAllPages).toHaveBeenCalledTimes(1)
  })

  it('filters repositories by search term', async () => {
    vi.mocked(http.gitlabJsonAllPages).mockResolvedValue([
      rawProject,
      {
        ...rawProject,
        id: 43,
        path_with_namespace: 'acme/other',
        name: 'other',
        description: 'Unrelated project'
      }
    ])

    const filtered = await repos.listUserRepos({ search: 'demo' }, 'gitlab.com')

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.fullName).toBe('acme/demo')
  })

  it('lists unique sorted namespaces including the user', async () => {
    vi.mocked(http.gitlabJsonAllPages).mockResolvedValue([
      { full_path: 'beta' },
      { full_path: 'alpha' }
    ])
    vi.mocked(http.gitlabJson).mockResolvedValue({ username: 'gtrig' })

    await expect(repos.listNamespaces('gitlab.com')).resolves.toEqual(['alpha', 'beta', 'gtrig'])
  })

  it('creates a repository under the user namespace and clears the cache', async () => {
    vi.mocked(http.gitlabJson)
      .mockResolvedValueOnce({ id: 1, username: 'gtrig' })
      .mockResolvedValueOnce({
        ...rawProject,
        path_with_namespace: 'gtrig/new-repo',
        name: 'new-repo'
      })

    const created = await repos.createRepo(
      { namespace: 'gtrig', name: 'new-repo', description: 'From GitFreddo', private: true },
      'gitlab.com'
    )

    expect(created.fullName).toBe('gtrig/new-repo')
    expect(http.gitlabJson).toHaveBeenLastCalledWith(
      '/projects',
      expect.objectContaining({ method: 'POST' }),
      undefined,
      'gitlab.com'
    )
  })

  it('resolves a group namespace id when creating in a group', async () => {
    vi.mocked(http.gitlabJson)
      .mockResolvedValueOnce({ id: 1, username: 'gtrig' })
      .mockResolvedValueOnce([{ id: 99, full_path: 'acme' }])
      .mockResolvedValueOnce({
        ...rawProject,
        path_with_namespace: 'acme/new-repo',
        name: 'new-repo'
      })

    const created = await repos.createRepo({ namespace: 'acme', name: 'new-repo' }, 'gitlab.com')
    expect(created.fullName).toBe('acme/new-repo')
  })

  it('throws when the group namespace cannot be found', async () => {
    vi.mocked(http.gitlabJson)
      .mockResolvedValueOnce({ id: 1, username: 'gtrig' })
      .mockResolvedValueOnce([])

    await expect(
      repos.createRepo({ namespace: 'missing', name: 'new-repo' }, 'gitlab.com')
    ).rejects.toThrow(/was not found/i)
  })

  it('requires namespace and repository name when creating', async () => {
    await expect(repos.createRepo({ namespace: '', name: '' }, 'gitlab.com')).rejects.toThrow(
      /required/i
    )
  })

  it('forks a repository and clears the cache', async () => {
    vi.mocked(http.gitlabJson).mockResolvedValue({
      ...rawProject,
      path_with_namespace: 'gtrig/demo'
    })

    const forked = await repos.forkRepo('acme', 'demo', 'gitlab.com')

    expect(forked.fullName).toBe('gtrig/demo')
    expect(http.gitlabJson).toHaveBeenCalledWith(
      `/projects/${encodeURIComponent('acme/demo')}/fork`,
      expect.objectContaining({ method: 'POST' }),
      undefined,
      'gitlab.com'
    )
  })

  it('builds the project web url', () => {
    expect(repos.projectWebUrl('acme', 'demo', 'gitlab.com')).toBe('https://gitlab.com/acme/demo')
  })
})
