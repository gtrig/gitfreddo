import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  classifyRef,
  findRefsForCommits,
  formatRefLabel,
  listStaleLocalBranches,
  listUnreachableCommits,
  normalizeStaleBranchHashes,
  normalizeStaleRefsFromParams,
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

describe('normalizeStaleBranchHashes', () => {
  it('prefers hashes array and falls back to single hash', () => {
    expect(normalizeStaleBranchHashes({ hashes: ['a', 'b'] })).toEqual(['a', 'b'])
    expect(normalizeStaleBranchHashes({ hash: 'abc' })).toEqual(['abc'])
    expect(normalizeStaleBranchHashes({})).toEqual([])
  })
})

describe('normalizeStaleRefsFromParams', () => {
  it('prefers refs and prefixes branch names', () => {
    expect(normalizeStaleRefsFromParams({ refs: ['refs/heads/main'] })).toEqual([
      'refs/heads/main'
    ])
    expect(normalizeStaleRefsFromParams({ branchNames: ['feature', 'refs/tags/v1'] })).toEqual([
      'refs/heads/feature',
      'refs/tags/v1'
    ])
  })
})

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

  it('labels unknown refs as other', () => {
    expect(formatRefLabel('refs/notes/commits')).toBe('notes/commits')
    expect(classifyRef('refs/notes/commits')).toBe('other')
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

  it('throws when fsck fails without stdout', async () => {
    vi.mocked(runCommand).mockResolvedValue({ code: 1, stdout: '', stderr: 'fsck exploded' })

    await expect(listUnreachableCommits(cwd, gitBinaryPath)).rejects.toThrow(/fsck exploded/i)
  })

  it('uses fallback details when commit metadata cannot be read', async () => {
    vi.mocked(runCommand).mockResolvedValue({
      code: 0,
      stdout: `unreachable commit ${hash}`,
      stderr: ''
    })
    vi.mocked(runGitOrThrow).mockRejectedValue(new Error('show failed'))

    await expect(listUnreachableCommits(cwd, gitBinaryPath)).resolves.toEqual({
      commits: [
        {
          hash,
          shortHash: hash.slice(0, 7),
          subject: '(unreadable commit)',
          authorDate: ''
        }
      ],
      totalCommitCount: 1,
      blobCount: 0,
      treeCount: 0
    })
  })

  it('matches refs through ancestor checks', async () => {
    vi.mocked(runGitOrThrow)
      .mockResolvedValueOnce(hash)
      .mockResolvedValueOnce(`refs/heads/stale commit ${hash}\nrefs/tags/v1.0.0 tag ${hash}\n`)
    vi.mocked(runCommand).mockImplementation(async (_cmd, params) => {
      if (params && typeof params === 'object' && 'descendant' in params) {
        const descendant = (params as { descendant: string }).descendant
        if (descendant === hash) return { code: 0, stdout: '', stderr: '' }
      }
      return { code: 1, stdout: '', stderr: '' }
    })

    await expect(findRefsForCommits(cwd, gitBinaryPath, [hash.slice(0, 7)])).resolves.toEqual([
      'refs/heads/stale'
    ])
  })

  it('deletes non-branch refs and wraps removeStaleBranches', async () => {
    const { removeStaleBranches } = await import('./maintenance')
    vi.mocked(runGitOrThrow)
      .mockResolvedValueOnce('refs/heads/main')
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce('1')
      .mockResolvedValue('')
    vi.mocked(runCommand).mockResolvedValue({ code: 0, stdout: '', stderr: '' })

    const result = await removeStaleBranches(cwd, gitBinaryPath, ['refs/tags/v-old'])
    expect(result.deletedRefs).toEqual(['refs/tags/v-old'])
    expect(runGitOrThrow).toHaveBeenCalled()
  })
})
