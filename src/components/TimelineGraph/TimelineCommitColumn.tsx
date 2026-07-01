import type { GitCommit } from '@/lib/types'
import { commitRowHighlightClass } from '@/lib/commitSelection'
import { commitCellContent, commitCellTitle } from '@/lib/timelineCommitColumns'
import type { TimelineColumnId } from '@/lib/timelineColumnVisibility'

const COMPACT_ROW_HEIGHT = 28

export function TimelineCommitColumn({
  columnId,
  width,
  align = 'left',
  showWorkingRow,
  commits,
  rowState,
  onRowContextMenu,
  handleCommitClick,
  getCellContent,
  getCellTitle
}: {
  columnId: TimelineColumnId
  width: number
  align?: 'left' | 'right'
  showWorkingRow: boolean
  commits: GitCommit[]
  rowState: (hash: string) => {
    isSelected: boolean
    isPrimary: boolean
    searchDimClass: string
  }
  onRowContextMenu: (commit: GitCommit) => (event: React.MouseEvent) => void
  handleCommitClick: (commit: GitCommit) => (event: React.MouseEvent) => void
  getCellContent?: (commit: GitCommit) => string
  getCellTitle?: (commit: GitCommit) => string | undefined
}) {
  return (
    <div
      className="shrink-0 border-l border-gf-border/40 bg-gf-bg-deep first:border-l-0"
      style={{ width }}
    >
      {showWorkingRow && <div style={{ height: COMPACT_ROW_HEIGHT }} />}
      {commits.map((commit) => {
        const { isSelected, isPrimary, searchDimClass } = rowState(commit.hash)
        const title = getCellTitle?.(commit) ?? commitCellTitle(columnId, commit)
        const content = getCellContent?.(commit) ?? commitCellContent(columnId, commit)
        return (
          <div
            key={`${columnId}-${commit.hash}`}
            onContextMenu={onRowContextMenu(commit)}
            onClick={handleCommitClick(commit)}
            title={title}
            className={`flex cursor-pointer items-center border-b border-gf-border/30 px-2 text-[11px] text-gf-fg-subtle hover:bg-gf-bg/50 ${align === 'right' ? 'justify-end tabular-nums' : ''} ${commitRowHighlightClass(isSelected, isPrimary)} ${searchDimClass}`}
            style={{ height: COMPACT_ROW_HEIGHT }}
          >
            <span className="truncate">{content}</span>
          </div>
        )
      })}
    </div>
  )
}

export { COMPACT_ROW_HEIGHT as TIMELINE_ROW_HEIGHT }
