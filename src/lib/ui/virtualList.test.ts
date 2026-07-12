import { describe, expect, it } from 'vitest'
import {
  shouldVirtualize,
  VIRTUALIZE_THRESHOLD,
  CODE_LINE_HEIGHT,
  COMPACT_ROW_HEIGHT,
  FILE_ROW_HEIGHT
} from './virtualList'

describe('shouldVirtualize', () => {
  it('returns false below the threshold', () => {
    expect(shouldVirtualize(0)).toBe(false)
    expect(shouldVirtualize(1)).toBe(false)
    expect(shouldVirtualize(VIRTUALIZE_THRESHOLD - 1)).toBe(false)
  })

  it('returns true at the threshold', () => {
    expect(shouldVirtualize(VIRTUALIZE_THRESHOLD)).toBe(true)
  })

  it('returns true above the threshold', () => {
    expect(shouldVirtualize(VIRTUALIZE_THRESHOLD + 1)).toBe(true)
    expect(shouldVirtualize(10_000)).toBe(true)
  })
})

describe('constants', () => {
  it('CODE_LINE_HEIGHT matches Tailwind leading-5', () => {
    expect(CODE_LINE_HEIGHT).toBe(20)
  })

  it('COMPACT_ROW_HEIGHT is between code line and file row', () => {
    expect(COMPACT_ROW_HEIGHT).toBeGreaterThan(CODE_LINE_HEIGHT)
    expect(COMPACT_ROW_HEIGHT).toBeLessThan(FILE_ROW_HEIGHT)
  })
})
