import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { branchCheckout, buildBranchSwitchArgs, parseBranchLine, parseRemoteBranchRef, stripAnsi } from './branch'
import { runGitOrThrow } from '../git-runner'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
  writeFileSync(join(dir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: dir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'ignore' })
}

describe('stripAnsi', () => {
  it('removes ANSI color sequences', () => {
    expect(stripAnsi('\x1B[31mhello\x1B[m')).toBe('hello')
  })
})

describe('parseBranchLine', () => {
  it('parses local branches', () => {
    expect(
      parseBranchLine('* main                   125c15ed41cf1b761557e592b83bf2f856c1070e subject')
    ).toEqual({
      name: 'main',
      head: '125c15ed41cf1b761557e592b83bf2f856c1070e',
      ahead: 0,
      behind: 0,
      isCurrent: true,
      isRemote: false
    })
  })

  it('parses remote-tracking branches', () => {
    expect(
      parseBranchLine(
        '  remotes/gitfreddo/main 125c15ed41cf1b761557e592b83bf2f856c1070e subject'
      )
    ).toEqual({
      name: 'remotes/gitfreddo/main',
      head: '125c15ed41cf1b761557e592b83bf2f856c1070e',
      ahead: 0,
      behind: 0,
      isCurrent: false,
      isRemote: true
    })
  })

  it('ignores symbolic ref lines', () => {
    expect(parseBranchLine('  remotes/gitfreddo/HEAD -> gitfreddo/main')).toBeNull()
  })

  it('strips ANSI color codes before parsing', () => {
    expect(
      parseBranchLine(
        '  \x1B[31mremotes/gitfreddo/main\x1B[m 125c15ed41cf1b761557e592b83bf2f856c1070e subject'
      )
    ).toEqual({
      name: 'remotes/gitfreddo/main',
      head: '125c15ed41cf1b761557e592b83bf2f856c1070e',
      ahead: 0,
      behind: 0,
      isCurrent: false,
      isRemote: true
    })
  })
})

describe('parseRemoteBranchRef', () => {
  it('parses remote branch refs without the remotes/ prefix', () => {
    expect(parseRemoteBranchRef('remotes/origin/feature/login')).toEqual({
      remote: 'origin',
      branch: 'feature/login'
    })
    expect(parseRemoteBranchRef('origin')).toBeNull()
  })
})

describe('buildBranchSwitchArgs', () => {
  it('places --detach before --end-of-options for detached checkout', () => {
    expect(buildBranchSwitchArgs('abc123', true)).toEqual([
      'switch',
      '--detach',
      '--end-of-options',
      'abc123'
    ])
  })

  it('omits --detach for branch checkout', () => {
    expect(buildBranchSwitchArgs('feature/login', false)).toEqual([
      'switch',
      '--end-of-options',
      'feature/login'
    ])
  })
})

describe('branchCheckout', () => {
  it('checks out a tag in detached HEAD when detach is requested', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-'))
    try {
      initRepo(repoDir)
      const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      await runGitOrThrow(['tag', 'v1.0', head], { cwd: repoDir })

      await branchCheckout(repoDir, 'git', 'v1.0', { detach: true })

      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe('')
      const checkedOut = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      expect(checkedOut).toBe(head)
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })

  it('checks out a commit in detached HEAD state', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-'))
    try {
      initRepo(repoDir)
      const firstCommit = (
        await runGitOrThrow(['rev-parse', 'HEAD~0'], { cwd: repoDir })
      ).trim()
      writeFileSync(join(repoDir, 'README.md'), 'second\n')
      execSync('git add README.md', { cwd: repoDir, stdio: 'ignore' })
      execSync('git commit -m "second"', { cwd: repoDir, stdio: 'ignore' })

      await branchCheckout(repoDir, 'git', firstCommit)

      const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repoDir })).trim()
      expect(head).toBe(firstCommit)
      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe('')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })

  it('checks out local branches whose names contain slashes', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-'))
    const slashBranch = 'topic/sub'
    try {
      initRepo(repoDir)
      await runGitOrThrow(['branch', slashBranch, 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'main'], { cwd: repoDir })

      await branchCheckout(repoDir, 'git', slashBranch)

      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe(slashBranch)
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })
})
