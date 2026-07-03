import { describe, expect, it } from 'vitest'
import { commitMatchesSearch, filterCommitsByMessage, commitSearchDimmedHashes, commitSearchRowDimClass } from '@/lib/git/commitSearch'
import type { GitCommit } from '@/lib/types'

function commit(subject: string, message = subject, overrides: Partial<GitCommit> = {}): GitCommit {
  const author = { name: 'Test', email: 'test@example.com', date: '2024-01-01' }
  return {
    hash: 'abc123def456',
    shortHash: 'abc123',
    parents: [],
    subject,
    message,
    body: '',
    author,
    committer: author,
    signature: null,
    notes: '',
    stats: null,
    refs: [],
    ...overrides
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

describe('commitMatchesSearch', () => {
  const commits = [
    commit('Fix login', 'Fix login', {
      hash: 'aaa111',
      author: { name: 'Alice', email: 'alice@example.com', date: '2024-06-15T10:00:00Z' }
    }),
    commit('Other', 'Other', {
      hash: 'bbb222',
      author: { name: 'Bob', email: 'bob@example.com', date: '2024-01-01T00:00:00Z' }
    })
  ]

  it('filters by author, hash prefix, and date range', () => {
    expect(commitMatchesSearch(commits[0]!, { query: '', author: 'alice' })).toBe(true)
    expect(commitMatchesSearch(commits[1]!, { query: '', author: 'alice' })).toBe(false)
    expect(commitMatchesSearch(commits[0]!, { query: '', hashPrefix: 'aaa' })).toBe(true)
    expect(
      commitMatchesSearch(commits[0]!, {
        query: '',
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30'
      })
    ).toBe(true)
    expect(
      commitMatchesSearch(commits[1]!, {
        query: '',
        dateFrom: '2024-06-01',
        dateTo: '2024-06-30'
      })
    ).toBe(false)
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
