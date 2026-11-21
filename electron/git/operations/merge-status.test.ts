import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { mergeSquashInto, mergeStatus } from './merge'

const dirs: string[] = []

/** Run git, ignoring the exit code (conflicts exit non-zero on purpose). */
function git(cwd: string, ...args: string[]): string {
  return spawnSync('git', args, { cwd, encoding: 'utf8' }).stdout.trim()
}

/** main and feature both change conflict.txt, so merging/rebasing them conflicts. */
function conflictingRepo(): string {
  const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-status-'))
  dirs.push(cwd)
  git(cwd, 'init', '-q', '-b', 'main')
  git(cwd, 'config', 'user.email', 'test@example.com')
  git(cwd, 'config', 'user.name', 'Test')
  git(cwd, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(cwd, 'conflict.txt'), 'base\n')
  git(cwd, 'add', '-A')
  git(cwd, 'commit', '-qm', 'base')
  git(cwd, 'switch', '-qc', 'feature')
  writeFileSync(join(cwd, 'conflict.txt'), 'feature\n')
  git(cwd, 'commit', '-qam', 'feature change')
  git(cwd, 'switch', '-q', 'main')
  writeFileSync(join(cwd, 'conflict.txt'), 'main\n')
  git(cwd, 'commit', '-qam', 'main change')
  return cwd
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('mergeStatus during other operations', () => {
  it('labels a stopped rebase with the branch being rebased', async () => {
    const cwd = conflictingRepo()
    git(cwd, 'switch', '-q', 'feature')
    git(cwd, 'rebase', 'main')

    const status = await mergeStatus(cwd, 'git')
    expect(status).toMatchObject({
      inProgress: true,
      kind: 'rebase',
      conflictedPaths: ['conflict.txt'],
      incomingLabel: 'feature'
    })
    expect(status.currentBranch).toBeUndefined()
  })

  it('labels a stopped cherry-pick with the picked commit', async () => {
    const cwd = conflictingRepo()
    const picked = git(cwd, 'rev-parse', '--short', 'feature')
    git(cwd, 'cherry-pick', 'feature')

    const status = await mergeStatus(cwd, 'git')
    expect(status).toMatchObject({
      inProgress: true,
      kind: 'cherry-pick',
      incomingLabel: picked,
      currentBranch: 'main'
    })
  })

  it('labels a merge of a remote-tracking branch with its name', async () => {
    const cwd = conflictingRepo()
    const remote = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-status-remote-'))
    dirs.push(remote)
    git(remote, 'init', '-q', '--bare')
    git(cwd, 'remote', 'add', 'origin', remote)
    git(cwd, 'push', '-q', 'origin', 'feature')
    git(cwd, 'fetch', '-q', 'origin')
    git(cwd, 'merge', 'origin/feature')

    const status = await mergeStatus(cwd, 'git')
    expect(status).toMatchObject({ kind: 'merge', incomingLabel: 'origin/feature' })
    expect(status.mergeMessage).toContain("Merge remote-tracking branch 'origin/feature'")
  })

  it('falls back to the first line of a custom merge message', async () => {
    const cwd = conflictingRepo()
    git(cwd, 'merge', '-m', 'Bring in the feature work', 'feature')

    const status = await mergeStatus(cwd, 'git')
    expect(status.incomingLabel).toBe('Bring in the feature work')
  })
})

describe('mergeSquashInto with conflicts', () => {
  it('reports conflicted paths instead of throwing', async () => {
    const cwd = conflictingRepo()
    git(cwd, 'switch', '-q', 'feature')

    const result = await mergeSquashInto(cwd, 'git', { sourceBranch: 'feature', targetBranch: 'main' })
    expect(result).toEqual({
      status: 'conflicts',
      conflictedPaths: ['conflict.txt'],
      targetBranch: 'main'
    })
  })
})
