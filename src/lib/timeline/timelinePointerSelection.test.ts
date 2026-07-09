import { describe, expect, it } from 'vitest'
import {
  TIMELINE_DRAG_THRESHOLD_PX,
  clampCommitRowIndex,
  commitIndexFromPointerY,
  hasExceededDragThreshold,
  isPointerOverCommitArea
} from '@/lib/timeline/timelinePointerSelection'

describe('timelinePointerSelection', () => {
  it('clamps row indices to valid bounds', () => {
    expect(clampCommitRowIndex(-1, 10)).toBe(0)
    expect(clampCommitRowIndex(0, 10)).toBe(0)
    expect(clampCommitRowIndex(9, 10)).toBe(9)
    expect(clampCommitRowIndex(12, 10)).toBe(9)
    expect(clampCommitRowIndex(0, 0)).toBe(0)
  })

  it('maps pointer Y relative to the commit-row overlay top', () => {
    const rowHeight = 28
    const areaTop = 200

    expect(
      commitIndexFromPointerY({
        clientY: 200,
        areaTop,
        rowHeight,
        rowCount: 20
      })
    ).toBe(0)

    expect(
      commitIndexFromPointerY({
        clientY: 214,
        areaTop,
        rowHeight,
        rowCount: 20
      })
    ).toBe(0)

    expect(
      commitIndexFromPointerY({
        clientY: 228,
        areaTop,
        rowHeight,
        rowCount: 20
      })
    ).toBe(1)
  })

  it('clamps pointer Y mapping at list edges', () => {
    expect(
      commitIndexFromPointerY({
        clientY: 0,
        areaTop: 100,
        rowHeight: 28,
        rowCount: 3
      })
    ).toBe(0)

    expect(
      commitIndexFromPointerY({
        clientY: 999,
        areaTop: 100,
        rowHeight: 28,
        rowCount: 3
      })
    ).toBe(2)
  })

  it('detects whether a pointer is inside the commit-row area', () => {
    expect(isPointerOverCommitArea(150, 100, 84)).toBe(true)
    expect(isPointerOverCommitArea(99, 100, 84)).toBe(false)
    expect(isPointerOverCommitArea(184, 100, 84)).toBe(false)
  })

  it('detects drag threshold crossings', () => {
    expect(hasExceededDragThreshold(10, 13, TIMELINE_DRAG_THRESHOLD_PX)).toBe(false)
    expect(hasExceededDragThreshold(10, 14, TIMELINE_DRAG_THRESHOLD_PX)).toBe(true)
    expect(hasExceededDragThreshold(10, 6, TIMELINE_DRAG_THRESHOLD_PX)).toBe(true)
  })
})
