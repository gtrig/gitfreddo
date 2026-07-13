import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../git/git-runner', () => ({
  runGitOrThrow: vi.fn()
}))

vi.mock('../git/operations/remote', () => ({
  remoteList: vi.fn(),
  resolveRemoteName: vi.fn()
}))

import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'
import { resolveGitlabRepoContext } from './repo-context'
import type { AppSettings } from '../../shared/ipc'

const settings = {
  gitBinaryPath: 'git',
  defaultRemote: 'origin',
  gitlabHost: 'gitlab.com'
} as AppSettings

describe('resolveGitlabRepoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns parsed context from the resolved remote url', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://gitlab.com/acme/project.git\n')

    const ctx = await resolveGitlabRepoContext('/tmp/repo', settings)
    expect(ctx).toEqual({
      namespace: 'acme',
      owner: 'acme',
      repo: 'project',
      host: 'gitlab.com'
    })
  })

  it('falls back to other GitLab remotes when the default is not GitLab', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://github.com/octo/repo.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      {
        name: 'origin',
        url: 'https://github.com/octo/repo.git',
        fetch: '+refs/heads/*:refs/remotes/origin/*',
        push: 'refs/heads/*:refs/heads/*'
      },
      {
        name: 'gitlab',
        url: 'https://gitlab.com/acme/fallback.git',
        fetch: '+refs/heads/*:refs/remotes/gitlab/*',
        push: 'refs/heads/*:refs/heads/*'
      }
    ])

    const ctx = await resolveGitlabRepoContext('/tmp/repo', settings)
    expect(ctx.repo).toBe('fallback')
  })

  it('throws when no GitLab remote exists', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://github.com/octo/repo.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      {
        name: 'origin',
        url: 'https://github.com/octo/repo.git',
        fetch: '+refs/heads/*:refs/remotes/origin/*',
        push: 'refs/heads/*:refs/heads/*'
      }
    ])

    await expect(resolveGitlabRepoContext('/tmp/repo', settings)).rejects.toThrow(
      /not a GitLab repository/
    )
  })
})
