import { execSync } from 'node:child_process'
import { mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { repoStatus } from './repo'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-repo-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' })
  writeFileSync(join(tmpDir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('repoStatus', () => {
  it('returns correct status for a normal branch', async () => {
    const status = await repoStatus(tmpDir, 'git')
    expect(status.branch).toBe('main')
    expect(status.path).toBe(tmpDir)
    expect(status.isDetached).toBe(false)
    expect(status.isLinkedWorktree).toBe(false)
    expect(typeof status.head).toBe('string')
    expect(status.head).toHaveLength(40)
  })

  it('reflects detached HEAD state', async () => {
    const hash = execSync('git rev-parse HEAD', { cwd: tmpDir }).toString().trim()
    execSync(`git checkout ${hash}`, { cwd: tmpDir, stdio: 'ignore' })
    const status = await repoStatus(tmpDir, 'git')
    expect(status.isDetached).toBe(true)
    expect(status.branch).toBe('HEAD')
  })

  it('root equals tmpDir for a simple repo', async () => {
    const status = await repoStatus(tmpDir, 'git')
    // git rev-parse --show-toplevel always returns the canonical real path:
    // on macOS it resolves symlinks (/var → /private/var); on Windows it
    // resolves 8.3 short names to long paths and uses forward slashes.
    // Normalise tmpDir the same way before comparing.
    const realTmpDir = realpathSync(tmpDir).split('\\').join('/')
    expect(status.root).toBe(realTmpDir)
  })
})
