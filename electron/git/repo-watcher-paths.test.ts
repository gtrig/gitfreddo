import { describe, expect, it } from 'vitest'
import { resolve } from 'path'
import {
  isIgnorableGitWatchPath,
  shouldIgnoreWorktreeWatchPath
} from './repo-watcher-paths'

describe('shouldIgnoreWorktreeWatchPath', () => {
  const repoRoot = resolve('/home/user/project')
  const gitDir = resolve('/home/user/project/.git')

  it('ignores paths inside the git directory', () => {
    expect(shouldIgnoreWorktreeWatchPath(gitDir, repoRoot, gitDir)).toBe(true)
    expect(shouldIgnoreWorktreeWatchPath(resolve(gitDir, 'HEAD'), repoRoot, gitDir)).toBe(true)
  })

  it('does not ignore normal worktree files', () => {
    expect(shouldIgnoreWorktreeWatchPath(resolve(repoRoot, 'src/app.ts'), repoRoot, gitDir)).toBe(
      false
    )
  })

  it('ignores a nested .git entry (submodule gitfile)', () => {
    expect(
      shouldIgnoreWorktreeWatchPath(resolve(repoRoot, 'vendor/lib/.git'), repoRoot, gitDir)
    ).toBe(true)
  })
})

describe('isIgnorableGitWatchPath', () => {
  it('ignores index lock files', () => {
    expect(isIgnorableGitWatchPath('/repo/.git/index.lock')).toBe(true)
    expect(isIgnorableGitWatchPath('/repo/.git/worktrees/feature/index.lock')).toBe(true)
  })

  it('ignores watchman cookie files', () => {
    expect(isIgnorableGitWatchPath('/repo/.git/.watchman-cookie-abc')).toBe(true)
  })

  it('does not ignore HEAD or refs updates', () => {
    expect(isIgnorableGitWatchPath('/repo/.git/HEAD')).toBe(false)
    expect(isIgnorableGitWatchPath('/repo/.git/refs/heads/main')).toBe(false)
    expect(isIgnorableGitWatchPath('/repo/.git/index')).toBe(false)
  })
})
