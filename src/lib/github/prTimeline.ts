import type {
  GitHubPullRequestConversationComment,
  GitHubPullRequestReview,
  GitHubPullRequestReviewComment,
  GitHubPullRequestTimelineItem
} from '@shared/github'

export function normalizeReviewCommentAnchor(
  comment: Pick<GitHubPullRequestReviewComment, 'line' | 'originalLine' | 'side'>
): { line: number; side: 'LEFT' | 'RIGHT' } | null {
  const line = comment.line ?? comment.originalLine
  if (line == null) return null
  return { line, side: comment.side ?? 'RIGHT' }
}

export function mergePullRequestTimeline(
  conversation: GitHubPullRequestConversationComment[],
  _lineComments: GitHubPullRequestReviewComment[],
  reviews: GitHubPullRequestReview[]
): GitHubPullRequestTimelineItem[] {
  const items: GitHubPullRequestTimelineItem[] = []

  for (const comment of conversation) {
    items.push({
      id: `conversation-${comment.id}`,
      kind: 'conversation',
      body: comment.body,
      user: comment.user,
      createdAt: comment.createdAt
    })
  }

  // Line review comments are shown as threaded cards (GraphQL), not flat timeline items.

  for (const review of reviews) {
    items.push({
      id: `review-${review.id}`,
      kind: 'review',
      body: review.body,
      user: review.user,
      createdAt: review.submittedAt,
      reviewState: review.state
    })
  }

  return items.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

export function lineCommentsForPath(
  items: GitHubPullRequestTimelineItem[],
  path: string
): GitHubPullRequestTimelineItem[] {
  return items.filter((item) => item.kind === 'line' && item.path === path)
}

export function lineCommentTargetKey(side: 'LEFT' | 'RIGHT', line: number): string {
  return `${side}:${line}`
}

export function groupLineCommentsByTarget(
  items: GitHubPullRequestTimelineItem[]
): Map<string, GitHubPullRequestTimelineItem[]> {
  const grouped = new Map<string, GitHubPullRequestTimelineItem[]>()

  for (const item of items) {
    if (item.kind !== 'line' || item.line == null || item.side == null) continue
    const key = lineCommentTargetKey(item.side, item.line)
    const list = grouped.get(key) ?? []
    list.push(item)
    grouped.set(key, list)
  }

  return grouped
}
