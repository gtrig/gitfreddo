import { describe, expect, it } from 'vitest'
import { filterCommitsByMessage, commitSearchDimmedHashes, commitSearchRowDimClass } from './commitSearch'
import type { GitCommit } from './types'

function commit(subject: string, message = subject): GitCommit {
  return {
    hash: 'abc123',
    shortHash: 'abc123',
    parents: [],
    subject,
    message,
    author: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
    refs: []
  }
}

describe('filterCommitsByMessage', () => {
  const commits = [
    commit('Fix login bug', 'Fix login bug\n\nHandle expired sessions.'),
    commit('Add search feature'),
    commit('WIP refactor', 'WIP refactor\n\nStill in progress.')
  ]

  it('returns all commits when query is empty', () => {
    expect(filterCommitsByMessage(commits, '')).toEqual(commits)
    expect(filterCommitsByMessage(commits, '   ')).toEqual(commits)
  })

  it('matches subject text case-insensitively', () => {
    expect(filterCommitsByMessage(commits, 'SEARCH')).toEqual([commits[1]])
  })

  it('matches body text beyond the subject', () => {
    expect(filterCommitsByMessage(commits, 'expired sessions')).toEqual([commits[0]])
  })
})

describe('commitSearchDimmedHashes', () => {
  const commits = [
    commit('Fix login bug'),
    commit('Add search feature'),
    commit('WIP refactor')
  ]

  it('returns null when search is inactive', () => {
    expect(commitSearchDimmedHashes(commits, '')).toBeNull()
    expect(commitSearchDimmedHashes(commits, '   ')).toBeNull()
  })

  it('returns non-matching commit hashes', () => {
    expect(commitSearchDimmedHashes(commits, 'search')).toEqual(
      new Set([commits[0]!.hash, commits[2]!.hash])
    )
  })
})

describe('commitSearchRowDimClass', () => {
  const dimmed = new Set(['a', 'b'])

  it('fades dimmed rows and keeps matches at full opacity', () => {
    expect(commitSearchRowDimClass(dimmed, 'a', false, false)).toContain('opacity-35')
    expect(commitSearchRowDimClass(dimmed, 'c', false, false)).toContain('opacity-100')
    expect(commitSearchRowDimClass(dimmed, 'a', false, false)).toContain('transition-opacity')
  })

  it('keeps selected and primary rows at full opacity', () => {
    expect(commitSearchRowDimClass(dimmed, 'a', true, false)).toContain('opacity-100')
    expect(commitSearchRowDimClass(dimmed, 'a', false, true)).toContain('opacity-100')
  })
})
