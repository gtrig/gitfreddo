import { useTranslation } from 'react-i18next'
import { LoadingRow } from '@/components/Ui/Spinner'
import { GitHubMarkdownBody } from '@/components/Ui/GitHubMarkdownBody'
import { PullRequestConversationTimeline } from '@/components/DetailPanel/PullRequestConversationTimeline'
import { PullRequestReviewThreadCard } from '@/components/DetailPanel/PullRequestReviewThreadCard'
import type {
  GitHubPullRequest,
  GitHubPullRequestReviewThread,
  GitHubPullRequestTimelineItem
} from '@shared/github'

function UserAvatar({ user }: { user: string }) {
  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gf-border bg-gf-surface text-xs font-medium uppercase text-gf-fg-muted"
    >
      {user.slice(0, 1)}
    </span>
  )
}

interface PullRequestOverviewPanelProps {
  pr: GitHubPullRequest
  items: GitHubPullRequestTimelineItem[]
  threads?: GitHubPullRequestReviewThread[]
  threadsLoading?: boolean
  threadsError?: Error | null
  loading?: boolean
  error?: Error | null
  onOpenFile?: (path: string) => void
  onThreadsUpdated?: () => void
}

export function PullRequestOverviewPanel({
  pr,
  items,
  threads = [],
  threadsLoading = false,
  threadsError = null,
  loading = false,
  error = null,
  onOpenFile,
  onThreadsUpdated
}: PullRequestOverviewPanelProps) {
  const { t } = useTranslation()

  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <section>
          <h2 className="sr-only">{t('detail.pullRequest.conversation')}</h2>
          <article className="flex gap-3">
            <UserAvatar user={pr.user} />
            <div className="min-w-0 flex-1 rounded-lg border border-gf-border bg-gf-surface/30 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gf-fg-subtle">
                <span className="font-medium text-gf-fg">{pr.user}</span>
                <span>{t('detail.pullRequest.openedThisPullRequest')}</span>
              </div>
              {pr.body.trim() ? (
                <div className="mt-3">
                  <GitHubMarkdownBody content={pr.body} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-gf-fg-subtle">
                  {t('detail.pullRequest.noDescription')}
                </p>
              )}
            </div>
          </article>
        </section>

        {threads.length > 0 || threadsLoading || threadsError ? (
          <section>
            <h3 className="text-sm font-medium text-gf-fg">
              {t('detail.pullRequest.reviewThreads')}
            </h3>
            {threadsLoading ? (
              <div className="mt-4">
                <LoadingRow label={t('detail.pullRequest.loadingReviewThreads')} />
              </div>
            ) : threadsError ? (
              <p className="mt-4 text-sm text-red-400">
                {threadsError instanceof Error
                  ? threadsError.message
                  : t('detail.pullRequest.reviewThreadsFailed')}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {threads.map((thread) => (
                  <PullRequestReviewThreadCard
                    key={thread.id}
                    thread={thread}
                    prNumber={pr.number}
                    repository={pr.repository}
                    showPath
                    onOpenFile={onOpenFile}
                    onUpdated={onThreadsUpdated}
                  />
                ))}
              </div>
            )}
          </section>
        ) : null}

        <section>
          <h3 className="text-sm font-medium text-gf-fg">{t('detail.pullRequest.conversation')}</h3>
          {loading ? (
            <div className="mt-4">
              <LoadingRow label={t('detail.pullRequest.loadingConversation')} />
            </div>
          ) : error ? (
            <p className="mt-4 text-sm text-red-400">
              {error instanceof Error ? error.message : t('detail.pullRequest.conversationFailed')}
            </p>
          ) : (
            <div className="mt-4">
              <PullRequestConversationTimeline items={items} onOpenFile={onOpenFile} />
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
