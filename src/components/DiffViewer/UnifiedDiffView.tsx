import { useRef, useMemo } from 'react'
import type { DiffRow } from '@/lib/diff/unifiedDiff'
import { useTranslation } from 'react-i18next'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'
import { diffRowCommentTarget, type DiffLineCommentTarget } from '@/lib/diff/unifiedDiff'
import { DiffLineCommentBlocks } from '@/components/DiffViewer/DiffLineCommentBlocks'
import type { DiffReviewThreadContext } from '@/components/DiffViewer/SplitDiffView'
import type { GitBlameLine } from '@/lib/types'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  buildDiffVirtualItems,
  type DiffVirtualItem
} from '@/lib/ui/buildDiffVirtualItems'
import { CODE_LINE_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'
import { formatLineNo } from '@/lib/format/formatLineNo'

export type { DiffLineCommentTarget }

function unifiedRowClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'bg-gf-diff-add'
    case 'remove':
      return 'bg-gf-diff-del'
    case 'hunk':
      return 'bg-gf-diff-hunk text-gf-accent-fg/90'
    case 'context':
      return 'bg-transparent'
    default:
      return 'bg-transparent text-gf-fg-subtle'
  }
}

function unifiedTextClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'text-emerald-100'
    case 'remove':
      return 'text-red-200'
    case 'hunk':
      return 'text-gf-accent-fg/90'
    case 'context':
      return 'text-gf-fg-muted'
    default:
      return 'text-gf-fg-subtle'
  }
}

function markerForKind(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return '+'
    case 'remove':
      return '−'
    case 'context':
      return ' '
    default:
      return ''
  }
}

interface UnifiedDiffViewProps {
  rows: DiffRow[]
  loading?: boolean
  emptyMessage?: string
  showBlame?: boolean
  blameByNewLine?: Map<number, GitBlameLine>
  hunkStageMode?: 'stage' | 'unstage' | null
  onHunkAction?: (groupIndex: number) => void
  hunkBusy?: boolean
  onRequestLineComment?: (target: DiffLineCommentTarget) => void
  reviewThreads?: DiffReviewThreadContext
  className?: string
}

function estimateDiffItemSize(item: DiffVirtualItem): number {
  if (item.kind === 'hunk') return 28
  if (item.kind === 'comments') return 120
  return CODE_LINE_HEIGHT
}

export function UnifiedDiffView({
  rows,
  loading,
  emptyMessage,
  showBlame = false,
  blameByNewLine,
  hunkStageMode = null,
  onHunkAction,
  hunkBusy = false,
  onRequestLineComment,
  reviewThreads,
  className
}: UnifiedDiffViewProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)

  const commentTargetKeys = useMemo(() => {
    if (!reviewThreads) return undefined
    return new Set(reviewThreads.byTarget.keys())
  }, [reviewThreads])

  const items = useMemo(
    () => (loading || rows.length === 0 ? [] : buildDiffVirtualItems(rows, commentTargetKeys)),
    [rows, loading, commentTargetKeys]
  )

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => estimateDiffItemSize(items[index]!),
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

  let gridCols = 'grid-cols-[44px_44px_20px_minmax(0,1fr)]'
  if (onRequestLineComment && showBlame) {
    gridCols = 'grid-cols-[28px_72px_44px_44px_20px_minmax(0,1fr)]'
  } else if (onRequestLineComment) {
    gridCols = 'grid-cols-[28px_44px_44px_20px_minmax(0,1fr)]'
  } else if (showBlame) {
    gridCols = 'grid-cols-[72px_44px_44px_20px_minmax(0,1fr)]'
  }

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto font-mono text-[12px] leading-5${className ? ` ${className}` : ''}`}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const item = items[virtualItem.index]!

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
              {item.kind === 'hunk' && (
                <div
                  className={`flex items-center justify-between gap-2 border-y border-gf-border/80 px-4 py-1 ${unifiedRowClass('hunk')} ${unifiedTextClass('hunk')}`}
                >
                  <span className="min-w-0 truncate">{item.content}</span>
                  {hunkStageMode && onHunkAction && (
                    <button
                      type="button"
                      disabled={hunkBusy}
                      onClick={() => onHunkAction(item.groupIndex)}
                      className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-bg disabled:opacity-50"
                    >
                      {hunkStageMode === 'stage' ? t('diff.stageHunk') : t('diff.unstageHunk')}
                    </button>
                  )}
                </div>
              )}

              {item.kind === 'row' && (() => {
                const { row } = item
                const blame =
                  showBlame && row.newLine != null
                    ? blameByNewLine?.get(row.newLine)
                    : undefined
                const commentTarget = onRequestLineComment ? diffRowCommentTarget(row) : null

                return (
                  <div
                    className={`group/diff-row grid ${gridCols} ${unifiedRowClass(row.kind)}`}
                    title={blame ? `${blame.shortHash} ${blame.summary}` : undefined}
                  >
                    {onRequestLineComment ? (
                      <span className="flex items-center justify-center border-r border-gf-border/60 bg-gf-diff-gutter/80">
                        {commentTarget ? (
                          <button
                            type="button"
                            onClick={() => onRequestLineComment(commentTarget)}
                            className="rounded p-0.5 text-gf-fg-subtle opacity-0 transition-opacity hover:bg-gf-surface hover:text-gf-accent-fg group-hover/diff-row:opacity-100"
                            aria-label={t('detail.pullRequest.commentOnLine')}
                            title={t('detail.pullRequest.commentOnLine')}
                          >
                            <ChatBubbleLeftEllipsisIcon className="h-3.5 w-3.5" />
                          </button>
                        ) : null}
                      </span>
                    ) : null}
                    {showBlame && (
                      <span className="select-none truncate border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-[10px] text-gf-fg-subtle">
                        {blame ? `${blame.shortHash} ${blame.author.split(' ')[0] ?? ''}` : ''}
                      </span>
                    )}
                    <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
                      {formatLineNo(row.oldLine)}
                    </span>
                    <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
                      {formatLineNo(row.newLine)}
                    </span>
                    <span
                      className={`select-none border-r border-gf-border/60 px-1 text-center text-[11px] ${
                        row.kind === 'add'
                          ? 'text-emerald-400'
                          : row.kind === 'remove'
                            ? 'text-red-400'
                            : 'text-gf-fg-subtle'
                      }`}
                    >
                      {markerForKind(row.kind)}
                    </span>
                    <code className={`min-w-0 whitespace-pre-wrap break-words px-3 ${unifiedTextClass(row.kind)}`}>
                      {row.content || ' '}
                    </code>
                  </div>
                )
              })()}

              {item.kind === 'comments' && reviewThreads && (() => {
                const threads = reviewThreads.byTarget.get(item.commentTargetKey) ?? []
                return threads.length > 0 ? (
                  <DiffLineCommentBlocks
                    threads={threads}
                    prNumber={reviewThreads.prNumber}
                    repository={reviewThreads.repository}
                    onUpdated={reviewThreads.onUpdated}
                  />
                ) : null
              })()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
