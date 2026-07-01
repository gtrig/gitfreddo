import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import { commitRangeInTimeline, toggleHashInList } from './commitSelection'

function commit(hash: string): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents: [],
    message: hash,
    subject: hash,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs: []
  }
}

describe('commitSelection', () => {
  const commits = [commit('c1'), commit('c2'), commit('c3'), commit('c4')]

  it('selects an inclusive timeline range regardless of click order', () => {
    expect(commitRangeInTimeline(commits, 'c1', 'c3')).toEqual(['c1', 'c2', 'c3'])
    expect(commitRangeInTimeline(commits, 'c3', 'c1')).toEqual(['c1', 'c2', 'c3'])
  })

  it('toggles hashes in a selection list', () => {
    expect(toggleHashInList(['a', 'b'], 'c')).toEqual(['a', 'b', 'c'])
    expect(toggleHashInList(['a', 'b'], 'b')).toEqual(['a'])
  })
})
