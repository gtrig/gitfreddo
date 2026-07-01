import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  areContiguousCommits,
  commitRangeInTimeline,
  selectedCommitsChronological,
  toggleHashInList
} from './commitSelection'

function makeCommit(hash: string, parents: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs: []
  }
}

describe('commitSelection', () => {
  const commits = [makeCommit('c1'), makeCommit('c2'), makeCommit('c3'), makeCommit('c4')]

  it('selects an inclusive timeline range regardless of click order', () => {
    expect(commitRangeInTimeline(commits, 'c1', 'c3')).toEqual(['c1', 'c2', 'c3'])
    expect(commitRangeInTimeline(commits, 'c3', 'c1')).toEqual(['c1', 'c2', 'c3'])
  })

  it('toggles hashes in a selection list', () => {
    expect(toggleHashInList(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleHashInList(['a', 'b'], 'b')).toEqual(['a'])
  })

  it('orders selected commits chronologically', () => {
    const chain = [makeCommit('c3', ['c2']), makeCommit('c2', ['c1']), makeCommit('c1', [])]
    expect(selectedCommitsChronological(chain, ['c3', 'c1']).map((item) => item.hash)).toEqual([
      'c1',
      'c3'
    ])
  })

  it('detects contiguous commit chains', () => {
    const c1 = makeCommit('c1', [])
    const c2 = makeCommit('c2', ['c1'])
    const c3 = makeCommit('c3', ['c2'])
    expect(c2.parents.includes(c1.hash)).toBe(true)
    expect(areContiguousCommits([c1, c2, c3])).toBe(true)
    expect(areContiguousCommits([c1, c3])).toBe(false)
  })
})
