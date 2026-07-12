import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  markCommitForReword,
  markCommitsForDrop,
  markCommitsForSquash,
  resetToParent,
  cherryPick,
  cherryPickMultiple,
  revertCommit,
  resetRepo,
  rebaseStart,
  rebaseSquash,
  rebaseDrop,
  rebaseReword
} from './rebase'
import { runGitOrThrow } from '../git-runner'

async function createMergeCommitRepo(): Promise<{ cwd: string; mergeHash: string }> {
  const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-merge-'))
  const run = (args: string[]) =>
    runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

  await run(['init', '-b', 'main'])
  await run(['config', 'user.email', 'test@example.com'])
  await run(['config', 'user.name', 'Test'])
  writeFileSync(join(cwd, 'main.txt'), 'main\n')
  await run(['add', 'main.txt'])
  await run(['commit', '-m', 'initial'])
  await run(['branch', 'side'])
  writeFileSync(join(cwd, 'main.txt'), 'main updated\n')
  await run(['commit', '-am', 'main change'])
  await run(['switch', 'side'])
  writeFileSync(join(cwd, 'side.txt'), 'side\n')
  await run(['add', 'side.txt'])
  await run(['commit', '-m', 'side change'])
  await run(['switch', 'main'])
  await run(['merge', 'side', '-m', 'merge commit'])
  const mergeHash = (await run(['rev-parse', 'HEAD'])).trim()
  return { cwd, mergeHash }
}

describe('resetToParent', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('soft-resets HEAD back to its parent', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-reset-'))
    const run = (args: string[]) =>
      runGitOrThrow(args, { cwd: tempDir!, gitBinaryPath: 'git' })

    await run(['init', '-b', 'main'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test'])
    writeFileSync(join(tempDir, 'file.txt'), 'one\n')
    await run(['add', 'file.txt'])
    await run(['commit', '-m', 'first'])
    writeFileSync(join(tempDir, 'file.txt'), 'two\n')
    await run(['commit', '-am', 'second'])

    await resetToParent(tempDir, 'git', 'soft')
    const subject = (await run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toBe('first')
  })
})

describe('cherryPick mainline', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('requires mainline when cherry-picking a merge commit', async () => {
    const repo = await createMergeCommitRepo()
    tempDir = repo.cwd
    await runGitOrThrow(['reset', '--hard', 'HEAD~1'], { cwd: repo.cwd, gitBinaryPath: 'git' })

    await expect(cherryPick(repo.cwd, 'git', repo.mergeHash)).rejects.toThrow(/parent line/i)
  })

  it('cherry-picks a merge commit with -m', async () => {
    const repo = await createMergeCommitRepo()
    tempDir = repo.cwd
    await runGitOrThrow(['reset', '--hard', 'HEAD~1'], { cwd: repo.cwd, gitBinaryPath: 'git' })

    await cherryPick(repo.cwd, 'git', repo.mergeHash, false, 1)
    const subject = (
      await runGitOrThrow(['log', '-1', '--format=%s'], { cwd: repo.cwd, gitBinaryPath: 'git' })
    ).trim()
    expect(subject).toBe('merge commit')
  })
})

describe('revertCommit mainline', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('requires mainline when reverting a merge commit', async () => {
    const repo = await createMergeCommitRepo()
    tempDir = repo.cwd

    await expect(revertCommit(repo.cwd, 'git', repo.mergeHash)).rejects.toThrow(/parent line/i)
  })

  it('reverts a merge commit with -m', async () => {
    const repo = await createMergeCommitRepo()
    tempDir = repo.cwd

    await revertCommit(repo.cwd, 'git', repo.mergeHash, 1)
    const parents = (
      await runGitOrThrow(['rev-list', '--parents', '-n', '1', 'HEAD'], {
        cwd: repo.cwd,
        gitBinaryPath: 'git'
      })
    )
      .trim()
      .split(/\s+/)
    expect(parents.length).toBeGreaterThan(1)
  })
})

describe('markCommitForReword', () => {
  const hash = '125c15ed41cf1b761557e592b83bf2f856c1070e'

  it('marks the matching commit as reword', () => {
    const todo = [
      `pick ${hash.slice(0, 7)} Old subject`,
      'pick abcdef0 Later subject'
    ].join('\n')

    expect(markCommitForReword(todo, hash)).toBe(
      [`reword ${hash.slice(0, 7)} Old subject`, 'pick abcdef0 Later subject'].join('\n')
    )
  })

  it('leaves unrelated commits unchanged', () => {
    const todo = 'pick abcdef0 Only commit'
    expect(markCommitForReword(todo, hash)).toBe(todo)
  })

  it('converts edit to reword for the target commit', () => {
    const todo = `edit ${hash} Subject`
    expect(markCommitForReword(todo, hash)).toBe(`reword ${hash} Subject`)
  })
})

describe('markCommitsForSquash', () => {
  const hashes = ['1111111', '2222222', '3333333']

  it('keeps the oldest commit as pick and squashes the rest', () => {
    const todo = [
      'pick 1111111 First',
      'pick 2222222 Second',
      'pick 3333333 Third',
      'pick abcdef0 Outside'
    ].join('\n')

    expect(markCommitsForSquash(todo, hashes)).toBe(
      [
        'pick 1111111 First',
        'squash 2222222 Second',
        'squash 3333333 Third',
        'pick abcdef0 Outside'
      ].join('\n')
    )
  })
})

