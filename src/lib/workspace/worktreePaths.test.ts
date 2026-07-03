import { describe, expect, it } from 'vitest'
import { suggestWorktreePath, worktreeLabel } from './worktreePaths'

describe('suggestWorktreePath', () => {
  it('suggests a sibling directory named after the branch', () => {
    expect(suggestWorktreePath('/home/user/my-repo', 'feature/login')).toBe(
      '/home/user/feature-login'
    )
  })

  it('uses backslashes on Windows-style paths', () => {
    expect(suggestWorktreePath('C:\\Projects\\repo', 'fix/bug')).toBe('C:\\Projects\\fix-bug')
  })

  it('sanitizes branch names with path separators', () => {
    expect(suggestWorktreePath('/repo', 'release/1.0')).toBe('/release-1.0')
  })
})

describe('worktreeLabel', () => {
  it('prefers the branch name when present', () => {
    expect(worktreeLabel({ branch: 'main', isDetached: false, path: '/tmp/wt' })).toBe('main')
  })

  it('shows detached label without a branch', () => {
    expect(worktreeLabel({ isDetached: true, path: '/tmp/wt' })).toBe('(detached)')
  })

  it('falls back to the directory name', () => {
    expect(worktreeLabel({ isDetached: false, path: '/home/user/feature-wt/' })).toBe('feature-wt')
  })
})
