import { resolve } from 'path'
import { describe, expect, it, afterEach } from 'vitest'
import { branchCheckout, parseBranchLine, parseRemoteBranchRef, stripAnsi } from './branch'
import { runGitOrThrow } from '../git-runner'

const FIXTURE_REPO = resolve(__dirname, '../../../test/fixtures/minimal-repo')

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
  const slashBranch = 'topic/sub'

  afterEach(async () => {
    await runGitOrThrow(['switch', 'main'], { cwd: FIXTURE_REPO })
    await runGitOrThrow(['branch', '-D', slashBranch], { cwd: FIXTURE_REPO }).catch(() => {})
  })

  it('checks out local branches whose names contain slashes', async () => {
    await runGitOrThrow(['branch', slashBranch, 'main'], { cwd: FIXTURE_REPO })
    await runGitOrThrow(['switch', 'main'], { cwd: FIXTURE_REPO })

    await branchCheckout(FIXTURE_REPO, 'git', slashBranch)

    const current = (await runGitOrThrow(['branch', '--show-current'], { cwd: FIXTURE_REPO })).trim()
    expect(current).toBe(slashBranch)
  })
})
