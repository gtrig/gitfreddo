import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  collectAncestors,
  collectFirstParentAncestors,
  isAheadOfHead,
  isAncestorOf,
  isBehindHead,
  isOnCurrentBranchHistory
} from '@/lib/git/commitReachability'

function commit(hash: string, parents: string[]): GitCommit {
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

describe('commitReachability', () => {
  const commits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])]

  it('detects ancestry along parent links', () => {
    expect(isAncestorOf('c1', 'c3', commits)).toBe(true)
    expect(isAncestorOf('c2', 'c3', commits)).toBe(true)
    expect(isAncestorOf('c3', 'c1', commits)).toBe(false)
  })

  it('classifies position relative to HEAD', () => {
    expect(isOnCurrentBranchHistory('c2', 'c3', commits)).toBe(true)
    expect(isBehindHead('c2', 'c3', commits)).toBe(true)
    expect(isAheadOfHead('c3', 'c2', commits)).toBe(true)
    expect(isBehindHead('c3', 'c3', commits)).toBe(false)
  })
})

describe('collectAncestors', () => {
  it('includes the start commit and all reachable ancestors', () => {
    const commits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])]
    expect(collectAncestors('c3', commits)).toEqual(new Set(['c3', 'c2', 'c1']))
    expect(collectAncestors('c2', commits)).toEqual(new Set(['c2', 'c1']))
    expect(collectAncestors('c1', commits)).toEqual(new Set(['c1']))
  })

  it('follows every parent of merge commits', () => {
    const commits = [
      commit('merge', ['main', 'feature']),
      commit('feature', ['base']),
      commit('main', ['base']),
      commit('base', [])
    ]
    expect(collectAncestors('merge', commits)).toEqual(
      new Set(['merge', 'main', 'feature', 'base'])
    )
  })

  it('returns an empty set for an unknown or empty start', () => {
    const commits = [commit('c1', [])]
    expect(collectAncestors('missing', commits)).toEqual(new Set(['missing']))
    expect(collectAncestors('', commits)).toEqual(new Set<string>())
  })

  it('tolerates cycles without looping forever', () => {
    const commits = [commit('a', ['b']), commit('b', ['a'])]
    expect(collectAncestors('a', commits)).toEqual(new Set(['a', 'b']))
  })
})

describe('collectFirstParentAncestors', () => {
  it('follows only the first parent, excluding merged-in branches', () => {
    // main:    m2 -> merge -> m1 -> base
    // feature: feat1 -> base   (merged into main at `merge`)
    const commits = [
      commit('m2', ['merge']),
      commit('merge', ['m1', 'feat1']),
      commit('feat1', ['base']),
      commit('m1', ['base']),
      commit('base', [])
    ]
    expect(collectFirstParentAncestors('m2', commits)).toEqual(
      new Set(['m2', 'merge', 'm1', 'base'])
    )
    // feat1 belongs to a merged branch and must be excluded.
    expect(collectFirstParentAncestors('m2', commits).has('feat1')).toBe(false)
  })

  it('includes the start commit and returns empty for a falsy start', () => {
    const commits = [commit('c2', ['c1']), commit('c1', [])]
    expect(collectFirstParentAncestors('c2', commits)).toEqual(new Set(['c2', 'c1']))
    expect(collectFirstParentAncestors('', commits)).toEqual(new Set<string>())
  })

  it('tolerates cycles without looping forever', () => {
    const commits = [commit('a', ['b']), commit('b', ['a'])]
    expect(collectFirstParentAncestors('a', commits)).toEqual(new Set(['a', 'b']))
  })
})
