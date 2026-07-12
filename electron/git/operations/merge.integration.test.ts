import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import {
  mergeAbort,
  mergeContinue,
  mergeSquashInto,
  mergeStart,
  mergeStatus
} from './merge'

async function initRepo(cwd: string): Promise<(args: string[]) => Promise<string>> {
  const run = (args: string[]) => runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })
  await run(['init', '-b', 'main'])
  await run(['config', 'user.email', 'test@example.com'])
  await run(['config', 'user.name', 'Test'])
  return run
}

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

  it('aborts an in-progress merge', async () => {
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
    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(false)
  })

  it('continues a merge after resolving conflicts', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-continue-'))
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
    writeFileSync(join(tempDir, 'shared.txt'), 'resolved\n')
    await run(['add', 'shared.txt'])

    await mergeContinue(tempDir, 'git')
    const status = await mergeStatus(tempDir, 'git')
    expect(status.inProgress).toBe(false)
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
    expect(await run(['branch', '--show-current'])).toContain('main')
  })

  it('rejects squash merge when working tree is dirty', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-squash-dirty-'))
    const run = await initRepo(tempDir)
    writeFileSync(join(tempDir, 'base.txt'), 'base\n')
    await run(['add', 'base.txt'])
    await run(['commit', '-m', 'initial'])
    await run(['branch', 'feature'])
    writeFileSync(join(tempDir, 'dirty.txt'), 'dirty\n')

    await expect(
      mergeSquashInto(tempDir, 'git', {
        sourceBranch: 'feature',
        targetBranch: 'main'
      })
    ).rejects.toThrow(/clean/)
  })
})
