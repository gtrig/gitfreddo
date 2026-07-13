import { describe, expect, it } from 'vitest'
import {
  mapPullRequestFilesToCommitItems,
  prFileStatusToKind,
  pullRequestStatusClassName,
  pullRequestStatusMeta,
  sumPullRequestFileStats
} from './prFiles'

describe('prFiles', () => {
  it('maps pull request file statuses to commit file kinds', () => {
    expect(prFileStatusToKind('added')).toBe('added')
    expect(prFileStatusToKind('copied')).toBe('added')
    expect(prFileStatusToKind('removed')).toBe('removed')
    expect(prFileStatusToKind('modified')).toBe('changed')
    expect(prFileStatusToKind('renamed')).toBe('changed')
    expect(prFileStatusToKind('unchanged')).toBe('unchanged')
  })

  it('maps pull request files to commit file items', () => {
    expect(
      mapPullRequestFilesToCommitItems([
        { path: 'a.ts', status: 'added', additions: 1, deletions: 0, changes: 1 }
      ])
    ).toEqual([{ path: 'a.ts', kind: 'added' }])
  })

  it('sums file stats', () => {
    expect(
      sumPullRequestFileStats([
        { path: 'a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
        { path: 'b.ts', status: 'added', additions: 4, deletions: 0, changes: 4 }
      ])
    ).toEqual({ fileCount: 2, additions: 6, deletions: 1, changes: 7 })
  })

  it('derives pull request status metadata', () => {
    expect(pullRequestStatusMeta({ state: 'closed', draft: false, mergeable: null }).tone).toBe(
      'danger'
    )
    expect(pullRequestStatusMeta({ state: 'open', draft: true, mergeable: null }).labelKey).toBe(
      'detail.pullRequest.statusDraft'
    )
    expect(pullRequestStatusMeta({ state: 'open', draft: false, mergeable: true }).tone).toBe(
      'success'
    )
    expect(pullRequestStatusMeta({ state: 'open', draft: false, mergeable: false }).tone).toBe(
      'warning'
    )
    expect(pullRequestStatusMeta({ state: 'open', draft: false, mergeable: null }).labelKey).toBe(
      'detail.pullRequest.statusChecking'
    )
  })

  it('maps status tones to badge classes', () => {
    expect(pullRequestStatusClassName('success')).toContain('emerald')
    expect(pullRequestStatusClassName('warning')).toContain('amber')
    expect(pullRequestStatusClassName('danger')).toContain('rose')
    expect(pullRequestStatusClassName('neutral')).toContain('gf-fg-muted')
  })
})
