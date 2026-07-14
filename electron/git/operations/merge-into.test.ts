import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import { mergeInto } from './merge'

async function createFeatureRepo(): Promise<{
  cwd: string
  mainHead: string
  featureHead: string
}> {
  const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-into-'))
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

describe('mergeInto', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('checks out the target branch and merges the source into it, leaving HEAD on target', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd
    // Currently on feature; merge feature into main should switch to main first.

    const result = await mergeInto(repo.cwd, 'git', {
      sourceBranch: 'feature',
      targetBranch: 'main'
    })

    expect(result.status).toBe('completed')
    expect(result.conflictedPaths).toEqual([])

    const currentBranch = (
      await runGitOrThrow(['branch', '--show-current'], { cwd: repo.cwd, gitBinaryPath: 'git' })
    ).trim()
    expect(currentBranch).toBe('main')

    const tree = (
      await runGitOrThrow(['show', '--name-only', '--format=', 'HEAD'], {
        cwd: repo.cwd,
        gitBinaryPath: 'git'
      })
    ).trim()
    expect(tree).toContain('feature.txt')
  })

  it('creates a merge commit when noFf is requested', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd
    // Add a divergent commit on main so a fast-forward is not possible without --no-ff intent.

    const result = await mergeInto(repo.cwd, 'git', {
      sourceBranch: 'feature',
      targetBranch: 'main',
      noFf: true
    })

    expect(result.status).toBe('completed')

    const parents = (
      await runGitOrThrow(['rev-list', '--parents', '-n', '1', 'HEAD'], {
        cwd: repo.cwd,
        gitBinaryPath: 'git'
      })
    ).trim()
    // A --no-ff merge commit has two parents (three tokens: self + 2 parents).
    expect(parents.split(/\s+/).length).toBe(3)
  })

  it('rejects empty or identical branch names', async () => {
    const repo = await createFeatureRepo()
    tempDir = repo.cwd

    await expect(mergeInto(repo.cwd, 'git', { sourceBranch: '', targetBranch: 'main' })).rejects.toThrow(
      /required/i
    )
    await expect(
      mergeInto(repo.cwd, 'git', { sourceBranch: 'main', targetBranch: 'main' })
    ).rejects.toThrow(/differ/i)
  })
})
