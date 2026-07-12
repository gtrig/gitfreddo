import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import { mergeSquashInto } from './merge'

async function createFeatureRepo(): Promise<{
  cwd: string
  mainHead: string
  featureHead: string
}> {
  const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-squash-into-'))
  const run = (args: string[]) => runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

  await run(['init', '-b', 'main'])
  await run(['config', 'user.email', 'test@example.com'])
  await run(['config', 'user.name', 'Test'])
  writeFileSync(join(cwd, 'README.md'), 'main\n')
  await run(['add', 'README.md'])
  await run(['commit', '-m', 'initial'])
  const mainHead = (await run(['rev-parse', 'HEAD'])).trim()

  await run(['switch', '-c', 'feature'])
  writeFileSync(join(cwd, 'feature.txt'), 'feature\n')
  await run(['add', 'feature.txt'])
  await run(['commit', '-m', 'feature change'])
  const featureHead = (await run(['rev-parse', 'HEAD'])).trim()

  return { cwd, mainHead, featureHead }
}

describe('mergeSquashInto', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('checks out the target branch, squash-merges the source, and commits', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd

    const result = await mergeSquashInto(repo.cwd, 'git', {
      sourceBranch: 'feature',
      targetBranch: 'main'
    })

    expect(result).toEqual({
      status: 'completed',
      conflictedPaths: [],
      targetBranch: 'main',
      commitHash: expect.any(String)
    })

    const currentBranch = (
      await runGitOrThrow(['branch', '--show-current'], { cwd: repo.cwd, gitBinaryPath: 'git' })
    ).trim()
    expect(currentBranch).toBe('main')

    const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd: repo.cwd, gitBinaryPath: 'git' })).trim()
    expect(head).not.toBe(repo.mainHead)
    expect(head).not.toBe(repo.featureHead)

    const subject = (
      await runGitOrThrow(['log', '-1', '--format=%s'], { cwd: repo.cwd, gitBinaryPath: 'git' })
    ).trim()
    expect(subject).toBe("Squashed commit from branch 'feature'")

    const tree = (
      await runGitOrThrow(['show', '--name-only', '--format=', 'HEAD'], {
        cwd: repo.cwd,
        gitBinaryPath: 'git'
      })
    ).trim()
    expect(tree).toContain('feature.txt')
  })

  it('rejects when the working tree is not clean', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'dirty.txt'), 'dirty\n')

    await expect(
      mergeSquashInto(repo.cwd, 'git', {
        sourceBranch: 'feature',
        targetBranch: 'main'
      })
    ).rejects.toThrow(/working tree must be clean/i)
  })

  it('rejects when the source branch is not checked out', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd
    await runGitOrThrow(['switch', 'main'], { cwd: repo.cwd, gitBinaryPath: 'git' })

    await expect(
      mergeSquashInto(repo.cwd, 'git', {
        sourceBranch: 'feature',
        targetBranch: 'main'
      })
    ).rejects.toThrow(/checkout feature/i)
  })
})
