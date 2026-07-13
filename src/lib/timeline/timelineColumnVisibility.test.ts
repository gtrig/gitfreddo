import { describe, expect, it, vi } from 'vitest'
import {
  countVisibleColumns,
  DEFAULT_TIMELINE_COLUMN_VISIBILITY,
  hasVisibleColumnAfter,
  loadTimelineColumnVisibility,
  saveTimelineColumnVisibility,
  timelineColumnLabel,
  timelineHeaderContextMenuItems
} from '@/lib/timeline/timelineColumnVisibility'

describe('timelineColumnVisibility', () => {
  it('defaults core columns to visible and optional columns to hidden', () => {
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.branchTag).toBe(true)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.graph).toBe(true)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.message).toBe(true)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.timeSince).toBe(true)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.author).toBe(false)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.hash).toBe(false)
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY.lineStats).toBe(false)
  })

  it('falls back when every column would be hidden', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      }
    })
    storage.set(
      'gitfredo.timeline.columnVisibility',
      JSON.stringify(Object.fromEntries(
        ['branchTag', 'graph', 'message', 'timeSince', 'hash', 'author'].map((id) => [id, false])
      ))
    )

    expect(loadTimelineColumnVisibility()).toEqual(DEFAULT_TIMELINE_COLUMN_VISIBILITY)
  })

  it('persists visibility to localStorage', () => {
    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      }
    })

    saveTimelineColumnVisibility({
      ...DEFAULT_TIMELINE_COLUMN_VISIBILITY,
      branchTag: false,
      timeSince: false
    })

    const loaded = loadTimelineColumnVisibility()
    expect(loaded.branchTag).toBe(false)
    expect(loaded.graph).toBe(true)
    expect(loaded.message).toBe(true)
    expect(loaded.timeSince).toBe(false)
    expect(loaded.author).toBe(false)
  })

  it('disables hiding the last visible column in the header menu', () => {
    const visibility = {
      ...DEFAULT_TIMELINE_COLUMN_VISIBILITY,
      branchTag: false,
      graph: false,
      message: true,
      timeSince: false
    }
    const items = timelineHeaderContextMenuItems(visibility, () => {})
    expect(items.find((item) => item.id === 'message')?.disabled).toBe(true)
    expect(countVisibleColumns(visibility)).toBe(1)
  })

  it('labels columns and detects trailing visible columns', () => {
    expect(timelineColumnLabel('hash')).toBe('Hash')
    expect(hasVisibleColumnAfter(DEFAULT_TIMELINE_COLUMN_VISIBILITY, 'graph')).toBe(true)
    expect(
      hasVisibleColumnAfter(
        { ...DEFAULT_TIMELINE_COLUMN_VISIBILITY, message: false, timeSince: false },
        'graph'
      )
    ).toBe(false)
  })

  it('returns defaults when localStorage is unavailable or invalid', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(loadTimelineColumnVisibility()).toEqual(DEFAULT_TIMELINE_COLUMN_VISIBILITY)
    expect(() => saveTimelineColumnVisibility(DEFAULT_TIMELINE_COLUMN_VISIBILITY)).not.toThrow()

    const storage = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      }
    })
    storage.set('gitfreddo.timeline.columnVisibility', '{not json')

    expect(loadTimelineColumnVisibility()).toEqual(DEFAULT_TIMELINE_COLUMN_VISIBILITY)
  })

  it('toggles columns from the header menu', () => {
    const toggled: string[] = []
    const items = timelineHeaderContextMenuItems(DEFAULT_TIMELINE_COLUMN_VISIBILITY, (column) => {
      toggled.push(column)
    })
    items.find((item) => item.id === 'author')?.onClick()
    expect(toggled).toEqual(['author'])
  })
})
