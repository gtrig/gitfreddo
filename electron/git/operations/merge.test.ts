import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import {
  formatMergeFailureMessage,
  mergeAbort,
  mergeContinue,
  mergeSquashInto,
  mergeStart,
  mergeStatus,
  parseConflictPathsFromMergeOutput
} from './merge'
import { cherryPick, rebaseStart } from './rebase'

async function initRepo(cwd: string): Promise<(args: string[]) => Promise<string>> {
  const run = (args: string[]) => runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })
  await run(['init', '-b', 'main'])
  await run(['config', 'user.email', 'test@example.com'])
  await run(['config', 'user.name', 'Test'])
  return run
}

describe('mergeStart helpers', () => {
  it('parses conflicted file paths from git merge stderr', () => {
    const text = [
      'Auto-merging README.md',
      'CONFLICT (content): Merge conflict in README.md',
      'Auto-merging fortune.sh',
      'CONFLICT (content): Merge conflict in fortune.sh',
      'Automatic merge failed; fix conflicts and then commit the result.'
    ].join('\n')

    expect(parseConflictPathsFromMergeOutput(text)).toEqual(['README.md', 'fortune.sh'])
  })

  it('formats conflict failures as a short summary', () => {
    const stderr = [
      'CONFLICT (content): Merge conflict in README.md',
      'Automatic merge failed; fix conflicts and then commit the result.'
    ].join('\n')

    expect(formatMergeFailureMessage(stderr, '', 1)).toBe(
      'Merge stopped due to conflicts in: README.md'
    )
  })

  it('falls back to the first non auto-merging line for other failures', () => {
    expect(
      formatMergeFailureMessage('fatal: refusing to merge unrelated histories', '', 128)
    ).toBe('fatal: refusing to merge unrelated histories')
  })

  it('falls back to exit code when output is empty', () => {
    expect(formatMergeFailureMessage('', '', 2)).toBe('git merge failed (exit 2)')
  })
})

