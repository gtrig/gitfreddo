import { describe, expect, it, vi } from 'vitest'
import {
  countVisibleColumns,
  DEFAULT_TIMELINE_COLUMN_VISIBILITY,
  loadTimelineColumnVisibility,
  saveTimelineColumnVisibility,
  timelineHeaderContextMenuItems
} from './timelineColumnVisibility'

describe('timelineColumnVisibility', () => {
  it('defaults all columns to visible', () => {
    expect(DEFAULT_TIMELINE_COLUMN_VISIBILITY).toEqual({
      branchTag: true,
      graph: true,
      message: true,
      timeSince: true
    })
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
      JSON.stringify({
        branchTag: false,
        graph: false,
        message: false,
        timeSince: false
      })
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
      branchTag: false,
      graph: true,
      message: true,
      timeSince: false
    })

    expect(loadTimelineColumnVisibility()).toEqual({
      branchTag: false,
      graph: true,
      message: true,
      timeSince: false
    })
  })

  it('disables hiding the last visible column in the header menu', () => {
    const visibility = {
      branchTag: false,
      graph: false,
      message: true,
      timeSince: false
    }
    const items = timelineHeaderContextMenuItems(visibility, () => {})
    expect(items.find((item) => item.id === 'message')?.disabled).toBe(true)
    expect(countVisibleColumns(visibility)).toBe(1)
  })
})
