import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import * as statusModule from './status'
import { analyzeUndoFromReflog, pickUndoResetMode, peekUndoAction, undoLastAction } from './undo'

describe('pickUndoResetMode', () => {
  it('uses soft reset for commits', () => {
    expect(pickUndoResetMode('commit: Fix login')).toBe('soft')
    expect(pickUndoResetMode('commit (amend): Update message')).toBe('soft')
    expect(pickUndoResetMode('commit (merge): Merge branch side')).toBe('soft')
  })

  it('uses mixed reset for branch moves and resets', () => {
    expect(pickUndoResetMode('reset: moving to HEAD~1')).toBe('mixed')
    expect(pickUndoResetMode('pull: Fast-forward')).toBe('mixed')
    expect(pickUndoResetMode('merge: feature into main')).toBe('mixed')
  })

  it('uses soft reset for cherry-picks', () => {
    expect(pickUndoResetMode('cherry-pick: Add feature')).toBe('soft')
  })

  it('returns null for unsupported operations', () => {
    expect(pickUndoResetMode('checkout: moving from main to side')).toBeNull()
    expect(pickUndoResetMode('rebase (finish): refs/heads/main onto abc')).toBeNull()
  })
})

describe('analyzeUndoFromReflog', () => {
  it('detects undoable commit action', () => {
    const result = analyzeUndoFromReflog([
      { hash: 'bbb', subject: 'commit: Second' },
      { hash: 'aaa', subject: 'commit: First' }
    ])
    expect(result).toEqual({
      canUndo: true,
      targetHash: 'aaa',
      targetShortHash: 'aaa',
      subject: 'commit: Second',
      mode: 'soft'
    })
  })

  it('reports when there is no previous reflog entry', () => {
    expect(
      analyzeUndoFromReflog([{ hash: 'aaa', subject: 'commit: Initial' }])
    ).toEqual({
      canUndo: false,
      reason: 'nothing-to-undo'
    })
  })

  it('reports unsupported reflog actions', () => {
    expect(
      analyzeUndoFromReflog([
        { hash: 'bbb', subject: 'checkout: moving to side' },
        { hash: 'aaa', subject: 'commit: First' }
      ])
    ).toEqual({
      canUndo: false,
      reason: 'unsupported-action',
      subject: 'checkout: moving to side'
    })
  })

  it('reports nothing to undo when reflog is empty', () => {
    expect(analyzeUndoFromReflog([])).toEqual({
      canUndo: false,
      reason: 'nothing-to-undo'
    })
  })
})

describe('undoLastAction', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
    vi.restoreAllMocks()
  })

  async function createRepoWithTwoCommits(): Promise<string> {
    const cwd = mkdtempSync(join(tmpdir(), 'gitfreddo-undo-'))
    const run = (args: string[]) => runGitOrThrow(args, { cwd, gitBinaryPath: 'git' })

    await run(['init', '-b', 'main'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test'])
    writeFileSync(join(cwd, 'a.txt'), 'one\n')
    await run(['add', 'a.txt'])
    await run(['commit', '-m', 'first'])
    writeFileSync(join(cwd, 'b.txt'), 'two\n')
    await run(['add', 'b.txt'])
    await run(['commit', '-m', 'second'])
    return cwd
  }

  it('undoes the latest commit with a soft reset', async () => {
    tempDir = await createRepoWithTwoCommits()

    const result = await undoLastAction(tempDir, 'git')
    expect(result.subject).toMatch(/^commit:/)
    expect(result.mode).toBe('soft')

    const headSubject = (
      await runGitOrThrow(['log', '-1', '--format=%s'], { cwd: tempDir, gitBinaryPath: 'git' })
    ).trim()
    expect(headSubject).toBe('first')

    const staged = (
      await runGitOrThrow(['diff', '--cached', '--name-only'], { cwd: tempDir, gitBinaryPath: 'git' })
    ).trim()
    expect(staged).toBe('b.txt')
  })

  it('can undo the reset that undid a commit', async () => {
    tempDir = await createRepoWithTwoCommits()
    await undoLastAction(tempDir, 'git')

    const peek = await peekUndoAction(tempDir, 'git')
    expect(peek.canUndo).toBe(true)
    expect(peek.mode).toBe('mixed')

    await undoLastAction(tempDir, 'git')
    const headSubject = (
      await runGitOrThrow(['log', '-1', '--format=%s'], { cwd: tempDir, gitBinaryPath: 'git' })
    ).trim()
    expect(headSubject).toBe('second')
  })

  it('reports git-busy when a merge is in progress', async () => {
    tempDir = await createRepoWithTwoCommits()
    vi.spyOn(statusModule, 'workingStatus').mockResolvedValue({
      branch: 'main',
      ahead: 0,
      behind: 0,
      staged: [],
      unstaged: [],
      untracked: [],
      conflicted: [],
      isClean: true,
      mergeInProgress: true,
      rebaseInProgress: false,
      cherryPickInProgress: false
    })

    await expect(peekUndoAction(tempDir, 'git')).resolves.toEqual({
      canUndo: false,
      reason: 'git-busy'
    })
    await expect(undoLastAction(tempDir, 'git')).rejects.toThrow(/current git operation/)
  })
})
