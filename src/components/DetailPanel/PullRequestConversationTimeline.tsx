import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { GitHubMarkdownBody } from '@/components/Ui/GitHubMarkdownBody'
import { shouldVirtualize, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import type { GitHubPullRequestTimelineItem } from '@shared/github'

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

function reviewStateLabelKey(state: string): string {
  switch (state) {
    case 'APPROVED':
      return 'detail.pullRequest.reviewApproved'
    case 'CHANGES_REQUESTED':
      return 'detail.pullRequest.reviewChangesRequested'
    case 'COMMENTED':
      return 'detail.pullRequest.reviewCommented'
    case 'DISMISSED':
      return 'detail.pullRequest.reviewDismissed'
    case 'PENDING':
      return 'detail.pullRequest.reviewPending'
    default:
      return 'detail.pullRequest.reviewCommented'
  }
}

function reviewStateClassName(state: string): string {
  switch (state) {
    case 'APPROVED':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'CHANGES_REQUESTED':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    case 'DISMISSED':
      return 'border-gf-border bg-gf-surface/40 text-gf-fg-subtle'
    case 'PENDING':
      return 'border-violet-500/40 bg-violet-500/10 text-violet-300'
    default:
      return 'border-sky-500/40 bg-sky-500/10 text-sky-300'
  }
}

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

interface PullRequestConversationTimelineProps {
  items: GitHubPullRequestTimelineItem[]
  onOpenFile?: (path: string) => void
}

function ConversationItem({
  item,
  onOpenFile,
  t
}: {
  item: GitHubPullRequestTimelineItem
  onOpenFile?: (path: string) => void
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="flex gap-3">
      <UserAvatar user={item.user} />
      <div className="min-w-0 flex-1 rounded-lg border border-gf-border bg-gf-surface/30 p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gf-fg-subtle">
          <span className="font-medium text-gf-fg">{item.user}</span>
          <span>{formatTimestamp(item.createdAt)}</span>
          {item.kind === 'conversation' ? (
            <span className="rounded-full border border-gf-border px-2 py-0.5 text-[10px]">
              {t('detail.pullRequest.commentKindConversation')}
            </span>
          ) : null}
          {item.kind === 'line' ? (
            <span className="rounded-full border border-gf-border px-2 py-0.5 text-[10px]">
              {t('detail.pullRequest.commentKindLine')}
            </span>
          ) : null}
          {item.kind === 'review' && item.reviewState ? (
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${reviewStateClassName(item.reviewState)}`}
            >
              {t(reviewStateLabelKey(item.reviewState))}
            </span>
          ) : null}
        </div>

        {item.kind === 'line' && item.path ? (
          <div className="mt-2">
            {onOpenFile ? (
              <button
                type="button"
                onClick={() => onOpenFile(item.path!)}
                className="font-mono text-xs text-gf-accent hover:underline"
              >
                {item.path}
                {item.line != null ? `:${item.line}` : ''}
              </button>
            ) : (
              <p className="font-mono text-xs text-gf-fg-muted">
                {item.path}
                {item.line != null ? `:${item.line}` : ''}
              </p>
            )}
          </div>
        ) : null}

        {item.body.trim() ? (
          <div className="mt-3">
            <GitHubMarkdownBody content={item.body} />
          </div>
        ) : item.kind === 'review' ? (
          <p className="mt-3 text-sm text-gf-fg-subtle">
            {t('detail.pullRequest.reviewWithoutComment')}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function PullRequestConversationTimeline({
  items,
  onOpenFile
}: PullRequestConversationTimelineProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const useVirtualization = shouldVirtualize(items.length)

  const virtualizer = useVirtualizer({
    count: useVirtualization ? items.length : 0,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 120,
    overscan: VIRTUAL_OVERSCAN
  })

  if (items.length === 0) {
    return (
      <p className="text-sm text-gf-fg-subtle">{t('detail.pullRequest.noConversation')}</p>
    )
  }

  if (useVirtualization) {
    return (
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: '60vh' }}>
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = items[virtualItem.index]!
            return (
              <div
                key={virtualItem.key}
                ref={virtualizer.measureElement}
                data-index={virtualItem.index}
                style={{
                  position: 'absolute', top: 0, left: 0, width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
                className="pb-4"
              >
                <ConversationItem item={item} onOpenFile={onOpenFile} t={t} />
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <ol className="space-y-4">
      {items.map((item) => (
        <li key={item.id}>
          <ConversationItem item={item} onOpenFile={onOpenFile} t={t} />
        </li>
      ))}
    </ol>
  )
}
