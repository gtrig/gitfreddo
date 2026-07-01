import type { ContextMenuItem } from '@/components/ui/ContextMenu'

export type TimelineColumnId = 'branchTag' | 'graph' | 'message' | 'timeSince'

export interface TimelineColumnVisibility {
  branchTag: boolean
  graph: boolean
  message: boolean
  timeSince: boolean
}

export const DEFAULT_TIMELINE_COLUMN_VISIBILITY: TimelineColumnVisibility = {
  branchTag: true,
  graph: true,
  message: true,
  timeSince: true
}

const STORAGE_KEY = 'gitfredo.timeline.columnVisibility'

const COLUMN_LABELS: Record<TimelineColumnId, string> = {
  branchTag: 'Branch / Tag',
  graph: 'Graph',
  message: 'Commit message',
  timeSince: 'Time since'
}

export const TIMELINE_COLUMN_IDS = Object.keys(COLUMN_LABELS) as TimelineColumnId[]

function normalizeVisibility(raw: unknown): TimelineColumnVisibility {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
  }

  const source = raw as Partial<Record<TimelineColumnId, unknown>>
  const next = { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
  for (const id of TIMELINE_COLUMN_IDS) {
    if (typeof source[id] === 'boolean') {
      next[id] = source[id]
    }
  }

  if (!TIMELINE_COLUMN_IDS.some((id) => next[id])) {
    return { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
  }

  return next
}

export function countVisibleColumns(visibility: TimelineColumnVisibility): number {
  return TIMELINE_COLUMN_IDS.filter((id) => visibility[id]).length
}

export function loadTimelineColumnVisibility(): TimelineColumnVisibility {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) {
      return { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
    }
    return normalizeVisibility(JSON.parse(stored))
  } catch {
    return { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY }
  }
}

export function saveTimelineColumnVisibility(visibility: TimelineColumnVisibility): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
  } catch {
    // ignore storage errors
  }
}

export function timelineHeaderContextMenuItems(
  visibility: TimelineColumnVisibility,
  onToggle: (column: TimelineColumnId) => void
): ContextMenuItem[] {
  const visibleCount = countVisibleColumns(visibility)

  return TIMELINE_COLUMN_IDS.map((id) => ({
    id,
    label: COLUMN_LABELS[id],
    checked: visibility[id],
    disabled: visibility[id] && visibleCount <= 1,
    onClick: () => onToggle(id)
  }))
}
