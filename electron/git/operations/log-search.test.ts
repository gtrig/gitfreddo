import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { logFile, logPickaxe, logSearch } from './log-search'

let tmpDir: string

const ALICE_ENV = {
  GIT_AUTHOR_NAME: 'Alice',
  GIT_AUTHOR_EMAIL: 'alice@example.com',
  GIT_COMMITTER_NAME: 'Alice',
  GIT_COMMITTER_EMAIL: 'alice@example.com'
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-logsearch-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "alice@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Alice"', { cwd: tmpDir, stdio: 'ignore' })

  writeFileSync(join(tmpDir, 'file.txt'), 'hello world\n')
  execSync('git add file.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "add hello world"', { cwd: tmpDir, stdio: 'ignore', env: { ...process.env, ...ALICE_ENV } })

  writeFileSync(join(tmpDir, 'file.txt'), 'hello world\ngoodbye\n')
  execSync('git add file.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "add goodbye"', { cwd: tmpDir, stdio: 'ignore', env: { ...process.env, ...ALICE_ENV } })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('logFile', () => {
  it('returns commits that modified a given file', async () => {
    const commits = await logFile(tmpDir, 'git', 'file.txt', 100)
    expect(commits).toHaveLength(2)
  })

  it('returns empty for an unmodified file path', async () => {
    const commits = await logFile(tmpDir, 'git', 'nonexistent.txt', 100)
    expect(commits).toHaveLength(0)
  })
})

describe('logPickaxe', () => {
  it('finds commits that added a string', async () => {
    const commits = await logPickaxe(tmpDir, 'git', 'goodbye', 'pickaxe', 100)
    expect(commits).toHaveLength(1)
    expect(commits[0].subject).toBe('add goodbye')
  })
})

describe('logSearch', () => {
  it('filters by author', async () => {
    const commits = await logSearch(tmpDir, 'git', { author: 'Alice' })
    expect(commits.length).toBeGreaterThan(0)
    for (const c of commits) {
      expect(c.author.name).toBe('Alice')
    }
  })

  it('filters by grep pattern', async () => {
    const commits = await logSearch(tmpDir, 'git', { grep: 'goodbye' })
    expect(commits).toHaveLength(1)
    expect(commits[0].subject).toContain('goodbye')
  })

  it('returns empty list for non-matching grep', async () => {
    const commits = await logSearch(tmpDir, 'git', { grep: 'zzz_not_found_zzz' })
    expect(commits).toHaveLength(0)
  })
})