describe('merge operations integration', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('reports idle merge status on a clean repository', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-status-'))
    await initRepo(tempDir)

    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(false)
    expect(status.kind).toBeNull()
    expect(status.conflictedPaths).toEqual([])
  })

  it('fast-forwards when merging a linear branch', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-ff-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'file.txt'), 'main\n')
    await run(['add', 'file.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'feature.txt'), 'feature\n')
    await run(['add', 'feature.txt'])
    await run(['commit', '-m', 'feature work'])
    await run(['switch', 'main'])

    const result = await mergeStart(tempDir, 'git', 'feature')
    expect(result.status).toBe('completed')

    const subject = (await run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toBe('feature work')
  })

  it('returns conflicts when merge cannot auto-resolve', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-conflict-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'shared.txt'), 'base\n')
    await run(['add', 'shared.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'shared.txt'), 'feature change\n')
    await run(['commit', '-am', 'feature edit'])
    await run(['switch', 'main'])
    writeFileSync(join(tempDir, 'shared.txt'), 'main change\n')
    await run(['commit', '-am', 'main edit'])

    const result = await mergeStart(tempDir, 'git', 'feature')
    expect(result.status).toBe('conflicts')
    expect(result.conflictedPaths).toContain('shared.txt')

    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(true)
    expect(status.kind).toBe('merge')
    expect(status.conflictedPaths).toContain('shared.txt')
    expect(status.incomingLabel).toBe('feature')
  })

  it('aborts and continues an in-progress merge', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-abort-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'shared.txt'), 'base\n')
    await run(['add', 'shared.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'shared.txt'), 'feature change\n')
    await run(['commit', '-am', 'feature edit'])
    await run(['switch', 'main'])
    writeFileSync(join(tempDir, 'shared.txt'), 'main change\n')
    await run(['commit', '-am', 'main edit'])
    await mergeStart(tempDir, 'git', 'feature')

    await mergeAbort(tempDir, 'git')
    expect((await mergeStatus(tempDir, 'git')).inProgress).toBe(false)

    await mergeStart(tempDir, 'git', 'feature')
    writeFileSync(join(tempDir, 'shared.txt'), 'resolved\n')
    await run(['add', 'shared.txt'])
    await mergeContinue(tempDir, 'git')
    expect((await mergeStatus(tempDir, 'git')).inProgress).toBe(false)
    const subject = (await run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toMatch(/Merge branch 'feature'/)
  })

  it('squash-merges a branch into another with a clean working tree', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-squash-into-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'base.txt'), 'base\n')
    await run(['add', 'base.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'feature.txt'), 'feature\n')
    await run(['add', 'feature.txt'])
    await run(['commit', '-m', 'feature work'])

    const result = await mergeSquashInto(tempDir, 'git', {
      sourceBranch: 'feature',
      targetBranch: 'main',
      message: 'Squashed feature work'
    })
    expect(result.status).toBe('completed')
    expect(result.targetBranch).toBe('main')

    const subject = (await run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toBe('Squashed feature work')
  })

  it('rejects invalid squash merge parameters', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-squash-invalid-'))
    await initRepo(tempDir)

    await expect(
      mergeSquashInto(tempDir, 'git', { sourceBranch: '', targetBranch: 'main' })
    ).rejects.toThrow(/required/i)
    await expect(
      mergeSquashInto(tempDir, 'git', { sourceBranch: 'main', targetBranch: 'main' })
    ).rejects.toThrow(/differ/i)
  })

  it('throws when merging a missing branch', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-missing-'))
    await initRepo(tempDir)

    await expect(mergeStart(tempDir, 'git', 'does-not-exist')).rejects.toThrow()
  })

  it('creates a merge commit when noFf is requested', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-noff-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'file.txt'), 'main\n')
    await run(['add', 'file.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'feature.txt'), 'feature\n')
    await run(['add', 'feature.txt'])
    await run(['commit', '-m', 'feature work'])
    await run(['switch', 'main'])

    const result = await mergeStart(tempDir, 'git', 'feature', { noFf: true })
    expect(result.status).toBe('completed')
    const parents = (await run(['rev-list', '--parents', '-n', '1', 'HEAD'])).trim().split(/\s+/)
    expect(parents.length).toBeGreaterThan(2)
  })

  it('reports rebase status while a rebase is in progress', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-rebase-status-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'shared.txt'), 'base\n')
    await run(['add', 'shared.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'feature'])
    writeFileSync(join(tempDir, 'shared.txt'), 'feature change\n')
    await run(['commit', '-am', 'feature work'])
    await run(['switch', 'main'])
    writeFileSync(join(tempDir, 'shared.txt'), 'main change\n')
    await run(['commit', '-am', 'main work'])
    await run(['switch', 'feature'])

    await expect(rebaseStart(tempDir, 'git', 'main')).rejects.toThrow()
    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(true)
    expect(status.kind).toBe('rebase')
  })

  it('reports cherry-pick status while cherry-picking', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-cherry-status-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'shared.txt'), 'base\n')
    await run(['add', 'shared.txt'])
    await run(['commit', '-m', 'initial'])
    const first = (await run(['rev-parse', 'HEAD'])).trim()
    writeFileSync(join(tempDir, 'shared.txt'), 'picked\n')
    await run(['commit', '-am', 'picked'])
    const picked = (await run(['rev-parse', 'HEAD'])).trim()
    await run(['reset', '--hard', first])
    writeFileSync(join(tempDir, 'shared.txt'), 'different\n')
    await run(['commit', '-am', 'diverged'])

    await expect(cherryPick(tempDir, 'git', picked)).rejects.toThrow()
    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(true)
    expect(status.kind).toBe('cherry-pick')
    expect(status.incomingLabel).toBeDefined()
  })

  it('rejects squash merge when not on the source branch', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-squash-wrong-branch-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'base.txt'), 'base\n')
    await run(['add', 'base.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    await run(['switch', 'main'])

    await expect(
      mergeSquashInto(tempDir, 'git', {
        sourceBranch: 'feature',
        targetBranch: 'main'
      })
    ).rejects.toThrow(/checkout feature/i)
  })
})
