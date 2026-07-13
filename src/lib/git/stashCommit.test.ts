import { describe, expect, it } from 'vitest'
import type { GitCommit, GitStashEntry } from '@/lib/types'
import {
  filterTimelineCommits,
  isInternalStashCommit,
  isStashCommit,
  isStashRef,
  resolveStashAnchorHash,
  resolveStashEntry,
  stashBaseParentHash,
  stashMessageSubject,
  stashRefIndex
} from '@/lib/git/stashCommit'

function makeCommit(hash: string, refs: string[] = [], overrides: Partial<GitCommit> = {}): GitCommit {
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
    refs,
    ...overrides
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

describe('stash ref helpers', () => {
  it('detects stash refs and commits', () => {
    expect(isStashRef('stash@{1}')).toBe(true)
    expect(isStashRef('refs/stash')).toBe(true)
    expect(isStashRef('main')).toBe(false)
    expect(isStashCommit(makeCommit('x', ['stash@{0}']))).toBe(true)
  })

  it('filters internal stash commits from the timeline', () => {
    const commits = [
      makeCommit('a', []),
      makeCommit('b', ['stash'], { subject: 'index on main: abc WIP' })
    ]
    expect(isInternalStashCommit(commits[1]!)).toBe(true)
    expect(filterTimelineCommits(commits)).toHaveLength(1)
  })

  it('parses stash message subjects and parent hashes', () => {
    expect(stashMessageSubject('WIP on main: abc1234 save login work')).toBe('save login work')
    expect(stashBaseParentHash({ parents: ['parent-hash'] })).toBe('parent-hash')
  })

  it('resolves stash anchor hash from parent or subject', () => {
    const parent = makeCommit('parent1234567890', [])
    const stash = makeCommit('stash1', [], {
      parents: ['parent1234567890'],
      subject: 'WIP on main: parent1 save work'
    })
    const commits = [stash, parent]
    expect(resolveStashAnchorHash(stash, commits, 'parent1234567890')).toBe('parent1234567890')
  })

  it('returns null when stash lists are empty or unmatched', () => {
    expect(resolveStashEntry(makeCommit('x', ['stash@{0}']), undefined)).toBeNull()
    expect(resolveStashEntry(makeCommit('x', ['main']), [{ index: 0, message: 'a', branch: 'main', hash: 'y' }])).toBeNull()
    expect(stashRefIndex(makeCommit('x', ['main']))).toBeNull()
    expect(stashBaseParentHash({ parents: [] })).toBeNull()
  })

  it('resolves stash anchors from subject and parent prefix fallbacks', () => {
    const target = makeCommit('abcdef1234567890', [], { subject: 'save work' })
    const stash = makeCommit('stash1', [], {
      parents: ['missingparent'],
      subject: 'WIP on main: abcdef1 save work'
    })
    expect(resolveStashAnchorHash(stash, [stash, target], 'abcdef1234567890')).toBe(
      'abcdef1234567890'
    )

    const parent = makeCommit('fullhash1234567890', [])
    const prefixStash = makeCommit('stash2', [], {
      parents: ['fullhash'],
      subject: 'WIP on main: ignored'
    })
    expect(resolveStashAnchorHash(prefixStash, [prefixStash, parent], null)).toBe(
      'fullhash1234567890'
    )
  })
})
