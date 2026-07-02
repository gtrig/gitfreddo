import type { ContextMenuItem } from '@/components/ui/ContextMenu'

export type TimelineColumnId =
  | 'branchTag'
  | 'graph'
  | 'hash'
  | 'author'
  | 'authorEmail'
  | 'authoredDate'
  | 'parents'
  | 'refs'
  | 'message'
  | 'bodyPreview'
  | 'issueLinks'
  | 'committer'
  | 'committedDate'
  | 'signature'
  | 'notes'
  | 'filesChanged'
  | 'lineStats'
  | 'timeSince'

export type TimelineColumnVisibility = Record<TimelineColumnId, boolean>

export const TIMELINE_COLUMN_ORDER: TimelineColumnId[] = [
  'branchTag',
  'graph',
  'hash',
  'author',
  'authorEmail',
  'authoredDate',
  'parents',
  'refs',
  'message',
  'bodyPreview',
  'issueLinks',
  'committer',
  'committedDate',
  'signature',
  'notes',
  'filesChanged',
  'lineStats',
  'timeSince'
]

export const TIMELINE_COLUMN_WIDTHS: Partial<Record<TimelineColumnId, number>> = {
  hash: 72,
  author: 120,
  authorEmail: 160,
  authoredDate: 128,
  parents: 72,
  refs: 140,
  bodyPreview: 200,
  issueLinks: 112,
  committer: 120,
  committedDate: 128,
  signature: 80,
  notes: 120,
  filesChanged: 56,
  lineStats: 80,
  timeSince: 88
}

export const DEFAULT_TIMELINE_COLUMN_VISIBILITY: TimelineColumnVisibility = {
  branchTag: true,
  graph: true,
  message: true,
  timeSince: true,
  hash: false,
  author: false,
  authorEmail: false,
  authoredDate: false,
  parents: false,
  refs: false,
  bodyPreview: false,
  issueLinks: false,
  committer: false,
  committedDate: false,
  signature: false,
  notes: false,
  filesChanged: false,
  lineStats: false
}

const STORAGE_KEY = 'gitfreddo.timeline.columnVisibility'

const COLUMN_LABELS: Record<TimelineColumnId, string> = {
  branchTag: 'Branch / Tag',
  graph: 'Graph',
  hash: 'Hash',
  author: 'Author',
  authorEmail: 'Author email',
  authoredDate: 'Authored date',
  parents: 'Parents',
  refs: 'Refs',
  message: 'Commit message',
  bodyPreview: 'Body preview',
  issueLinks: 'Issue / PR links',
  committer: 'Committer',
  committedDate: 'Committed date',
  signature: 'Signature',
  notes: 'Notes',
  filesChanged: 'Files changed',
  lineStats: '+/- lines',
  timeSince: 'Time since'
}

const MENU_GROUPS: TimelineColumnId[][] = [
  ['branchTag', 'graph'],
  ['hash', 'author', 'authorEmail', 'authoredDate', 'parents', 'refs'],
  ['message', 'bodyPreview', 'issueLinks'],
  ['committer', 'committedDate', 'signature', 'notes'],
  ['filesChanged', 'lineStats', 'timeSince']
]

export const TIMELINE_COLUMN_IDS = TIMELINE_COLUMN_ORDER

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

export function timelineColumnLabel(id: TimelineColumnId): string {
  return COLUMN_LABELS[id]
}

export function hasVisibleColumnAfter(
  visibility: TimelineColumnVisibility,
  columnId: TimelineColumnId
): boolean {
  const index = TIMELINE_COLUMN_ORDER.indexOf(columnId)
  return TIMELINE_COLUMN_ORDER.slice(index + 1).some((id) => visibility[id])
}

export function timelineHeaderContextMenuItems(
  visibility: TimelineColumnVisibility,
  onToggle: (column: TimelineColumnId) => void
): ContextMenuItem[] {
  const visibleCount = countVisibleColumns(visibility)
  const items: ContextMenuItem[] = []

  for (const [groupIndex, group] of MENU_GROUPS.entries()) {
    if (groupIndex > 0) {
      items.push({ id: `sep-${groupIndex}`, label: '', separator: true, onClick: () => {} })
    }

    for (const id of group) {
      items.push({
        id,
        label: COLUMN_LABELS[id],
        checked: visibility[id],
        disabled: visibility[id] && visibleCount <= 1,
        onClick: () => onToggle(id)
      })
    }
  }

  return items
}
