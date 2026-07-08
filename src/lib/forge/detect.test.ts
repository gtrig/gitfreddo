import { describe, expect, it } from 'vitest'
import { detectForgeFromRemote } from './detect'

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
