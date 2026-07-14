import { describe, expect, it, vi } from 'vitest'

const runGitOrThrow = vi.fn()
const remoteList = vi.fn()
const resolveRemoteName = vi.fn()

vi.mock('../git/git-runner', () => ({
  runGitOrThrow: (...args: unknown[]) => runGitOrThrow(...args)
}))

vi.mock('../git/operations/remote', () => ({
  remoteList: (...args: unknown[]) => remoteList(...args),
  resolveRemoteName: (...args: unknown[]) => resolveRemoteName(...args)
}))

import { createRepoContextResolver } from './repo-context'

describe('createRepoContextResolver', () => {
  it('returns context from the resolved remote URL', async () => {
    resolveRemoteName.mockResolvedValue('origin')
    runGitOrThrow.mockResolvedValue('https://example.com/org/repo.git')
    const resolve = createRepoContextResolver(
      (url) => (url.includes('example.com') ? { owner: 'org', repo: 'repo' } : null),
      'Example'
    )

    await expect(
      resolve('/repo', { gitBinaryPath: 'git', defaultRemote: 'origin' } as never)
    ).resolves.toEqual({ owner: 'org', repo: 'repo' })
  })

  it('falls back to other remotes when the preferred remote does not match', async () => {
    resolveRemoteName.mockResolvedValue('origin')
    runGitOrThrow.mockResolvedValue('https://other.com/x/y.git')
    remoteList.mockResolvedValue([
      { name: 'origin', url: 'https://other.com/x/y.git' },
      { name: 'upstream', url: 'https://example.com/org/repo.git' }
    ])

    const resolve = createRepoContextResolver(
      (url) => (url.includes('example.com') ? { owner: 'org', repo: 'repo' } : null),
      'Example'
    )

    await expect(
      resolve('/repo', { gitBinaryPath: 'git', defaultRemote: 'origin' } as never)
    ).resolves.toEqual({ owner: 'org', repo: 'repo' })
  })

  it('throws when no matching remote is found', async () => {
    resolveRemoteName.mockResolvedValue('origin')
    runGitOrThrow.mockResolvedValue('https://other.com/x/y.git')
    remoteList.mockResolvedValue([{ name: 'origin', url: 'https://other.com/x/y.git' }])

    const resolve = createRepoContextResolver(() => null, 'Example')

    await expect(
      resolve('/repo', { gitBinaryPath: 'git', defaultRemote: 'origin' } as never)
    ).rejects.toThrow(/not a Example repository/)
  })
})
