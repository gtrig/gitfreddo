import { describe, expect, it, vi } from 'vitest'
import {
  listPullRequestReviewThreads,
  mapReviewThreadsResponse,
  replyToPullRequestReviewComment,
  resolvePullRequestReviewThread,
  unresolvePullRequestReviewThread
} from './pullThreads'

describe('pullThreads', () => {
  it('maps graphql review threads into shared types', () => {
    const threads = mapReviewThreadsResponse({
      repository: {
        pullRequest: {
          reviewThreads: {
            nodes: [
              {
                id: 'PRRT_abc',
                isResolved: false,
                isOutdated: false,
                comments: {
                  nodes: [
                    {
                      databaseId: 10,
                      body: 'First comment',
                      createdAt: '2026-01-02T10:00:00Z',
                      author: { login: 'alice' },
                      path: 'src/a.ts',
                      line: 12,
                      diffHunk: null
                    },
                    {
                      databaseId: 11,
                      body: 'Reply',
                      createdAt: '2026-01-02T11:00:00Z',
                      author: { login: 'bob' },
                      path: 'src/a.ts',
                      line: 12,
                      diffHunk: null
                    }
                  ]
                }
              },
              {
                id: 'PRRT_def',
                isResolved: true,
                isOutdated: true,
                comments: {
                  nodes: [
                    {
                      databaseId: 20,
                      body: 'Resolved thread',
                      createdAt: '2026-01-01T09:00:00Z',
                      author: { login: 'carol' },
                      path: 'src/b.ts',
                      line: 3,
                      diffHunk: null
                    }
                  ]
                }
              }
            ]
          }
        }
      }
    })

    expect(threads).toHaveLength(2)
    expect(threads[0]).toMatchObject({
      id: 'PRRT_def',
      isResolved: true,
      path: 'src/b.ts',
      line: 3,
      comments: [{ id: 20, body: 'Resolved thread', user: 'carol' }]
    })
    expect(threads[1]).toMatchObject({
      id: 'PRRT_abc',
      isResolved: false,
      comments: [
        { id: 10, body: 'First comment', user: 'alice' },
        { id: 11, body: 'Reply', user: 'bob' }
      ]
    })
  })

  it('lists review threads via graphql', async () => {
    const graphql = vi.fn().mockResolvedValue({
      repository: {
        pullRequest: {
          reviewThreads: { nodes: [] }
        }
      }
    })

    await listPullRequestReviewThreads('o', 'r', 7, graphql)

    expect(graphql).toHaveBeenCalledWith(
      expect.stringContaining('reviewThreads'),
      { owner: 'o', repo: 'r', number: 7 }
    )
  })

  it('resolves and unresolves a review thread', async () => {
    const graphql = vi.fn().mockResolvedValue({})

    await resolvePullRequestReviewThread('PRRT_abc', graphql)
    await unresolvePullRequestReviewThread('PRRT_abc', graphql)

    expect(graphql).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('resolveReviewThread'),
      { threadId: 'PRRT_abc' }
    )
    expect(graphql).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('unresolveReviewThread'),
      { threadId: 'PRRT_abc' }
    )
  })

  it('posts a reply to a review comment', async () => {
    const githubJson = vi.fn().mockResolvedValue({})

    await replyToPullRequestReviewComment('o', 'r', 7, 10, 'Thanks!', 42, githubJson)

    expect(githubJson).toHaveBeenCalledWith(
      '/repos/o/r/pulls/7/comments/10/replies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: 'Thanks!', pull_request_review_id: 42 })
      })
    )
  })
})
