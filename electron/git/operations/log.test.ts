import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { commitMessage, listTreeFiles, logGraph } from './log'

let tmpDir: string
let firstHash: string
let secondHash: string

const TEST_AUTHOR = {
  GIT_AUTHOR_NAME: 'Test',
  GIT_AUTHOR_EMAIL: 'test@example.com',
  GIT_COMMITTER_NAME: 'Test',
  GIT_COMMITTER_EMAIL: 'test@example.com'
}

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-log-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' })

  writeFileSync(join(tmpDir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "initial commit"', { cwd: tmpDir, stdio: 'ignore', env: { ...process.env, ...TEST_AUTHOR } })
  firstHash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()

  writeFileSync(join(tmpDir, 'second.txt'), 'second\n')
  execSync('git add second.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "second commit"', { cwd: tmpDir, stdio: 'ignore', env: { ...process.env, ...TEST_AUTHOR } })
  secondHash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('logGraph', () => {
  it('returns commits in reverse chronological order', async () => {
    const result = await logGraph(tmpDir, 'git', 100)
    expect(result.commits).toHaveLength(2)
    expect(result.commits[0].hash).toBe(secondHash)
    expect(result.commits[1].hash).toBe(firstHash)
  })

  it('respects maxCount', async () => {
    const result = await logGraph(tmpDir, 'git', 1)
    expect(result.commits).toHaveLength(1)
    expect(result.maxCount).toBe(1)
  })

  it('populates commit fields', async () => {
    const result = await logGraph(tmpDir, 'git', 100)
    const commit = result.commits[0]
    expect(commit.hash).toBe(secondHash)
    expect(commit.subject).toBe('second commit')
    expect(commit.author.name).toBe('Test')
    expect(commit.author.email).toBe('test@example.com')
  })
})

describe('commitMessage', () => {
  it('returns the full commit message', async () => {
    const msg = await commitMessage(tmpDir, 'git', firstHash)
    expect(msg.trim()).toBe('initial commit')
  })
})

describe('listTreeFiles', () => {
  it('lists files in the commit tree', async () => {
    const files = await listTreeFiles(tmpDir, 'git', firstHash)
    expect(files).toContain('README.md')
  })

  it('includes files from later commits', async () => {
    const files = await listTreeFiles(tmpDir, 'git', secondHash)
    expect(files).toContain('README.md')
    expect(files).toContain('second.txt')
  })
})
