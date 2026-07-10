import { describe, expect, it } from 'vitest'
import { groupThreadsByTarget, rootReviewCommentId, threadsForPath } from './prThreads'
import type { GitHubPullRequestReviewThread } from '@shared/github'

const threads: GitHubPullRequestReviewThread[] = [
  {
    id: 'PRRT_1',
    isResolved: false,
    isOutdated: false,
    path: 'src/a.ts',
    line: 12,
    comments: [
      {
        id: 10,
        body: 'First',
        user: 'alice',
        createdAt: '2026-01-02T10:00:00Z',
        path: 'src/a.ts',
        line: 12
      }
    ]
  },
  {
    id: 'PRRT_2',
    isResolved: true,
    isOutdated: false,
    path: 'src/b.ts',
    line: 3,
    comments: [
      {
        id: 20,
        body: 'Other file',
        user: 'bob',
        createdAt: '2026-01-02T11:00:00Z',
        path: 'src/b.ts',
        line: 3
      }
    ]
  }
]

describe('prThreads', () => {
  it('filters threads by file path', () => {
    expect(threadsForPath(threads, 'src/a.ts')).toHaveLength(1)
    expect(threadsForPath(threads, 'src/a.ts')[0]?.id).toBe('PRRT_1')
  })

  it('groups threads by diff line target', () => {
    const grouped = groupThreadsByTarget(threadsForPath(threads, 'src/a.ts'))
    expect(grouped.get('RIGHT:12')).toHaveLength(1)
  })

  it('returns the root comment id for replies', () => {
    expect(rootReviewCommentId(threads[0]!)).toBe(10)
  })
})
