import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  extractCommitIssueLinks,
  formatCommitIssueLinks,
  formatCommitLineStats,
  formatCommitParents,
  formatCommitSignature
} from '@/lib/timeline/timelineCommitColumns'

function sampleCommit(overrides: Partial<GitCommit> = {}): GitCommit {
  return {
    hash: 'abc1234567890',
    shortHash: 'abc1234',
    parents: ['def4567'],
    subject: 'Fix bug #42',
    message: 'Fix bug #42\n\nPROJ-99 follow-up',
    body: 'PROJ-99 follow-up',
    author: { name: 'Alice', email: 'alice@test.com', date: '2024-01-01T00:00:00+00:00' },
    committer: { name: 'Bob', email: 'bob@test.com', date: '2024-01-02T00:00:00+00:00' },
    signature: 'G',
    notes: 'Reviewed-by: Carol',
    stats: { filesChanged: 2, insertions: 5, deletions: 1 },
    refs: ['HEAD -> main'],
    ...overrides
  }
}

describe('timelineCommitColumns', () => {
  it('formats parent counts', () => {
    expect(formatCommitParents(0)).toBe('root')
    expect(formatCommitParents(1)).toBe('1')
    expect(formatCommitParents(2)).toBe('2 (merge)')
  })

  it('formats signature labels', () => {
    expect(formatCommitSignature('G')).toBe('Verified')
    expect(formatCommitSignature(null)).toBe('—')
  })

  it('formats line stats', () => {
    expect(formatCommitLineStats(sampleCommit())).toBe('+5/-1')
    expect(formatCommitLineStats(sampleCommit({ stats: null }))).toBe('—')
  })

  it('extracts issue and ticket links from subject and body', () => {
    const links = extractCommitIssueLinks(sampleCommit())
    expect(links).toEqual(['#42', 'PROJ-99'])
    expect(formatCommitIssueLinks(sampleCommit())).toBe('#42, PROJ-99')
  })
})
