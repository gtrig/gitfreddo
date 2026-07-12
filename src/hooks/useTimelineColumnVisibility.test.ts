/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTimelineColumnVisibility } from './useTimelineColumnVisibility'
import {
  loadTimelineColumnVisibility
} from '@/lib/timeline/timelineColumnVisibility'

describe('useTimelineColumnVisibility', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads persisted visibility on mount', () => {
    const { result } = renderHook(() => useTimelineColumnVisibility())
    expect(result.current.visibility).toEqual(loadTimelineColumnVisibility())
  })

  it('toggles a column and persists the change', () => {
    const { result } = renderHook(() => useTimelineColumnVisibility())
    const before = result.current.visibility.hash

    act(() => {
      result.current.toggleColumn('hash')
    })

    expect(result.current.visibility.hash).toBe(!before)
    expect(loadTimelineColumnVisibility().hash).toBe(!before)
  })

  it('does not hide the last visible column', () => {
    const { result } = renderHook(() => useTimelineColumnVisibility())

    act(() => {
      result.current.toggleColumn('branchTag')
      result.current.toggleColumn('graph')
      result.current.toggleColumn('timeSince')
    })

    expect(result.current.visibility.message).toBe(true)

    act(() => {
      result.current.toggleColumn('message')
    })
    expect(result.current.visibility.message).toBe(true)
  })
})
