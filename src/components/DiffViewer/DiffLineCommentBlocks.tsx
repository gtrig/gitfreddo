import type { GitHubPullRequestRepository, GitHubPullRequestReviewThread } from '@shared/github'
import { PullRequestReviewThreadCard } from '@/components/DetailPanel/PullRequestReviewThreadCard'

export function DiffLineCommentBlocks({
  threads,
  prNumber,
  repository,
  onUpdated
}: {
  threads: GitHubPullRequestReviewThread[]
  prNumber: number
  repository: GitHubPullRequestRepository
  onUpdated?: () => void
}) {
  if (threads.length === 0) return null

  return (
    <div className="border-y border-gf-accent/30 bg-gf-surface/50">
      {threads.map((thread) => (
        <PullRequestReviewThreadCard
          key={thread.id}
          thread={thread}
          prNumber={prNumber}
          repository={repository}
          onUpdated={onUpdated}
          compact
        />
      ))}
    </div>
  )
}
