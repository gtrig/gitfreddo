import type { SplitDiffRow } from '@/lib/diff/unifiedDiff'
import { useTranslation } from 'react-i18next'
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/outline'
import { splitCellCommentTarget, type DiffLineCommentTarget } from '@/lib/diff/unifiedDiff'
import { lineCommentTargetKey } from '@/lib/github/prTimeline'
import { DiffLineCommentBlocks } from '@/components/DiffViewer/DiffLineCommentBlocks'
import type { GitHubPullRequestTimelineItem } from '@shared/github'

function formatLineNo(value: number | null): string {
  return value == null ? '' : String(value)
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
  commentsByTarget?: Map<string, GitHubPullRequestTimelineItem[]>
}

export function SplitDiffView({
  rows,
  loading,
  emptyMessage,
  onRequestLineComment,
  commentsByTarget
}: SplitDiffViewProps) {
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

  return (
    <div className="font-mono text-[12px] leading-5">
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-gf-border bg-gf-bg-deep/95 text-[10px] uppercase tracking-wide text-gf-fg-subtle">
        <span className="border-r border-gf-border px-4 py-1">{t('diff.before')}</span>
        <span className="px-4 py-1">{t('diff.after')}</span>
      </div>
      {rows.map((row, index) => {
        const leftTarget = splitCellCommentTarget('left', row.leftLineNo)
        const rightTarget = splitCellCommentTarget('right', row.rightLineNo)
        const leftComments =
          leftTarget && commentsByTarget
            ? (commentsByTarget.get(
                lineCommentTargetKey(leftTarget.side, leftTarget.line)
              ) ?? [])
            : []
        const rightComments =
          rightTarget && commentsByTarget
            ? (commentsByTarget.get(
                lineCommentTargetKey(rightTarget.side, rightTarget.line)
              ) ?? [])
            : []
        const rowComments = [...leftComments, ...rightComments]

        return (
          <div key={index}>
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
            <DiffLineCommentBlocks comments={rowComments} />
          </div>
        )
      })}
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
