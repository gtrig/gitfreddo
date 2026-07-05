import { describe, expect, it } from 'vitest'
import { timelineVisibleIndexRange } from './timelineVirtualWindow'

describe('timelineVisibleIndexRange', () => {
  it('returns a bounded window for scroll position', () => {
    const { start, end } = timelineVisibleIndexRange(280, 400, 28, 56, 100, 2)
    expect(start).toBe(6)
    expect(end).toBeGreaterThan(start)
    expect(end).toBeLessThanOrEqual(100)
  })

  it('accounts for prefix rows above the virtual list', () => {
    expect(timelineVisibleIndexRange(56, 400, 28, 56, 50, 0).start).toBe(0)
    expect(timelineVisibleIndexRange(56, 400, 28, 0, 50, 0).start).toBe(2)
  })
})
