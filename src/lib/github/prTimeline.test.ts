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

    expect(items.map((item) => item.kind)).toEqual(['conversation', 'line', 'review'])
    expect(items[1]?.path).toBe('src/a.ts')
  })

  it('filters line comments for a file path', () => {
    const items = mergePullRequestTimeline(
      [],
      [
        {
          id: 1,
          body: 'A',
          user: 'bob',
          createdAt: '2026-01-02T11:00:00Z',
          updatedAt: '2026-01-02T11:00:00Z',
          path: 'src/a.ts',
          line: 1,
          originalLine: 1,
          side: 'RIGHT',
          commitId: 'abc'
        },
        {
          id: 2,
          body: 'B',
          user: 'bob',
          createdAt: '2026-01-02T12:00:00Z',
          updatedAt: '2026-01-02T12:00:00Z',
          path: 'src/b.ts',
          line: 2,
          originalLine: 2,
          side: 'RIGHT',
          commitId: 'def'
        }
      ],
      []
    )

    expect(lineCommentsForPath(items, 'src/a.ts')).toHaveLength(1)
  })

  it('groups line comments by diff target', () => {
    const items = mergePullRequestTimeline(
      [],
      [
        {
          id: 1,
          body: 'A',
          user: 'bob',
          createdAt: '2026-01-02T11:00:00Z',
          updatedAt: '2026-01-02T11:00:00Z',
          path: 'src/a.ts',
          line: 4,
          originalLine: 4,
          side: 'RIGHT',
          commitId: 'abc'
        },
        {
          id: 2,
          body: 'B',
          user: 'alice',
          createdAt: '2026-01-02T12:00:00Z',
          updatedAt: '2026-01-02T12:00:00Z',
          path: 'src/a.ts',
          line: 4,
          originalLine: 4,
          side: 'RIGHT',
          commitId: 'abc'
        }
      ],
      []
    )

    const grouped = groupLineCommentsByTarget(items)
    expect(grouped.get('RIGHT:4')).toHaveLength(2)
  })

  it('anchors line comments using original_line when line is null', () => {
    const items = mergePullRequestTimeline(
      [],
      [
        {
          id: 1,
          body: 'Check this describe block',
          user: 'reviewer',
          createdAt: '2026-01-02T11:00:00Z',
          updatedAt: '2026-01-02T11:00:00Z',
          path: 'electron/github/api/pulls.test.ts',
          line: null,
          originalLine: 9,
          side: null,
          commitId: 'abc'
        }
      ],
      []
    )

    expect(items[0]?.line).toBe(9)
    expect(items[0]?.side).toBe('RIGHT')
    expect(groupLineCommentsByTarget(items).get('RIGHT:9')).toHaveLength(1)
  })
})
