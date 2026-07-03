import { describe, expect, it } from 'vitest'
import { classifyRef, formatRefLabel, parseFsckUnreachable, toStaleBranchSummary } from './maintenance'

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
