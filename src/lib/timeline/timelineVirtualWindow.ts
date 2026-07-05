export function timelineVisibleIndexRange(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  prefixHeight: number,
  totalRows: number,
  overscan = 8
): { start: number; end: number } {
  if (totalRows <= 0) {
    return { start: 0, end: 0 }
  }

  const adjustedTop = Math.max(0, scrollTop - prefixHeight)
  const start = Math.max(0, Math.floor(adjustedTop / rowHeight) - overscan)
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2
  const end = Math.min(totalRows, start + visibleCount)
  return { start, end }
}
