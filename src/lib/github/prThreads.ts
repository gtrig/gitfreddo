import type { GitHubPullRequestReviewThread } from '@shared/github'
import { lineCommentTargetKey } from '@/lib/github/prTimeline'

export function threadsForPath(
  threads: GitHubPullRequestReviewThread[],
  path: string
): GitHubPullRequestReviewThread[] {
  return threads.filter((thread) => thread.path === path)
}

export function groupThreadsByTarget(
  threads: GitHubPullRequestReviewThread[]
): Map<string, GitHubPullRequestReviewThread[]> {
  const grouped = new Map<string, GitHubPullRequestReviewThread[]>()

  for (const thread of threads) {
    if (thread.line == null) continue
    for (const side of ['LEFT', 'RIGHT'] as const) {
      const key = lineCommentTargetKey(side, thread.line)
      const list = grouped.get(key) ?? []
      list.push(thread)
      grouped.set(key, list)
    }
  }

  return grouped
}

export function rootReviewCommentId(thread: GitHubPullRequestReviewThread): number {
  return thread.comments[0]?.id ?? 0
}
