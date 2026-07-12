/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useTimelineColumnSizes } from './useTimelineColumnSizes'
import {
  BRANCH_TAG_WIDTH_MIN,
  loadBranchTagWidth,
  loadGraphLaneWidth
} from '@/lib/graph/graphMetrics'

describe('useTimelineColumnSizes', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns graph metrics derived from stored lane width', () => {
    const { result } = renderHook(() => useTimelineColumnSizes(3))

    expect(result.current.branchTagWidth).toBe(loadBranchTagWidth())
    expect(result.current.graphColumnWidth).toBeGreaterThan(0)
    expect(result.current.metrics.laneWidth).toBe(loadGraphLaneWidth())
    expect(result.current.resizing).toBe(false)
  })

  it('clamps branch tag resize within min and max', () => {
    const { result } = renderHook(() => useTimelineColumnSizes(2))
    const initial = result.current.branchTagWidth

    act(() => {
      result.current.onBranchTagResize(-10_000)
    })
    expect(result.current.branchTagWidth).toBe(BRANCH_TAG_WIDTH_MIN)

    act(() => {
      result.current.onBranchTagResize(10_000)
    })
    expect(result.current.branchTagWidth).toBeGreaterThan(initial)
  })

  it('updates lane width when graph column is resized', () => {
    const { result } = renderHook(() => useTimelineColumnSizes(4))
    const before = result.current.metrics.laneWidth

    act(() => {
      result.current.onGraphLaneResize(24)
    })

    expect(result.current.metrics.laneWidth).not.toBe(before)
    expect(result.current.graphColumnWidth).toBeGreaterThan(0)
  })

  it('tracks resizing state', () => {
    const { result } = renderHook(() => useTimelineColumnSizes(1))

    act(() => {
      result.current.setResizing(true)
    })
    expect(result.current.resizing).toBe(true)
  })
})
