import type { DiffRow } from '@/lib/diff/unifiedDiff'
import { useTranslation } from 'react-i18next'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'
import { diffRowCommentTarget, groupRowsByHunk, type DiffLineCommentTarget } from '@/lib/diff/unifiedDiff'
import { lineCommentTargetKey } from '@/lib/github/prTimeline'
import { DiffLineCommentBlocks } from '@/components/DiffViewer/DiffLineCommentBlocks'
import type { DiffReviewThreadContext } from '@/components/DiffViewer/SplitDiffView'
import type { GitBlameLine } from '@/lib/types'

export type { DiffLineCommentTarget }

function formatLineNo(value: number | null): string {
  return value == null ? '' : String(value)
}

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
  reviewThreads
}: UnifiedDiffViewProps) {
  const { t } = useTranslation()

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

  const groups = groupRowsByHunk(rows)
  let gridCols = 'grid-cols-[44px_44px_20px_minmax(0,1fr)]'
  if (onRequestLineComment && showBlame) {
    gridCols = 'grid-cols-[28px_72px_44px_44px_20px_minmax(0,1fr)]'
  } else if (onRequestLineComment) {
    gridCols = 'grid-cols-[28px_44px_44px_20px_minmax(0,1fr)]'
  } else if (showBlame) {
    gridCols = 'grid-cols-[72px_44px_44px_20px_minmax(0,1fr)]'
  }

  return (
    <div className="font-mono text-[12px] leading-5">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group[0]?.kind === 'hunk' && (
            <div
              className={`flex items-center justify-between gap-2 border-y border-gf-border/80 px-4 py-1 ${unifiedRowClass('hunk')} ${unifiedTextClass('hunk')}`}
            >
              <span className="min-w-0 truncate">{group[0].content}</span>
              {hunkStageMode && onHunkAction && (
                <button
                  type="button"
                  disabled={hunkBusy}
                  onClick={() => onHunkAction(groupIndex)}
                  className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-bg disabled:opacity-50"
                >
                  {hunkStageMode === 'stage' ? t('diff.stageHunk') : t('diff.unstageHunk')}
                </button>
              )}
            </div>
          )}
          {group
            .filter((row) => row.kind !== 'hunk')
            .map((row, index) => {
              const blame =
                showBlame && row.newLine != null
                  ? blameByNewLine?.get(row.newLine)
                  : undefined
              const commentTarget = onRequestLineComment ? diffRowCommentTarget(row) : null
              const lineThreads =
                commentTarget && reviewThreads
                  ? (reviewThreads.byTarget.get(
                      lineCommentTargetKey(commentTarget.side, commentTarget.line)
                    ) ?? [])
                  : []
              return (
                <div key={`${groupIndex}-${index}`}>
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
                  {reviewThreads && lineThreads.length > 0 ? (
                    <DiffLineCommentBlocks
                      threads={lineThreads}
                      prNumber={reviewThreads.prNumber}
                      repository={reviewThreads.repository}
                      onUpdated={reviewThreads.onUpdated}
                    />
                  ) : null}
                </div>
              )
            })}
        </div>
      ))}
    </div>
  )
}
