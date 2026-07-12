/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { detectForgeFromRemote, detectForgeFromContext } from './detect'

describe('detectForgeFromRemote', () => {
  it('detects github remotes', () => {
    expect(detectForgeFromRemote('https://github.com/org/repo.git')).toBe('github')
  })

  it('detects bitbucket remotes', () => {
    expect(detectForgeFromRemote('https://bitbucket.org/workspace/repo.git')).toBe('bitbucket')
  })

  it('returns null for unknown remotes', () => {
    expect(detectForgeFromRemote('https://gitlab.com/org/repo.git')).toBeNull()
  })
})

describe('detectForgeFromContext', () => {
  it('prefers bitbucket when both forge contexts are available', async () => {
    window.gitfreddo = {
      githubGetRepoContext: vi.fn(async () => ({ owner: 'org', repo: 'repo' })),
      bitbucketGetRepoContext: vi.fn(async () => ({ workspace: 'ws', repo: 'repo' }))
    } as unknown as typeof window.gitfreddo

    await expect(detectForgeFromContext('/repo')).resolves.toBe('bitbucket')
  })

  it('falls back to github when bitbucket context is missing', async () => {
    window.gitfreddo = {
      githubGetRepoContext: vi.fn(async () => ({ owner: 'org', repo: 'repo' })),
      bitbucketGetRepoContext: vi.fn(async () => null)
    } as unknown as typeof window.gitfreddo

    await expect(detectForgeFromContext('/repo')).resolves.toBe('github')
  })
})
