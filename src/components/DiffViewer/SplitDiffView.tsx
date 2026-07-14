import { useRef } from 'react'
import type { SplitDiffRow } from '@/lib/diff/unifiedDiff'
import { useTranslation } from 'react-i18next'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'
import { splitCellCommentTarget, type DiffLineCommentTarget } from '@/lib/diff/unifiedDiff'
import { lineCommentTargetKey } from '@/lib/github/prTimeline'
import { DiffLineCommentBlocks } from '@/components/DiffViewer/DiffLineCommentBlocks'
import type { GitHubPullRequestRepository, GitHubPullRequestReviewThread } from '@shared/github'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CODE_LINE_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import { formatLineNo } from '@/lib/format/formatLineNo'

export interface DiffReviewThreadContext {
  byTarget: Map<string, GitHubPullRequestReviewThread[]>
  prNumber: number
  repository: GitHubPullRequestRepository
  onUpdated?: () => void
}

function cellClass(kind: 'add' | 'remove' | 'context' | null): string {
  switch (kind) {
    case 'add':
      return 'bg-gf-diff-add text-emerald-100'
    case 'remove':
      return 'bg-gf-diff-del text-red-200'
    case 'context':
      return 'text-gf-fg-muted'
    default:
      return 'bg-gf-bg-deep/40 text-gf-fg-subtle'
  }
}

interface SplitDiffViewProps {
  rows: SplitDiffRow[]
  loading?: boolean
  emptyMessage?: string
  onRequestLineComment?: (target: DiffLineCommentTarget) => void
  reviewThreads?: DiffReviewThreadContext
  className?: string
}

export function SplitDiffView({
  rows,
  loading,
  emptyMessage,
  onRequestLineComment,
  reviewThreads,
  className
}: SplitDiffViewProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: loading || rows.length === 0 ? 0 : rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CODE_LINE_HEIGHT,
    overscan: VIRTUAL_OVERSCAN,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined
  })

  if (loading) {
    return <p className="px-4 py-6 text-sm text-gf-fg-subtle">{t('diff.loadingDiff')}</p>
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gf-fg-subtle">
        {emptyMessage ?? t('diff.noDiffContent')}
      </p>
    )
  }

  return (
    <div className={`flex min-h-0 flex-col font-mono text-[12px] leading-5${className ? ` ${className}` : ''}`}>
      <div className="sticky top-0 z-10 grid shrink-0 grid-cols-2 border-b border-gf-border bg-gf-bg-deep/95 text-[10px] uppercase tracking-wide text-gf-fg-subtle">
        <span className="border-r border-gf-border px-4 py-1">{t('diff.before')}</span>
        <span className="px-4 py-1">{t('diff.after')}</span>
      </div>
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const row = rows[virtualItem.index]!
            const leftTarget = splitCellCommentTarget('left', row.leftLineNo)
            const rightTarget = splitCellCommentTarget('right', row.rightLineNo)
            const leftThreads =
              leftTarget && reviewThreads
                ? (reviewThreads.byTarget.get(
                    lineCommentTargetKey(leftTarget.side, leftTarget.line)
                  ) ?? [])
                : []
            const rightThreads =
              rightTarget && reviewThreads
                ? (reviewThreads.byTarget.get(
                    lineCommentTargetKey(rightTarget.side, rightTarget.line)
                  ) ?? [])
                : []
            const rowThreads = [...leftThreads, ...rightThreads]
            const uniqueRowThreads = rowThreads.filter(
              (thread, idx) => rowThreads.findIndex((item) => item.id === thread.id) === idx
            )

            return (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <div className="grid grid-cols-2 border-b border-gf-border/40">
                  <SplitDiffCell
                    side="left"
                    lineNo={row.leftLineNo}
                    text={row.leftText}
                    kind={row.leftKind}
                    onRequestLineComment={onRequestLineComment}
                  />
                  <SplitDiffCell
                    side="right"
                    lineNo={row.rightLineNo}
                    text={row.rightText}
                    kind={row.rightKind}
                    onRequestLineComment={onRequestLineComment}
                    borderLeft
                  />
                </div>
                {reviewThreads && uniqueRowThreads.length > 0 ? (
                  <DiffLineCommentBlocks
                    threads={uniqueRowThreads}
                    prNumber={reviewThreads.prNumber}
                    repository={reviewThreads.repository}
                    onUpdated={reviewThreads.onUpdated}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SplitDiffCell({
  side,
  lineNo,
  text,
  kind,
  onRequestLineComment,
  borderLeft = false
}: {
  side: 'left' | 'right'
  lineNo: number | null
  text: string | null
  kind: 'add' | 'remove' | 'context' | null
  onRequestLineComment?: (target: DiffLineCommentTarget) => void
  borderLeft?: boolean
}) {
  const { t } = useTranslation()
  const commentTarget = onRequestLineComment ? splitCellCommentTarget(side, lineNo) : null
  const gridCols = onRequestLineComment
    ? 'grid-cols-[28px_44px_minmax(0,1fr)]'
    : 'grid-cols-[44px_minmax(0,1fr)]'

  return (
    <div
      className={`group/diff-cell grid ${gridCols} ${borderLeft ? 'border-l border-gf-border/60' : 'border-r border-gf-border/60'} ${cellClass(kind)}`}
    >
      {onRequestLineComment ? (
        <span className="flex items-center justify-center border-r border-gf-border/60 bg-gf-diff-gutter/80">
          {commentTarget ? (
            <button
              type="button"
              onClick={() => onRequestLineComment(commentTarget)}
              className="rounded p-0.5 text-gf-fg-subtle opacity-0 transition-opacity hover:bg-gf-surface hover:text-gf-accent-fg group-hover/diff-cell:opacity-100"
              aria-label={t('detail.pullRequest.commentOnLine')}
              title={t('detail.pullRequest.commentOnLine')}
            >
              <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </span>
      ) : null}
      <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
        {formatLineNo(lineNo)}
      </span>
      <code className="min-w-0 whitespace-pre-wrap break-words px-3 py-0.5">{text ?? ''}</code>
    </div>
  )
}
