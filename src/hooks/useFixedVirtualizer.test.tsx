/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useFixedVirtualizer } from './useFixedVirtualizer'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn()
  }))
}))

describe('useFixedVirtualizer', () => {
  it('creates a virtualizer with fixed row height', () => {
    const { result } = renderHook(() => useFixedVirtualizer(5, 28))

    expect(result.current.scrollRef.current).toBeNull()
    expect(result.current.virtualizer.getTotalSize()).toBe(5 * 28)
    expect(result.current.virtualizer.getVirtualItems()).toHaveLength(5)
  })

  it('uses an external scroll ref when provided', () => {
    const { result } = renderHook(() => {
      const scrollRef = useRef<HTMLDivElement>(null)
      return { scrollRef, hook: useFixedVirtualizer(2, 20, { scrollRef, overscan: 4 }) }
    })

    expect(result.current.hook.scrollRef).toBe(result.current.scrollRef)
  })
})