describe('markCommitsForDrop', () => {
  const hashes = ['2222222', '3333333']

  it('marks selected commits as drop', () => {
    const todo = [
      'pick 1111111 First',
      'pick 2222222 Second',
      'pick 3333333 Third',
      'pick abcdef0 Outside'
    ].join('\n')

    expect(markCommitsForDrop(todo, hashes)).toBe(
      [
        'pick 1111111 First',
        'drop 2222222 Second',
        'drop 3333333 Third',
        'pick abcdef0 Outside'
      ].join('\n')
    )
  })

  it('leaves unrelated commits unchanged when selection is empty', () => {
    const todo = 'pick abcdef0 Only commit'
    expect(markCommitsForDrop(todo, [])).toBe(todo)
  })
})

describe('markCommitsForSquash edge cases', () => {
  it('returns the original todo when fewer than two commits are selected', () => {
    const todo = 'pick 1111111 First\npick 2222222 Second'
    expect(markCommitsForSquash(todo, ['1111111'])).toBe(todo)
  })

  it('converts reword and edit actions to squash for non-primary commits', () => {
    const todo = [
      'pick 1111111 First',
      'reword 2222222 Second',
      'edit 3333333 Third'
    ].join('\n')

    expect(markCommitsForSquash(todo, ['1111111', '2222222', '3333333'])).toBe(
      ['pick 1111111 First', 'squash 2222222 Second', 'squash 3333333 Third'].join('\n')
    )
  })
})

async function createLinearRepo(
  commitMessages: string[]
): Promise<{ cwd: string; hashes: string[]; run: (args: string[]) => Promise<string> }> {
  const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-linear-'))
  const run = (args: string[]) => runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })
  await run(['init', '-b', 'main'])
  await run(['config', 'user.email', 'test@example.com'])
  await run(['config', 'user.name', 'Test'])

  const hashes: string[] = []
  for (let index = 0; index < commitMessages.length; index++) {
    writeFileSync(join(cwd, `file-${index}.txt`), `${commitMessages[index]}\n`)
    await run(['add', '.'])
    await run(['commit', '-m', commitMessages[index]!])
    hashes.push((await run(['rev-parse', 'HEAD'])).trim())
  }

  return { cwd, hashes, run }
}

describe('rebase integration', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('rebases a branch onto an updated main', async () => {
    const repo = await createLinearRepo(['first', 'side-only'])
    tempDir = repo.cwd
    await repo.run(['branch', 'side'])
    await repo.run(['switch', 'main'])
    writeFileSync(join(repo.cwd, 'main-only.txt'), 'main\n')
    await repo.run(['add', 'main-only.txt'])
    await repo.run(['commit', '-m', 'main-only'])
    await repo.run(['switch', 'side'])

    await rebaseStart(repo.cwd, 'git', 'main')
    const subjects = (await repo.run(['log', '--format=%s'])).trim().split('\n')
    expect(subjects).toEqual(['main-only', 'side-only', 'first'])
  })

  it('squashes selected commits together', async () => {
    const repo = await createLinearRepo(['first', 'second', 'third'])
    tempDir = repo.cwd

    await rebaseSquash(repo.cwd, 'git', [repo.hashes[1]!, repo.hashes[2]!])
    const count = (await repo.run(['rev-list', '--count', 'HEAD'])).trim()
    expect(Number(count)).toBe(2)
  })

  it('drops selected commits from history', async () => {
    const repo = await createLinearRepo(['first', 'second', 'third'])
    tempDir = repo.cwd

    await rebaseDrop(repo.cwd, 'git', [repo.hashes[1]!])
    const subjects = (await repo.run(['log', '--format=%s'])).trim().split('\n')
    expect(subjects).toEqual(['third', 'first'])
  })

  it('rewords a commit message', async () => {
    const repo = await createLinearRepo(['first', 'second'])
    tempDir = repo.cwd

    await rebaseReword(repo.cwd, 'git', repo.hashes[1]!, 'Reworded subject')
    const subject = (await repo.run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toBe('Reworded subject')
  })

  it('cherry-picks multiple commits in order', async () => {
    const repo = await createLinearRepo(['first', 'second', 'third'])
    tempDir = repo.cwd
    await repo.run(['branch', 'pick-target'])
    await repo.run(['reset', '--hard', repo.hashes[0]!])

    await cherryPickMultiple(repo.cwd, 'git', [repo.hashes[1]!, repo.hashes[2]!])
    const subjects = (await repo.run(['log', '--format=%s'])).trim().split('\n')
    expect(subjects).toEqual(['third', 'second', 'first'])
  })

  it('requires at least two commits to squash', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    await expect(rebaseSquash(repo.cwd, 'git', [repo.hashes[0]!])).rejects.toThrow(/two commits/)
  })
})

describe('resetRepo', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('hard-resets the repository to a ref', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-reset-repo-'))
    const run = (args: string[]) => runGitOrThrow(args, { cwd: tempDir!, gitBinaryPath: 'git' })

    await run(['init', '-b', 'main'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test'])
    writeFileSync(join(tempDir, 'a.txt'), 'one\n')
    await run(['add', 'a.txt'])
    await run(['commit', '-m', 'first'])
    const first = (await run(['rev-parse', 'HEAD'])).trim()
    writeFileSync(join(tempDir, 'a.txt'), 'two\n')
    await run(['commit', '-am', 'second'])

    await resetRepo(tempDir, 'git', 'hard', first)
    const subject = (await run(['log', '-1', '--format=%s'])).trim()
    expect(subject).toBe('first')
  })
})
