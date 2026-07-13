import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { canonicalizePath, hasGitDir, normalizeRepoPath, resolveGitDirSync } from './repo-path'

describe('resolveGitDirSync', () => {
  let tempDir = ''

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = ''
    }
  })

  it('resolves a standard .git directory', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-repo-'))
    const gitDir = join(tempDir, '.git')
    mkdirSync(gitDir)
    expect(resolveGitDirSync(tempDir)).toBe(resolve(gitDir))
  })

  it('resolves a worktree gitfile pointer', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-worktree-'))
    const mainRepo = join(tempDir, 'main')
    const worktree = join(tempDir, 'wt')
    const actualGitDir = join(mainRepo, '.git', 'worktrees', 'wt')
    mkdirSync(actualGitDir, { recursive: true })
    mkdirSync(worktree)
    writeFileSync(join(worktree, '.git'), `gitdir: ${actualGitDir}\n`)
    expect(resolveGitDirSync(worktree)).toBe(resolve(actualGitDir))
  })

  it('throws when .git is missing or invalid', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-missing-'))
    expect(() => resolveGitDirSync(tempDir)).toThrow(/No \.git found/)

    writeFileSync(join(tempDir, '.git'), 'not a gitdir pointer\n')
    expect(() => resolveGitDirSync(tempDir)).toThrow(/Invalid \.git file/)
  })
})

describe('canonicalizePath', () => {
  let tempDir = ''

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = ''
    }
  })

  it('resolves symlinks to the same canonical path', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-canonical-'))
    const target = join(tempDir, 'target')
    const link = join(tempDir, 'link')
    mkdirSync(target)
    symlinkSync(target, link, 'dir')
    expect(canonicalizePath(link)).toBe(canonicalizePath(target))
  })

  it('normalizes and detects git repositories', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-hasgit-'))
    expect(hasGitDir(tempDir)).toBe(false)
    mkdirSync(join(tempDir, '.git'))
    expect(hasGitDir(tempDir)).toBe(true)
    expect(normalizeRepoPath('./relative')).toBe(resolve('./relative'))
  })
})
