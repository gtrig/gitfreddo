/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDynamicVirtualizer } from './useDynamicVirtualizer'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: (index: number) => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(index),
        size: estimateSize(index)
      })),
    getTotalSize: () => Array.from({ length: count }, (_, index) => estimateSize(index)).reduce((a, b) => a + b, 0),
    measureElement: vi.fn()
  }))
}))

describe('useDynamicVirtualizer', () => {
  it('creates a virtualizer with variable row heights', () => {
    const estimateSize = (index: number) => (index % 2 === 0 ? 24 : 40)
    const { result } = renderHook(() => useDynamicVirtualizer(3, estimateSize))

    expect(result.current.virtualizer.getVirtualItems()).toHaveLength(3)
    expect(result.current.virtualizer.getTotalSize()).toBe(24 + 40 + 24)
  })
})
