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
import { listGitHubRepoContexts, resolveGitHubRepoContext } from './repo-context'
import type { AppSettings } from '../../shared/ipc'

const settings = { gitBinaryPath: 'git', defaultRemote: 'origin' } as AppSettings

describe('listGitHubRepoContexts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deduplicates GitHub remotes by owner/repo', async () => {
    vi.mocked(remoteList).mockResolvedValue([
      { name: 'origin', url: 'https://github.com/octo/repo.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' },
      { name: 'upstream', url: 'git@github.com:octo/repo.git', fetch: '+refs/heads/*:refs/remotes/upstream/*', push: 'refs/heads/*:refs/heads/*' },
      { name: 'other', url: 'https://gitlab.com/group/project.git', fetch: '+refs/heads/*:refs/remotes/other/*', push: 'refs/heads/*:refs/heads/*' }
    ])

    const contexts = await listGitHubRepoContexts('/tmp/repo', settings)
    expect(contexts).toEqual([{ owner: 'octo', repo: 'repo', host: 'github.com' }])
  })
})

describe('resolveGitHubRepoContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns parsed context from the resolved remote url', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://github.com/octo/repo.git\n')

    const ctx = await resolveGitHubRepoContext('/tmp/repo', settings)
    expect(ctx).toEqual({ owner: 'octo', repo: 'repo', host: 'github.com' })
  })

  it('falls back to other GitHub remotes when the default is not GitHub', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://gitlab.com/group/project.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      { name: 'origin', url: 'https://gitlab.com/group/project.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' },
      { name: 'github', url: 'https://github.com/octo/fallback.git', fetch: '+refs/heads/*:refs/remotes/github/*', push: 'refs/heads/*:refs/heads/*' }
    ])

    const ctx = await resolveGitHubRepoContext('/tmp/repo', settings)
    expect(ctx).toEqual({ owner: 'octo', repo: 'fallback', host: 'github.com' })
  })

  it('throws when no GitHub remote exists', async () => {
    vi.mocked(resolveRemoteName).mockResolvedValue('origin')
    vi.mocked(runGitOrThrow).mockResolvedValue('https://gitlab.com/group/project.git\n')
    vi.mocked(remoteList).mockResolvedValue([
      { name: 'origin', url: 'https://gitlab.com/group/project.git', fetch: '+refs/heads/*:refs/remotes/origin/*', push: 'refs/heads/*:refs/heads/*' }
    ])

    await expect(resolveGitHubRepoContext('/tmp/repo', settings)).rejects.toThrow(
      /not a GitHub repository/
    )
  })
})
