import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { branchCheckout, parseBranchLine, parseRemoteBranchRef, stripAnsi } from './branch'
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

describe('branchCheckout', () => {
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
