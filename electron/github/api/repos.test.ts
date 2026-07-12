import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as repos from './repos'
import * as http from './http'

vi.mock('./http', () => ({
  githubJson: vi.fn()
}))

describe('GitHub repos API', () => {
  beforeEach(() => {
    vi.mocked(http.githubJson).mockReset()
    repos.clearRepoCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-12T12:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const rawRepo = {
    id: 1,
    full_name: 'octocat/Hello-World',
    name: 'Hello-World',
    owner: { login: 'octocat' },
    private: false,
    clone_url: 'https://github.com/octocat/Hello-World.git',
    description: 'My first repo',
    default_branch: 'main'
  }

  it('maps and caches the first page of user repos', async () => {
    vi.mocked(http.githubJson).mockResolvedValue([rawRepo])

    const first = await repos.listUserRepos()
    const second = await repos.listUserRepos()

    expect(first).toEqual([
      {
        id: 1,
        fullName: 'octocat/Hello-World',
        name: 'Hello-World',
        owner: 'octocat',
        private: false,
        cloneUrl: 'https://github.com/octocat/Hello-World.git',
        description: 'My first repo',
        defaultBranch: 'main'
      }
    ])
    expect(second).toEqual(first)
    expect(http.githubJson).toHaveBeenCalledTimes(1)
  })

  it('filters repos by search term without using the cache', async () => {
    vi.mocked(http.githubJson).mockResolvedValue([
      rawRepo,
      {
        ...rawRepo,
        id: 2,
        full_name: 'octocat/Other',
        name: 'Other',
        description: 'Docs only'
      }
    ])

    const filtered = await repos.listUserRepos({ search: 'hello' })

    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.fullName).toBe('octocat/Hello-World')
    expect(http.githubJson).toHaveBeenCalledTimes(1)
  })

  it('creates a repository and clears the cache', async () => {
    vi.mocked(http.githubJson)
      .mockResolvedValueOnce([rawRepo])
      .mockResolvedValueOnce({ ...rawRepo, id: 99, full_name: 'octocat/new-repo', name: 'new-repo' })
      .mockResolvedValueOnce([rawRepo])

    await repos.listUserRepos()
    const created = await repos.createRepo({ name: 'new-repo', description: 'Created from GitFreddo' })

    expect(created.fullName).toBe('octocat/new-repo')
    expect(http.githubJson).toHaveBeenLastCalledWith('/user/repos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'new-repo',
        description: 'Created from GitFreddo',
        private: false,
        auto_init: false,
        gitignore_template: undefined,
        license_template: undefined
      })
    })

    await repos.listUserRepos()
    expect(http.githubJson).toHaveBeenCalledTimes(3)
  })

  it('forks a repository and clears the cache', async () => {
    vi.mocked(http.githubJson)
      .mockResolvedValueOnce([rawRepo])
      .mockResolvedValueOnce({ ...rawRepo, full_name: 'octocat/Hello-World-fork' })

    await repos.listUserRepos()
    const forked = await repos.forkRepo('octocat', 'Hello-World')

    expect(forked.fullName).toBe('octocat/Hello-World-fork')
    expect(http.githubJson).toHaveBeenLastCalledWith('/repos/octocat/Hello-World/forks', {
      method: 'POST'
    })
  })
})
