import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
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
    // git rev-parse --show-toplevel returns its own canonical form of the
    // path, which can differ from tmpDir as a *string* in OS-specific ways:
    // macOS resolves the /var -> /private/var symlink; Windows expands 8.3
    // short names (TEMP itself is often set to a short-name path like
    // RUNNER~1 in CI, which git resolves to the real long name). Comparing
    // by filesystem identity (device + inode) rather than string equality
    // sidesteps every one of these platform-specific path representations.
    const rootStat = statSync(status.root)
    const tmpDirStat = statSync(tmpDir)
    expect(rootStat.dev).toBe(tmpDirStat.dev)
    expect(rootStat.ino).toBe(tmpDirStat.ino)
  })
})
