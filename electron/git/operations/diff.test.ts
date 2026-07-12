import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { diffCommits, diffWorking, diffStaged, fileRead, diffCommitRange, diffShow } from './diff'

let tmpDir: string
let firstHash: string
let secondHash: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-diff-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' })

  writeFileSync(join(tmpDir, 'file.txt'), 'line1\nline2\n')
  execSync('git add file.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' })
  firstHash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()

  writeFileSync(join(tmpDir, 'file.txt'), 'line1\nline2\nline3\n')
  execSync('git add file.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "add line3"', { cwd: tmpDir, stdio: 'ignore' })
  secondHash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('diffWorking', () => {
  it('returns empty diff when working tree is clean', async () => {
    const result = await diffWorking(tmpDir, 'git')
    expect(result.unified).toBe('')
  })

  it('shows changes when a tracked file is modified', async () => {
    writeFileSync(join(tmpDir, 'file.txt'), 'line1\nchanged\n')
    const result = await diffWorking(tmpDir, 'git', 'file.txt')
    expect(result.unified).toContain('changed')
    expect(result.path).toBe('file.txt')
  })

  it('shows word diff output when requested', async () => {
    writeFileSync(join(tmpDir, 'file.txt'), 'line1\nchanged\n')
    const result = await diffWorking(tmpDir, 'git', 'file.txt', true)
    expect(result.unified.length).toBeGreaterThan(0)
  })

  it('diffs an untracked file against /dev/null', async () => {
    writeFileSync(join(tmpDir, 'new-file.txt'), 'brand new\n')
    const result = await diffWorking(tmpDir, 'git', 'new-file.txt')
    expect(result.unified).toContain('brand new')
    expect(result.path).toBe('new-file.txt')
  })
})

describe('diffStaged', () => {
  it('returns empty diff when nothing is staged', async () => {
    const result = await diffStaged(tmpDir, 'git')
    expect(result.unified).toBe('')
  })

  it('shows staged changes', async () => {
    writeFileSync(join(tmpDir, 'file.txt'), 'line1\nstaged\n')
    execSync('git add file.txt', { cwd: tmpDir, stdio: 'ignore' })
    const result = await diffStaged(tmpDir, 'git', 'file.txt')
    expect(result.unified).toContain('staged')
  })
})

describe('diffCommits', () => {
  it('shows diff between two commits', async () => {
    const result = await diffCommits(tmpDir, 'git', firstHash, secondHash)
    expect(result.unified).toContain('line3')
  })

  it('returns empty unified when commits are the same', async () => {
    const result = await diffCommits(tmpDir, 'git', firstHash, firstHash)
    expect(result.unified).toBe('')
  })

  it('supports merge-base and multi-path diffs', async () => {
    const result = await diffCommits(tmpDir, 'git', firstHash, secondHash, undefined, true, [
      'file.txt'
    ])
    expect(result.path).toBe('file.txt')
  })
})

describe('diffCommitRange', () => {
  it('shows changes across a commit range', async () => {
    const result = await diffCommitRange(tmpDir, 'git', firstHash, secondHash)
    expect(result.unified).toContain('line3')
    expect(result.path).toContain('..')
  })
})

describe('diffShow', () => {
  it('shows the patch introduced by a commit', async () => {
    const result = await diffShow(tmpDir, 'git', secondHash, 'file.txt')
    expect(result.unified).toContain('line3')
    expect(result.path).toBe('file.txt')
  })
})

describe('fileRead', () => {
  it('reads file content at a given ref', async () => {
    const content = await fileRead(tmpDir, 'git', firstHash, 'file.txt')
    expect(content).toBe('line1\nline2\n')
  })

  it('reads updated content at a later commit', async () => {
    const content = await fileRead(tmpDir, 'git', secondHash, 'file.txt')
    expect(content).toBe('line1\nline2\nline3\n')
  })
})
