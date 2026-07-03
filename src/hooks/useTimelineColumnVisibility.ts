import { useCallback, useState } from 'react'
import {
  countVisibleColumns,
  loadTimelineColumnVisibility,
  saveTimelineColumnVisibility,
  type TimelineColumnId,
  type TimelineColumnVisibility
} from '@/lib/timeline/timelineColumnVisibility'

export function useTimelineColumnVisibility() {
  const [visibility, setVisibility] = useState(loadTimelineColumnVisibility)

  const toggleColumn = useCallback((column: TimelineColumnId) => {
    setVisibility((current) => {
      if (current[column] && countVisibleColumns(current) <= 1) {
        return current
      }

      const next: TimelineColumnVisibility = { ...current, [column]: !current[column] }
      saveTimelineColumnVisibility(next)
      return next
    })
  }, [])

  return { visibility, toggleColumn }
}
