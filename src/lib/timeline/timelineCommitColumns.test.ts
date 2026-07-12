import { describe, expect, it } from 'vitest'
import type { GitCommit } from '@/lib/types'
import {
  commitCellContent,
  commitCellTitle,
  extractCommitIssueLinks,
  formatCommitBodyPreview,
  formatCommitFilesChanged,
  formatCommitIssueLinks,
  formatCommitLineStats,
  formatCommitParents,
  formatCommitRefs,
  formatCommitSignature,
  formatCompactDate
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

  it('formats refs, body preview, and file stats', () => {
    expect(formatCommitRefs([])).toBe('—')
    expect(formatCommitRefs(['main', 'origin/main'])).toBe('main, origin/main')
    expect(formatCommitBodyPreview('  multi\n  line  ')).toBe('multi line')
    expect(formatCommitBodyPreview('')).toBe('—')
    expect(formatCommitFilesChanged(sampleCommit())).toBe('2')
    expect(formatCommitFilesChanged(sampleCommit({ stats: null }))).toBe('—')
  })

  it('formats compact dates and unknown signatures', () => {
    expect(formatCompactDate('not-a-date')).toBe('—')
    expect(formatCommitSignature('Z')).toBe('Z')
  })

  it('renders all commit column cells and signature variants', () => {
    const commit = sampleCommit()
    expect(commitCellContent('authorEmail', commit)).toBe('alice@test.com')
    expect(commitCellContent('authoredDate', commit)).not.toBe('—')
    expect(commitCellContent('parents', commit)).toBe('1')
    expect(commitCellContent('refs', commit)).toBe('HEAD -> main')
    expect(commitCellContent('bodyPreview', commit)).toBe('PROJ-99 follow-up')
    expect(commitCellContent('issueLinks', commit)).toBe('#42, PROJ-99')
    expect(commitCellContent('committer', commit)).toBe('Bob')
    expect(commitCellContent('committedDate', commit)).not.toBe('—')
    expect(commitCellContent('notes', commit)).toBe('Reviewed-by: Carol')
    expect(commitCellContent('filesChanged', commit)).toBe('2')
    expect(commitCellContent('lineStats', commit)).toBe('+5/-1')
    expect(commitCellContent('unknown', commit)).toBe('—')
    expect(formatCommitSignature('B')).toBe('Bad sig')
    expect(formatCommitSignature('U')).toBe('Unknown')
    expect(formatCommitLineStats(sampleCommit({ stats: { filesChanged: 1, insertions: 0, deletions: 0 } }))).toBe('0/0')
    expect(commitCellTitle('authorEmail', commit)).toBe('alice@test.com')
    expect(commitCellTitle('committer', commit)).toBe('bob@test.com')
  })
})
