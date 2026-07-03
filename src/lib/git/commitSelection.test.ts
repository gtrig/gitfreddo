import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  allSelectedOnBranchHistory,
  anySelectedOnBranchHistory,
  areContiguousCommits,
  areContiguousOnBranchHeadLine,
  commitRangeInTimeline,
  commitRowHighlightClass,
  firstParentChainFromHead,
  selectedCommitsChronological,
  selectedCommitsInTimeline,
  selectionHasMergeCommit,
  toggleHashInList
} from '@/lib/git/commitSelection'

function makeCommit(hash: string, parents: string[] = []): GitCommit {
  const author = { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' }
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    body: '',
    author,
    committer: author,
    signature: null,
    notes: '',
    stats: null,
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

  it('detects contiguous selections on the first-parent line from HEAD', () => {
    const c1 = makeCommit('c1', [])
    const c2 = makeCommit('c2', ['c1'])
    const c3 = makeCommit('c3', ['c2'])
    const feature = makeCommit('feature', ['c1'])
    const chain = [c3, c2, feature, c1]

    expect(firstParentChainFromHead('c3', chain).map((commit) => commit.hash)).toEqual([
      'c3',
      'c2',
      'c1'
    ])
    expect(areContiguousOnBranchHeadLine([c2, c3], 'c3', chain)).toBe(true)
    expect(areContiguousOnBranchHeadLine([c1, c3], 'c3', chain)).toBe(false)
    expect(areContiguousOnBranchHeadLine([feature], 'c3', chain)).toBe(false)
  })

  it('detects merge commits and branch-history membership', () => {
    const c1 = makeCommit('c1', [])
    const c2 = makeCommit('c2', ['c1'])
    const c3 = makeCommit('c3', ['c2'])
    const feature = makeCommit('feature', ['c1'])
    const chain = [c3, c2, feature, c1]
    const merge = makeCommit('merge', ['c2', 'feature'])

    expect(selectionHasMergeCommit([merge])).toBe(true)
    expect(allSelectedOnBranchHistory([c2], 'c3', chain)).toBe(true)
    expect(anySelectedOnBranchHistory([feature], 'c3', chain)).toBe(false)
  })

  it('orders selected commits in timeline order', () => {
    expect(selectedCommitsInTimeline(commits, ['c3', 'c1']).map((c) => c.hash)).toEqual([
      'c1',
      'c3'
    ])
  })

  it('highlights selected and primary rows', () => {
    expect(commitRowHighlightClass(true, false)).toContain('bg-gf-accent/10')
    expect(commitRowHighlightClass(true, true)).toContain('bg-gf-accent/20')
    expect(commitRowHighlightClass(false, false)).toBe('')
  })
})
