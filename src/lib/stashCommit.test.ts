import { describe, expect, it } from 'vitest'
import {
  filterTimelineCommits,
  isInternalStashCommit,
  isStashCommit,
  isStashRef,
  resolveStashAnchorHash,
  stashBaseParentHash,
  stashMessageSubject
} from './stashCommit'
import type { GitCommit } from './types'

function makeCommit(hash: string, subject: string, refs: string[] = [], parents: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    subject,
    message: subject,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs
  }
}

describe('isStashRef', () => {
  it('recognizes stash refs', () => {
    expect(isStashRef('stash')).toBe(true)
    expect(isStashRef('refs/stash@{0}')).toBe(true)
    expect(isStashRef('main')).toBe(false)
  })
})

describe('isStashCommit', () => {
  it('detects stash commits by ref', () => {
    expect(isStashCommit(makeCommit('abc', 'WIP', ['stash']))).toBe(true)
    expect(isStashCommit(makeCommit('abc', 'feat', ['main']))).toBe(false)
  })
})

describe('isInternalStashCommit', () => {
  it('hides index and untracked stash commits', () => {
    expect(isInternalStashCommit(makeCommit('abc', 'index on main: deadbeef subject'))).toBe(true)
    expect(isInternalStashCommit(makeCommit('abc', 'WIP on main: deadbeef subject'))).toBe(false)
  })
})

describe('stashBaseParentHash', () => {
  it('returns the first parent of the stash commit', () => {
    expect(stashBaseParentHash({ parents: ['base', 'index'] })).toBe('base')
    expect(stashBaseParentHash({ parents: [] })).toBeNull()
  })
})

describe('stashMessageSubject', () => {
  it('extracts the subject after the embedded short hash', () => {
    expect(
      stashMessageSubject('WIP on main: ec7f967 Feat: Add context menu actions for branches and folders')
    ).toBe('Feat: Add context menu actions for branches and folders')
  })
})

describe('resolveStashAnchorHash', () => {
  it('prefers the parent hash when it is still in the timeline', () => {
    const stash = makeCommit(
      'stash',
      'WIP on main: ec7f967 Feat: Add context menu actions for branches and folders',
      ['stash'],
      ['ec7f967dafdfab360adbfce46dc9a5a57b29577b']
    )
    const commits = [
      makeCommit('ec7f967dafdfab360adbfce46dc9a5a57b29577b', 'Feat: Add context menu actions for branches and folders')
    ]

    expect(resolveStashAnchorHash(stash, commits)).toBe('ec7f967dafdfab360adbfce46dc9a5a57b29577b')
    expect(
      resolveStashAnchorHash(stash, commits, 'ec7f967dafdfab360adbfce46dc9a5a57b29577b')
    ).toBe('ec7f967dafdfab360adbfce46dc9a5a57b29577b')
  })

  it('falls back to the message short hash after the base commit was rewritten', () => {
    const newBase = 'ec7f967aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    const stash = makeCommit(
      'stash',
      'WIP on main: ec7f967 Feat: Add context menu actions for branches and folders',
      ['stash'],
      ['old-ec7f967-deadbeef0000000000000000000000000000']
    )
    const commits = [
      makeCommit(newBase, 'Feat: Add context menu actions for branches and folders')
    ]

    expect(resolveStashAnchorHash(stash, commits)).toBe(newBase)
  })

  it('prefers the rewritten commit on HEAD when the stale parent is still reachable', () => {
    const stash = makeCommit(
      'stash',
      'WIP on main: deadbeef Reworded base subject',
      ['stash'],
      ['old-base']
    )
    const commits = [
      makeCommit('head', 'head', [], ['new-base']),
      makeCommit('new-base', 'Reworded base subject'),
      makeCommit('old-base', 'Reworded base subject')
    ]

    expect(resolveStashAnchorHash(stash, commits, 'head')).toBe('new-base')
  })
})

describe('filterTimelineCommits', () => {
  it('removes internal stash commits from the timeline', () => {
    const commits = [
      makeCommit('wip', 'WIP on main: abc1234 subject', ['stash']),
      makeCommit('index', 'index on main: abc1234 subject', ['stash'])
    ]

    expect(filterTimelineCommits(commits).map((commit) => commit.hash)).toEqual(['wip'])
  })
})
