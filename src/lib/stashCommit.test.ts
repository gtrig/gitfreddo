import { describe, expect, it } from 'vitest'
import { filterTimelineCommits, isInternalStashCommit, isStashCommit, isStashRef } from './stashCommit'
import type { GitCommit } from './types'

function makeCommit(hash: string, subject: string, refs: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents: [],
    subject,
    message: subject,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs
  }
}

describe('isStashRef', () => {
  it('matches common stash ref names', () => {
    expect(isStashRef('stash')).toBe(true)
    expect(isStashRef('refs/stash')).toBe(true)
    expect(isStashRef('stash@{0}')).toBe(true)
    expect(isStashRef('refs/stash@{1}')).toBe(true)
  })

  it('does not match branch refs', () => {
    expect(isStashRef('main')).toBe(false)
    expect(isStashRef('origin/main')).toBe(false)
  })
})

describe('isStashCommit', () => {
  it('detects commits decorated with stash refs', () => {
    expect(isStashCommit({ refs: ['stash', 'main'] })).toBe(true)
    expect(isStashCommit({ refs: ['refs/stash'] })).toBe(true)
    expect(isStashCommit({ refs: ['main'] })).toBe(false)
  })
})

describe('isInternalStashCommit', () => {
  it('matches git stash index and untracked commits', () => {
    expect(isInternalStashCommit({ subject: 'index on main: abc123 WIP' })).toBe(true)
    expect(isInternalStashCommit({ subject: 'untracked on main: abc123 WIP' })).toBe(true)
    expect(isInternalStashCommit({ subject: 'WIP on main: abc123 WIP' })).toBe(false)
  })
})

describe('filterTimelineCommits', () => {
  it('removes internal stash commits from the timeline', () => {
    const commits = [
      makeCommit('wip', 'WIP on main: base subject', ['stash']),
      makeCommit('index', 'index on main: base subject'),
      makeCommit('untracked', 'untracked on main: base subject'),
      makeCommit('base', 'Feat: base subject')
    ]

    expect(filterTimelineCommits(commits).map((commit) => commit.hash)).toEqual(['wip', 'base'])
  })
})
