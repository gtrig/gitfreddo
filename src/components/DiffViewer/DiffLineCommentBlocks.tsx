import type { GitHubPullRequestTimelineItem } from '@shared/github'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function DiffLineCommentBlocks({
  comments
}: {
  comments: GitHubPullRequestTimelineItem[]
}) {
  if (comments.length === 0) return null

  return (
    <div className="border-y border-gf-accent/30 bg-gf-surface/50">
      {comments.map((comment) => (
        <div
          key={comment.id}
          className="border-b border-gf-border/60 px-4 py-2 last:border-b-0"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-gf-fg-subtle">
            <span className="font-medium text-gf-fg">{comment.user}</span>
            <span>{formatTimestamp(comment.createdAt)}</span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-[12px] leading-relaxed text-gf-fg-muted">
            {comment.body}
          </p>
        </div>
      ))}
    </div>
  )
}
