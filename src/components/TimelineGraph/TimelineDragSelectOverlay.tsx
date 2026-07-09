import type { GitCommit } from '@/lib/types'
import type { useTimelineDragSelect } from '@/hooks/useTimelineDragSelect'

type DragSelect = ReturnType<typeof useTimelineDragSelect>

export function TimelineDragSelectOverlay({
  dragSelect,
  onRowContextMenu,
  onCommitDoubleClick
}: {
  dragSelect: DragSelect
  onRowContextMenu: (commit: GitCommit) => (event: React.MouseEvent) => void
  onCommitDoubleClick: (commit: GitCommit) => (event: React.MouseEvent) => void
}) {
  if (dragSelect.commitRowAreaHeight <= 0) return null

  return (
    <div
      ref={dragSelect.overlayRef}
      role="presentation"
      className="absolute left-0 right-0 z-0 cursor-pointer"
      style={{
        top: dragSelect.commitRowAreaTop,
        height: dragSelect.commitRowAreaHeight
      }}
      onPointerDown={dragSelect.onPointerDown}
      onPointerMove={dragSelect.onPointerMove}
      onPointerUp={dragSelect.onPointerUp}
      onPointerCancel={dragSelect.onPointerCancel}
      onClick={dragSelect.onClick}
      onDoubleClick={(event) =>
        dragSelect.onDoubleClick(event, (commit) => onCommitDoubleClick(commit)(event))
      }
      onContextMenu={(event) => dragSelect.onContextMenu(event, onRowContextMenu)}
    />
  )
}
