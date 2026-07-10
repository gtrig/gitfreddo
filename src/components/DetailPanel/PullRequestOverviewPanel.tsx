import { useTranslation } from 'react-i18next'
import { LoadingRow } from '@/components/Ui/Spinner'
import { PullRequestConversationTimeline } from '@/components/DetailPanel/PullRequestConversationTimeline'
import type { GitHubPullRequest, GitHubPullRequestTimelineItem } from '@shared/github'

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
  loading?: boolean
  error?: Error | null
  onOpenFile?: (path: string) => void
}

export function PullRequestOverviewPanel({
  pr,
  items,
  loading = false,
  error = null,
  onOpenFile
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
                <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gf-fg-muted">
                  {pr.body}
                </div>
              ) : (
                <p className="mt-3 text-sm text-gf-fg-subtle">
                  {t('detail.pullRequest.noDescription')}
                </p>
              )}
            </div>
          </article>
        </section>

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
