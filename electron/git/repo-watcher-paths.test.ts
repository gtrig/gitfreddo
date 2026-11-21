import { describe, expect, it } from 'vitest'
import { resolve } from 'path'
import {
  gitWatchScope,
  isIgnorableGitWatchPath,
  isUnderAnyDirectory,
  parseIgnoredDirectories,
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

describe('parseIgnoredDirectories', () => {
  const root = resolve('/home/user/project')

  it('keeps ignored directories as absolute paths and drops single files', () => {
    const output = 'node_modules/\0out/\0.env\0packages/app/dist/\0'
    expect(parseIgnoredDirectories(output, root)).toEqual([
      resolve(root, 'node_modules'),
      resolve(root, 'out'),
      resolve(root, 'packages/app/dist')
    ])
  })

  it('returns nothing for empty output', () => {
    expect(parseIgnoredDirectories('', root)).toEqual([])
  })
})

describe('isUnderAnyDirectory', () => {
  const dirs = [resolve('/r/node_modules'), resolve('/r/out')]

  it('matches the directory itself and anything below it', () => {
    expect(isUnderAnyDirectory(resolve('/r/node_modules'), dirs)).toBe(true)
    expect(isUnderAnyDirectory(resolve('/r/node_modules/react/index.js'), dirs)).toBe(true)
  })

  it('normalizes the directory list as well as the path', () => {
    expect(isUnderAnyDirectory(resolve('/r/out/main.js'), ['/r/out/'])).toBe(true)
    expect(isUnderAnyDirectory(resolve('/r/out/main.js'), ['/r/./out'])).toBe(true)
  })

  it('does not match siblings that share a prefix', () => {
    expect(isUnderAnyDirectory(resolve('/r/node_modules_backup/x'), dirs)).toBe(false)
    expect(isUnderAnyDirectory(resolve('/r/src/app.ts'), dirs)).toBe(false)
  })
})

describe('gitWatchScope', () => {
  it('treats index writes as working-tree changes', () => {
    expect(gitWatchScope('/r/.git/index')).toBe('working')
    expect(gitWatchScope('/r/.git/worktrees/feature/index')).toBe('working')
  })

  it('treats refs and HEAD as ref changes', () => {
    expect(gitWatchScope('/r/.git/HEAD')).toBe('refs')
    expect(gitWatchScope('/r/.git/refs/heads/main')).toBe('refs')
    expect(gitWatchScope(undefined)).toBe('refs')
  })
})
