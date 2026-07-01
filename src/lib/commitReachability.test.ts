import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  isAheadOfHead,
  isAncestorOf,
  isBehindHead,
  isOnCurrentBranchHistory
} from './commitReachability'

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
