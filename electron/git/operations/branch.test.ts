import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  branchCheckout,
  branchCheckoutRemote,
  branchCreate,
  branchDelete,
  branchDeleteRemote,
  branchList,
  branchRename,
  branchSetUpstream,
  branchUnsetUpstream,
  buildBranchSwitchArgs,
  parseBranchLine,
  parseRemoteBranchRef,
  stripAnsi
} from './branch'
import * as gitRunner from '../git-runner'
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

  it('returns ahead and behind as zero from parseBranchLine', () => {
    const parsed = parseBranchLine('* main 125c15ed41cf1b761557e592b83bf2f856c1070e subject')
    expect(parsed?.ahead).toBe(0)
    expect(parsed?.behind).toBe(0)
  })

  it('returns null for malformed branch lines', () => {
    expect(parseBranchLine('* main not-a-hash subject')).toBeNull()
    expect(parseBranchLine('')).toBeNull()
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

describe('branchCreate and branchRename', () => {
  it('creates and renames a local branch', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-create-'))
    try {
      initRepo(repoDir)
      await branchCreate(repoDir, 'git', 'feature', 'main')
      await branchRename(repoDir, 'git', 'feature', 'renamed')

      const branches = (await runGitOrThrow(['branch', '--list'], { cwd: repoDir })).trim()
      expect(branches).toContain('renamed')
      expect(branches).not.toContain('feature')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })
})

describe('branchDelete', () => {
  it('force-deletes a branch that is not fully merged', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-force-'))
    try {
      initRepo(repoDir)
      await runGitOrThrow(['branch', 'feature', 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'feature'], { cwd: repoDir })
      writeFileSync(join(repoDir, 'only-feature.txt'), 'feature-only\n')
      await runGitOrThrow(['add', 'only-feature.txt'], { cwd: repoDir })
      await runGitOrThrow(['commit', '-m', 'feature only'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'main'], { cwd: repoDir })

      await branchDelete(repoDir, 'git', 'feature', true)

      const branches = (await runGitOrThrow(['branch', '--list'], { cwd: repoDir })).trim()
      expect(branches).not.toContain('feature')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })

  it('deletes a local branch', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-delete-'))
    try {
      initRepo(repoDir)
      await runGitOrThrow(['branch', 'feature', 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'main'], { cwd: repoDir })

      await branchDelete(repoDir, 'git', 'feature')

      const branches = (await runGitOrThrow(['branch', '--list'], { cwd: repoDir })).trim()
      expect(branches).not.toContain('feature')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })
})

describe('branchList', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns zero ahead/behind when rev-list fails for upstream', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-ab-fail-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-ab-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      execSync('git push -u origin main', { cwd: repoDir, stdio: 'ignore' })

      const original = gitRunner.runGitOrThrow
      vi.spyOn(gitRunner, 'runGitOrThrow').mockImplementation(async (args, opts) => {
        if (args[0] === 'rev-list' && args[1] === '--left-right') {
          throw new Error('rev-list failed')
        }
        return original(args, opts!)
      })

      const branches = await branchList(repoDir, 'git')
      const main = branches.find((branch) => branch.name === 'main' && !branch.isRemote)
      expect(main?.upstream).toBe('origin/main')
      expect(main?.ahead).toBe(0)
      expect(main?.behind).toBe(0)
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('adds ahead and behind counts for branches with upstream', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-list-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      execSync('git push -u origin main', { cwd: repoDir, stdio: 'ignore' })
      writeFileSync(join(repoDir, 'README.md'), 'ahead commit\n')
      execSync('git add README.md', { cwd: repoDir, stdio: 'ignore' })
      execSync('git commit -m "ahead"', { cwd: repoDir, stdio: 'ignore' })

      const branches = await branchList(repoDir, 'git')
      const main = branches.find((branch) => branch.name === 'main' && !branch.isRemote)
      expect(main?.upstream).toBe('origin/main')
      expect(main?.ahead).toBe(1)
      expect(main?.behind).toBe(0)
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
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

  it('checks out an existing branch when detach is explicitly false', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-explicit-'))
    try {
      initRepo(repoDir)
      await runGitOrThrow(['branch', 'feature', 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'main'], { cwd: repoDir })

      await branchCheckout(repoDir, 'git', 'feature', { detach: false })

      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe('feature')
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

describe('branchCheckoutRemote', () => {
  it('rejects invalid remote branch references', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-remote-invalid-'))
    try {
      initRepo(repoDir)
      await expect(branchCheckoutRemote(repoDir, 'git', 'origin')).rejects.toThrow(
        /invalid remote branch/i
      )
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
    }
  })

  it('creates a tracking branch from a remote branch', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-remote-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-remote-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      execSync('git push -u origin main', { cwd: repoDir, stdio: 'ignore' })
      execSync('git fetch origin', { cwd: repoDir, stdio: 'ignore' })

      await branchCheckoutRemote(repoDir, 'git', 'remotes/origin/main', 'tracked-main')

      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe('tracked-main')
      const upstream = (
        await runGitOrThrow(['rev-parse', '--abbrev-ref', 'tracked-main@{upstream}'], {
          cwd: repoDir
        })
      ).trim()
      expect(upstream).toBe('origin/main')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('checks out an existing local branch that matches the remote name', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-remote-existing-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-remote-existing-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      await runGitOrThrow(['branch', 'feature', 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'feature'], { cwd: repoDir })
      writeFileSync(join(repoDir, 'feature.txt'), 'feature\n')
      await runGitOrThrow(['add', 'feature.txt'], { cwd: repoDir })
      await runGitOrThrow(['commit', '-m', 'feature'], { cwd: repoDir })
      execSync('git push -u origin feature', { cwd: repoDir, stdio: 'ignore' })
      await runGitOrThrow(['switch', 'main'], { cwd: repoDir })
      await runGitOrThrow(['branch', 'tracked', 'feature'], { cwd: repoDir })
      execSync('git fetch origin', { cwd: repoDir, stdio: 'ignore' })

      await branchCheckoutRemote(repoDir, 'git', 'remotes/origin/feature', 'tracked')

      const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: repoDir })).trim()
      expect(current).toBe('tracked')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })
})

describe('branch upstream and remote delete', () => {
  it('sets, unsets, and deletes a remote branch', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-upstream-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-upstream-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      await runGitOrThrow(['branch', 'feature', 'main'], { cwd: repoDir })
      await runGitOrThrow(['switch', 'feature'], { cwd: repoDir })
      writeFileSync(join(repoDir, 'feature.txt'), 'feature\n')
      await runGitOrThrow(['add', 'feature.txt'], { cwd: repoDir })
      await runGitOrThrow(['commit', '-m', 'feature'], { cwd: repoDir })
      await runGitOrThrow(['push', '-u', 'origin', 'feature'], { cwd: repoDir })

      await branchUnsetUpstream(repoDir, 'git', 'feature')
      await branchSetUpstream(repoDir, 'git', 'feature', 'origin/feature')
      await branchDeleteRemote(repoDir, 'git', 'origin', 'feature')

      const remoteBranches = (
        await runGitOrThrow(['branch', '-r', '--list', 'origin/feature'], { cwd: repoDir })
      ).trim()
      expect(remoteBranches).toBe('')
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('unsets upstream for the current branch when no name is given', async () => {
    const repoDir = mkdtempSync(join(tmpdir(), 'gf-branch-unset-current-'))
    const bareRemote = mkdtempSync(join(tmpdir(), 'gf-branch-unset-current-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      initRepo(repoDir)
      execSync(`git remote add origin "${bareRemote}"`, { cwd: repoDir, stdio: 'ignore' })
      execSync('git push -u origin main', { cwd: repoDir, stdio: 'ignore' })

      await branchUnsetUpstream(repoDir, 'git')

      await expect(
        runGitOrThrow(['rev-parse', '--abbrev-ref', 'main@{upstream}'], { cwd: repoDir })
      ).rejects.toThrow()
    } finally {
      rmSync(repoDir, { recursive: true, force: true })
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })
})
