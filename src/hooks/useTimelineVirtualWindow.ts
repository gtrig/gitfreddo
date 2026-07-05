import { useEffect, useMemo, useState } from 'react'
import { timelineVisibleIndexRange } from '@/lib/timeline/timelineVirtualWindow'

export function useTimelineVirtualWindow(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  rowCount: number,
  rowHeight: number,
  prefixHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)

  useEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const update = () => {
      setScrollTop(element.scrollTop)
      setViewportHeight(element.clientHeight)
    }

    update()
    element.addEventListener('scroll', update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => {
      element.removeEventListener('scroll', update)
      observer.disconnect()
    }
  }, [scrollRef, rowCount, prefixHeight])

  const range = useMemo(
    () => timelineVisibleIndexRange(scrollTop, viewportHeight, rowHeight, prefixHeight, rowCount),
    [scrollTop, viewportHeight, rowHeight, prefixHeight, rowCount]
  )

  return useMemo(
    () => ({
      start: range.start,
      end: range.end,
      topSpacerHeight: range.start * rowHeight,
      bottomSpacerHeight: Math.max(0, rowCount - range.end) * rowHeight
    }),
    [range.end, range.start, rowCount, rowHeight]
  )
}
