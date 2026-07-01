import { describe, expect, it } from 'vitest'
import type { GitCommit, GitStashEntry } from './types'
import { resolveStashEntry, stashRefIndex } from './stashCommit'

function makeCommit(hash: string, refs: string[]): GitCommit {
  const author = { name: 'test', email: 'test@example.com', date: '2024-01-01T00:00:00Z' }
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents: [],
    subject: 'stash message',
    message: 'stash message',
    body: '',
    author,
    committer: author,
    signature: null,
    notes: '',
    stats: null,
    refs
  }
}

describe('stashRefIndex', () => {
  it('reads stash index from refs', () => {
    expect(stashRefIndex(makeCommit('abc', ['stash@{2}']))).toBe(2)
    expect(stashRefIndex(makeCommit('abc', ['refs/stash@{0}']))).toBe(0)
  })
})

describe('resolveStashEntry', () => {
  const stashes: GitStashEntry[] = [
    { index: 0, message: 'first', branch: 'main', hash: 'aaa1111' },
    { index: 1, message: 'second', branch: 'main', hash: 'bbb2222' }
  ]

  it('matches by commit hash', () => {
    expect(resolveStashEntry(makeCommit('bbb2222', ['stash@{1}']), stashes)?.index).toBe(1)
  })

  it('falls back to stash ref index when hash differs', () => {
    expect(resolveStashEntry(makeCommit('other', ['stash@{0}']), stashes)?.index).toBe(0)
  })
})
