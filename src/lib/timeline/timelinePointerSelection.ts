export const TIMELINE_DRAG_THRESHOLD_PX = 4

export function clampCommitRowIndex(index: number, rowCount: number): number {
  if (rowCount <= 0) return 0
  return Math.min(rowCount - 1, Math.max(0, index))
}

/** Maps a viewport pointer Y coordinate to a commit row index within a commit-row hit area. */
export function commitIndexFromPointerY(params: {
  clientY: number
  areaTop: number
  rowHeight: number
  rowCount: number
}): number {
  const { clientY, areaTop, rowHeight, rowCount } = params
  if (rowCount <= 0) return 0

  const relativeY = clientY - areaTop
  const index = Math.floor(relativeY / rowHeight)
  return clampCommitRowIndex(index, rowCount)
}

export function isPointerOverCommitArea(
  clientY: number,
  areaTop: number,
  areaHeight: number
): boolean {
  if (areaHeight <= 0) return false
  const relativeY = clientY - areaTop
  return relativeY >= 0 && relativeY < areaHeight
}

export function hasExceededDragThreshold(
  startY: number,
  currentY: number,
  threshold = TIMELINE_DRAG_THRESHOLD_PX
): boolean {
  return Math.abs(currentY - startY) >= threshold
}
