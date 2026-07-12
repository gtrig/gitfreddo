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
  cherryPickAbort,
  cherryPickContinue,
  cherryPickMultiple,
  cherryPickSkip,
  revertCommit,
  resetRepo,
  rebaseAbort,
  rebaseContinue,
  rebaseSkip,
  rebaseStart,
  rebaseSquash,
  rebaseDrop,
  rebaseReword,
  rebaseInteractive
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

  it('rejects resetting past the root commit', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-reset-root-'))
    const run = (args: string[]) =>
      runGitOrThrow(args, { cwd: tempDir!, gitBinaryPath: 'git' })

    await run(['init', '-b', 'main'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test'])
    writeFileSync(join(tempDir, 'file.txt'), 'root\n')
    await run(['add', 'file.txt'])
    await run(['commit', '-m', 'root'])

    await expect(resetToParent(tempDir, 'git', 'soft')).rejects.toThrow(/root commit/i)
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

  it('requires at least one commit to drop', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    await expect(rebaseDrop(repo.cwd, 'git', [])).rejects.toThrow(/one commit/)
  })

  it('rejects reword with an empty message', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    await expect(rebaseReword(repo.cwd, 'git', repo.hashes[0]!, '   ')).rejects.toThrow(/empty/i)
  })

  it('runs an interactive rebase with a custom todo list', async () => {
    const repo = await createLinearRepo(['first', 'second'])
    tempDir = repo.cwd
    const short = repo.hashes[1]!.slice(0, 7)

    await rebaseInteractive(repo.cwd, 'git', repo.hashes[0]!, [`pick ${short} second`])
    const subjects = (await repo.run(['log', '--format=%s'])).trim().split('\n')
    expect(subjects).toEqual(['second'])
  })

  it('returns immediately when cherry-picking an empty list', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    await expect(cherryPickMultiple(repo.cwd, 'git', [])).resolves.toBeUndefined()
  })

  it('aborts a conflicting rebase', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'shared.txt'), 'base\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'initial'])
    await repo.run(['branch', 'side'])
    await repo.run(['switch', 'side'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'side change\n')
    await repo.run(['commit', '-am', 'side work'])
    await repo.run(['switch', 'main'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'main change\n')
    await repo.run(['commit', '-am', 'main work'])
    await repo.run(['switch', 'side'])

    await expect(rebaseStart(repo.cwd, 'git', 'main')).rejects.toThrow()
    await rebaseAbort(repo.cwd, 'git')
    expect((await repo.run(['status', '--porcelain'])).trim()).toBe('')
  })

  it('continues and skips a conflicting rebase', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'shared.txt'), 'base\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'initial'])
    await repo.run(['branch', 'side'])
    await repo.run(['switch', 'side'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'side change\n')
    await repo.run(['commit', '-am', 'side work'])
    await repo.run(['switch', 'main'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'main change\n')
    await repo.run(['commit', '-am', 'main work'])
    await repo.run(['switch', 'side'])

    await expect(rebaseStart(repo.cwd, 'git', 'main')).rejects.toThrow()
    writeFileSync(join(repo.cwd, 'shared.txt'), 'resolved\n')
    await repo.run(['add', 'shared.txt'])
    await rebaseContinue(repo.cwd, 'git')

    await repo.run(['branch', 'side-2', 'main'])
    await repo.run(['switch', 'side-2'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'side two\n')
    await repo.run(['commit', '-am', 'side two'])
    await repo.run(['switch', 'main'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'main two\n')
    await repo.run(['commit', '-am', 'main two'])
    await repo.run(['switch', 'side-2'])
    await expect(rebaseStart(repo.cwd, 'git', 'main')).rejects.toThrow()
    await rebaseSkip(repo.cwd, 'git')
  })

  it('aborts a conflicting cherry-pick', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'shared.txt'), 'base\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'initial'])
    const first = repo.hashes[0]!
    writeFileSync(join(repo.cwd, 'shared.txt'), 'picked\n')
    await repo.run(['commit', '-am', 'picked'])
    const picked = (await repo.run(['rev-parse', 'HEAD'])).trim()
    await repo.run(['reset', '--hard', first])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'different\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'diverged'])

    await expect(cherryPick(repo.cwd, 'git', picked)).rejects.toThrow()
    await cherryPickAbort(repo.cwd, 'git')
    expect((await repo.run(['status', '--porcelain'])).trim()).toBe('')
  })

  it('continues and skips a conflicting cherry-pick', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'shared.txt'), 'base\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'initial'])
    const first = repo.hashes[0]!
    writeFileSync(join(repo.cwd, 'shared.txt'), 'picked\n')
    await repo.run(['commit', '-am', 'picked'])
    const picked = (await repo.run(['rev-parse', 'HEAD'])).trim()
    await repo.run(['reset', '--hard', first])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'different\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'diverged'])

    await expect(cherryPick(repo.cwd, 'git', picked)).rejects.toThrow()
    writeFileSync(join(repo.cwd, 'shared.txt'), 'resolved\n')
    await repo.run(['add', 'shared.txt'])
    await cherryPickContinue(repo.cwd, 'git')
    expect((await repo.run(['log', '-1', '--format=%s'])).trim()).toBe('picked')

    await repo.run(['reset', '--hard', first])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'different\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'diverged'])
    await expect(cherryPick(repo.cwd, 'git', picked)).rejects.toThrow()
    await cherryPickSkip(repo.cwd, 'git')
  })

  it('rejects interactive rebase with an empty todo list', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    await expect(rebaseInteractive(repo.cwd, 'git', repo.hashes[0]!, [])).rejects.toThrow(/empty/i)
  })

  it('rejects history rewrite with a dirty working tree', async () => {
    const repo = await createLinearRepo(['first', 'second'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'dirty.txt'), 'dirty\n')
    await expect(rebaseSquash(repo.cwd, 'git', [repo.hashes[0]!, repo.hashes[1]!])).rejects.toThrow(
      /clean/i
    )
  })

  it('rejects squashing merge commits', async () => {
    const mergeRepo = await createMergeCommitRepo()
    tempDir = mergeRepo.cwd
    await expect(
      rebaseSquash(mergeRepo.cwd, 'git', [mergeRepo.mergeHash, mergeRepo.mergeHash])
    ).rejects.toThrow(/merge commits/i)
  })

  it('rejects dropping merge commits', async () => {
    const mergeRepo = await createMergeCommitRepo()
    tempDir = mergeRepo.cwd
    await expect(rebaseDrop(mergeRepo.cwd, 'git', [mergeRepo.mergeHash])).rejects.toThrow(
      /merge commits/i
    )
  })

  it('rejects revert while another git operation is active', async () => {
    const repo = await createLinearRepo(['first'])
    tempDir = repo.cwd
    writeFileSync(join(repo.cwd, 'shared.txt'), 'base\n')
    await repo.run(['add', 'shared.txt'])
    await repo.run(['commit', '-m', 'initial'])
    await repo.run(['branch', 'side'])
    await repo.run(['switch', 'side'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'side change\n')
    await repo.run(['commit', '-am', 'side work'])
    await repo.run(['switch', 'main'])
    writeFileSync(join(repo.cwd, 'shared.txt'), 'main change\n')
    await repo.run(['commit', '-am', 'main work'])
    await repo.run(['switch', 'side'])
    await expect(rebaseStart(repo.cwd, 'git', 'main')).rejects.toThrow()

    await expect(revertCommit(repo.cwd, 'git', repo.hashes[0]!)).rejects.toThrow(/finish or abort/i)
    await rebaseAbort(repo.cwd, 'git')
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
