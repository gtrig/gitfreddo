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
import { resolveBitbucketRepoContext } from './repo-context'
import type { AppSettings } from '../../shared/ipc'

const settings = { gitBinaryPath: 'git', defaultRemote: 'origin' } as AppSettings

describe('resolveBitbucketRepoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns parsed context from the resolved remote url', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://bitbucket.org/acme/project.git\n')

    const ctx = await resolveBitbucketRepoContext('/tmp/repo', settings)
    expect(ctx).toEqual({
      workspace: 'acme',
      owner: 'acme',
      repo: 'project',
      host: 'bitbucket.org'
    })
  })

  it('falls back to other Bitbucket remotes when the default is not Bitbucket', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://github.com/octo/repo.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      { name: 'origin', url: 'https://github.com/octo/repo.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' },
      { name: 'bitbucket', url: 'https://bitbucket.org/acme/fallback.git', fetch: '+refs/heads/*:refs/remotes/bitbucket/*', push: 'refs/heads/*:refs/heads/*' }
    ])

    const ctx = await resolveBitbucketRepoContext('/tmp/repo', settings)
    expect(ctx.repo).toBe('fallback')
  })

  it('throws when no Bitbucket remote exists', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://github.com/octo/repo.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      { name: 'origin', url: 'https://github.com/octo/repo.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' }
    ])

    await expect(resolveBitbucketRepoContext('/tmp/repo', settings)).rejects.toThrow(
      /not a Bitbucket repository/
    )
  })
})
