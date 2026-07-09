import type { GitCommit } from '@/lib/types'
import { commitRowHighlightClass } from '@/lib/git/commitSelection'
import { commitCellContent, commitCellTitle } from '@/lib/timeline/timelineCommitColumns'
import type { TimelineColumnId } from '@/lib/timeline/timelineColumnVisibility'

const COMPACT_ROW_HEIGHT = 28

export function TimelineCommitColumn({
  columnId,
  width,
  align = 'left',
  prefixRows = 0,
  commits,
  rowState,
  getCellContent,
  getCellTitle,
  virtualWindow
}: {
  columnId: TimelineColumnId
  width: number
  align?: 'left' | 'right'
  prefixRows?: number
  commits: GitCommit[]
  rowState: (hash: string) => {
    isSelected: boolean
    isPrimary: boolean
    searchDimClass: string
  }
  getCellContent?: (commit: GitCommit) => string
  getCellTitle?: (commit: GitCommit) => string | undefined
  virtualWindow?: {
    start: number
    end: number
    topSpacerHeight: number
    bottomSpacerHeight: number
  }
}) {
  const visibleCommits = virtualWindow
    ? commits.slice(virtualWindow.start, virtualWindow.end)
    : commits
  const topSpacer = virtualWindow?.topSpacerHeight ?? 0
  const bottomSpacer = virtualWindow?.bottomSpacerHeight ?? 0

  return (
    <div
      className="shrink-0 border-l border-gf-border/40 bg-gf-bg-deep first:border-l-0"
      style={{ width }}
    >
      {prefixRows > 0 && <div style={{ height: prefixRows * COMPACT_ROW_HEIGHT }} />}
      {topSpacer > 0 && <div style={{ height: topSpacer }} aria-hidden />}
      {visibleCommits.map((commit) => {
        const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
        const title = getCellTitle?.(commit) ?? commitCellTitle(columnId, commit)
        const content = getCellContent?.(commit) ?? commitCellContent(columnId, commit)
        return (
          <div
            key={`${columnId}-${commit.hash}`}
            title={title}
            className={`pointer-events-none flex items-center border-b border-gf-border/30 px-2 text-[11px] text-gf-fg-subtle ${align === 'right' ? 'justify-end tabular-nums' : ''} ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
            style={{ height: COMPACT_ROW_HEIGHT }}
          >
            <span className="truncate">{content}</span>
          </div>
        )
      })}
      {bottomSpacer > 0 && <div style={{ height: bottomSpacer }} aria-hidden />}
    </div>
  )
}

export { COMPACT_ROW_HEIGHT as TIMELINE_ROW_HEIGHT }
