import type { GitHubPullRequestReviewThread } from '@shared/github'
import { githubGraphql } from './graphql'
import { githubJson } from './http'

interface GraphqlReviewThreadsResponse {
  repository: {
    pullRequest: {
      reviewThreads: {
        nodes: Array<{
          id: string
          isResolved: boolean
          isOutdated: boolean
          comments: {
            nodes: Array<{
              databaseId: number
              body: string
              createdAt: string
              author: { login: string } | null
              path: string | null
              line: number | null
              diffHunk: string | null
            }>
          }
        }>
      }
    } | null
  } | null
}

const REVIEW_THREADS_QUERY = `
  query PullRequestReviewThreads($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            isOutdated
            comments(first: 100) {
              nodes {
                databaseId
                body
                createdAt
                author { login }
                path
                line
                diffHunk
              }
            }
          }
        }
      }
    }
  }
`

const RESOLVE_THREAD_MUTATION = `
  mutation ResolveReviewThread($threadId: ID!) {
    resolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }
`

const UNRESOLVE_THREAD_MUTATION = `
  mutation UnresolveReviewThread($threadId: ID!) {
    unresolveReviewThread(input: { threadId: $threadId }) {
      thread { id isResolved }
    }
  }
`

export function mapReviewThreadsResponse(
  data: GraphqlReviewThreadsResponse
): GitHubPullRequestReviewThread[] {
  const nodes = data.repository?.pullRequest?.reviewThreads.nodes ?? []
  const threads: GitHubPullRequestReviewThread[] = []

  for (const node of nodes) {
    const comments = node.comments.nodes
      .filter((comment) => comment.databaseId != null)
      .map((comment) => ({
        id: comment.databaseId,
        body: comment.body,
        user: comment.author?.login ?? 'unknown',
        createdAt: comment.createdAt,
        path: comment.path,
        line: comment.line
      }))

    if (comments.length === 0) continue

    const anchor = comments[0]
    threads.push({
      id: node.id,
      isResolved: node.isResolved,
      isOutdated: node.isOutdated,
      path: anchor.path ?? '',
      line: anchor.line,
      comments
    })
  }

  return threads.sort(
    (a, b) =>
      new Date(a.comments[0]?.createdAt ?? 0).getTime() -
      new Date(b.comments[0]?.createdAt ?? 0).getTime()
  )
}

export async function listPullRequestReviewThreads(
  owner: string,
  repo: string,
  number: number,
  graphql: typeof githubGraphql = githubGraphql
): Promise<GitHubPullRequestReviewThread[]> {
  const data = await graphql<GraphqlReviewThreadsResponse>(REVIEW_THREADS_QUERY, {
    owner,
    repo,
    number
  })
  return mapReviewThreadsResponse(data)
}

export async function resolvePullRequestReviewThread(
  threadId: string,
  graphql: typeof githubGraphql = githubGraphql
): Promise<void> {
  await graphql(RESOLVE_THREAD_MUTATION, { threadId })
}

export async function unresolvePullRequestReviewThread(
  threadId: string,
  graphql: typeof githubGraphql = githubGraphql
): Promise<void> {
  await graphql(UNRESOLVE_THREAD_MUTATION, { threadId })
}

export async function replyToPullRequestReviewComment(
  owner: string,
  repo: string,
  number: number,
  commentId: number,
  body: string,
  pendingReviewId?: number | null,
  json: typeof githubJson = githubJson
): Promise<void> {
  const payload: Record<string, unknown> = { body }
  if (pendingReviewId != null) {
    payload.pull_request_review_id = pendingReviewId
  }

  await json(`/repos/${owner}/${repo}/pulls/${number}/comments/${commentId}/replies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}
