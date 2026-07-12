import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyRef,
  findRefsForCommits,
  formatRefLabel,
  listStaleLocalBranches,
  listUnreachableCommits,
  parseFsckUnreachable,
  pruneStaleObjects,
  removeStaleRefs,
  toStaleBranchSummary
} from './maintenance'

vi.mock('../git-runner', () => ({
  runCommand: vi.fn(),
  runGitOrThrow: vi.fn()
}))

vi.mock('./branch', () => ({
  branchDelete: vi.fn(async () => undefined)
}))

import { runCommand, runGitOrThrow } from '../git-runner'

describe('parseFsckUnreachable', () => {
  it('parses unreachable commits, blobs, and trees', () => {
    const hash1 = 'a'.repeat(40)
    const hash2 = 'b'.repeat(40)
    const stdout = [
      `unreachable commit ${hash1}`,
      'unreachable blob 1111111111111111111111111111111111111111',
      'unreachable tree 2222222222222222222222222222222222222222',
      `unreachable commit ${hash2}`
    ].join('\n')

    expect(parseFsckUnreachable(stdout)).toEqual({
      commitHashes: [hash1, hash2],
      blobCount: 1,
      treeCount: 1
    })
  })

  it('returns empty counts for blank output', () => {
    expect(parseFsckUnreachable('')).toEqual({
      commitHashes: [],
      blobCount: 0,
      treeCount: 0
    })
  })
})

describe('formatRefLabel', () => {
  it('labels backup refs from rebases', () => {
    expect(formatRefLabel('refs/original/refs/heads/main')).toBe('refs/heads/main (backup)')
    expect(classifyRef('refs/original/refs/heads/main')).toBe('backup')
  })

  it('labels local branches without suffix', () => {
    expect(formatRefLabel('refs/heads/feature/foo')).toBe('feature/foo')
    expect(classifyRef('refs/heads/feature/foo')).toBe('branch')
  })

  it('labels remote and tag refs', () => {
    expect(formatRefLabel('refs/remotes/origin/main')).toBe('origin/main (remote)')
    expect(formatRefLabel('refs/tags/v1.0.0')).toBe('v1.0.0 (tag)')
    expect(classifyRef('refs/remotes/origin/main')).toBe('remote')
    expect(classifyRef('refs/tags/v1.0.0')).toBe('tag')
  })
})

describe('toStaleBranchSummary', () => {
  it('builds legacy-compatible summary fields', () => {
    const ref = {
      ref: 'refs/heads/old',
      label: 'old',
      kind: 'branch' as const,
      head: 'abc',
      shortHash: 'abc',
      subject: 'old work',
      commitsNotOnHead: 2
    }
    const summary = toStaleBranchSummary([ref], ['refs/heads/old'], 2)
    expect(summary.totalCommitsNotOnHead).toBe(2)
    expect(summary.branches[0]?.name).toBe('old')
    expect(summary.matchingBranches).toEqual(['refs/heads/old'])
  })
})

describe('maintenance git operations', () => {
  const cwd = '/repo'
  const gitBinaryPath = 'git'
  const hash = 'a'.repeat(40)

  beforeEach(() => {
    vi.mocked(runCommand).mockReset()
    vi.mocked(runGitOrThrow).mockReset()
  })

  it('lists unreachable commits with preview details', async () => {
    vi.mocked(runCommand).mockResolvedValue({
      code: 0,
      stdout: `unreachable commit ${hash}\nunreachable blob ${'b'.repeat(40)}`,
      stderr: ''
    })
    vi.mocked(runGitOrThrow).mockResolvedValue(
      `${hash}\n${hash.slice(0, 7)}\nDangling commit\n2026-01-01T00:00:00Z`
    )

    await expect(listUnreachableCommits(cwd, gitBinaryPath)).resolves.toEqual({
      commits: [
        {
          hash,
          shortHash: hash.slice(0, 7),
          subject: 'Dangling commit',
          authorDate: '2026-01-01T00:00:00Z'
        }
      ],
      totalCommitCount: 1,
      blobCount: 1,
      treeCount: 0
    })
  })

  it('reports removed commit count after prune', async () => {
    vi.mocked(runCommand)
      .mockResolvedValueOnce({
        code: 0,
        stdout: `unreachable commit ${hash}`,
        stderr: ''
      })
      .mockResolvedValueOnce({
        code: 0,
        stdout: '',
        stderr: ''
      })
    vi.mocked(runGitOrThrow).mockResolvedValue('')

    await expect(pruneStaleObjects(cwd, gitBinaryPath)).resolves.toEqual({
      removedCommitCount: 1
    })
    expect(runGitOrThrow).toHaveBeenCalled()
  })

  it('finds refs whose tips match unreachable commit hashes', async () => {
    vi.mocked(runGitOrThrow)
      .mockResolvedValueOnce(hash)
      .mockResolvedValueOnce(`refs/heads/stale commit ${hash}\n`)
    vi.mocked(runCommand).mockResolvedValue({ code: 0, stdout: '', stderr: '' })

    await expect(findRefsForCommits(cwd, gitBinaryPath, [hash])).resolves.toEqual([
      'refs/heads/stale'
    ])
  })

  it('returns empty ref matches for an empty hash list', async () => {
    await expect(findRefsForCommits(cwd, gitBinaryPath, [])).resolves.toEqual([])
    expect(runGitOrThrow).not.toHaveBeenCalled()
  })

  it('lists stale local branches with matching refs', async () => {
    vi.mocked(runGitOrThrow)
      .mockResolvedValueOnce(`refs/heads/stale commit ${hash}\n`)
      .mockResolvedValueOnce(`${hash}\n${hash.slice(0, 7)}\nStale work\n2026-01-01T00:00:00Z`)
      .mockResolvedValueOnce('3')
    vi.mocked(runCommand).mockResolvedValueOnce({ code: 0, stdout: '2\n', stderr: '' })

    const summary = await listStaleLocalBranches(cwd, gitBinaryPath)

    expect(summary.refs).toEqual([
      expect.objectContaining({
        ref: 'refs/heads/stale',
        label: 'stale',
        commitsNotOnHead: 2
      })
    ])
    expect(summary.totalCommitsNotOnHead).toBe(3)
  })

  it('refuses to delete the currently checked-out branch', async () => {
    vi.mocked(runGitOrThrow).mockResolvedValueOnce('refs/heads/main')

    await expect(
      removeStaleRefs(cwd, gitBinaryPath, ['refs/heads/main'])
    ).rejects.toThrow(/currently checked-out/i)
  })

  it('requires at least one ref to remove', async () => {
    await expect(removeStaleRefs(cwd, gitBinaryPath, [])).rejects.toThrow(/at least one reference/i)
  })
})
