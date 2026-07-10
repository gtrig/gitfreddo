import { describe, expect, it } from 'vitest'
import { groupLineCommentsByTarget, lineCommentsForPath, mergePullRequestTimeline, normalizeReviewCommentAnchor } from './prTimeline'

describe('prTimeline', () => {
  it('normalizes review comment anchors from original_line and default side', () => {
    expect(
      normalizeReviewCommentAnchor({ line: null, originalLine: 9, side: null })
    ).toEqual({ line: 9, side: 'RIGHT' })
  })

  it('merges conversation, line, and review items chronologically', () => {
    const items = mergePullRequestTimeline(
      [
        {
          id: 1,
          body: 'Looks good overall',
          user: 'alice',
          createdAt: '2026-01-02T10:00:00Z',
          updatedAt: '2026-01-02T10:00:00Z'
        }
      ],
      [
        {
          id: 2,
          body: 'Rename this',
          user: 'bob',
          createdAt: '2026-01-02T11:00:00Z',
          updatedAt: '2026-01-02T11:00:00Z',
          path: 'src/a.ts',
          line: 12,
          originalLine: 12,
          side: 'RIGHT',
          commitId: 'abc'
        }
      ],
      [
        {
          id: 3,
          body: '',
          user: 'carol',
          submittedAt: '2026-01-02T12:00:00Z',
          state: 'APPROVED'
        }
      ]
    )

    expect(items.map((item) => item.kind)).toEqual(['conversation', 'review'])
  })

  it('filters line comments for a file path', () => {
    const items: ReturnType<typeof mergePullRequestTimeline> = [
      {
        id: 'line-1',
        kind: 'line',
        body: 'A',
        user: 'bob',
        createdAt: '2026-01-02T11:00:00Z',
        path: 'src/a.ts',
        line: 1,
        side: 'RIGHT'
      },
      {
        id: 'line-2',
        kind: 'line',
        body: 'B',
        user: 'bob',
        createdAt: '2026-01-02T12:00:00Z',
        path: 'src/b.ts',
        line: 2,
        side: 'RIGHT'
      }
    ]

    expect(lineCommentsForPath(items, 'src/a.ts')).toHaveLength(1)
  })

  it('groups line comments by diff target', () => {
    const items: ReturnType<typeof mergePullRequestTimeline> = [
      {
        id: 'line-1',
        kind: 'line',
        body: 'A',
        user: 'bob',
        createdAt: '2026-01-02T11:00:00Z',
        path: 'src/a.ts',
        line: 4,
        side: 'RIGHT'
      },
      {
        id: 'line-2',
        kind: 'line',
        body: 'B',
        user: 'alice',
        createdAt: '2026-01-02T12:00:00Z',
        path: 'src/a.ts',
        line: 4,
        side: 'RIGHT'
      }
    ]

    const grouped = groupLineCommentsByTarget(items)
    expect(grouped.get('RIGHT:4')).toHaveLength(2)
  })

  it('anchors line comments using original_line when line is null', () => {
    const anchor = normalizeReviewCommentAnchor({
      line: null,
      originalLine: 9,
      side: null
    })

    expect(anchor).toEqual({ line: 9, side: 'RIGHT' })
    const items: ReturnType<typeof mergePullRequestTimeline> = [
      {
        id: 'line-1',
        kind: 'line',
        body: 'Check this describe block',
        user: 'reviewer',
        createdAt: '2026-01-02T11:00:00Z',
        path: 'electron/github/api/pulls.test.ts',
        line: anchor?.line ?? null,
        side: anchor?.side ?? null
      }
    ]

    expect(groupLineCommentsByTarget(items).get('RIGHT:9')).toHaveLength(1)
  })
})
