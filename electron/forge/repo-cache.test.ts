import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTtlCache } from './repo-cache'

describe('createTtlCache', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stores and returns values within the TTL', () => {
    const cache = createTtlCache<string[]>(5 * 60 * 1000)
    cache.set(['a'])
    expect(cache.get()).toEqual(['a'])
  })

  it('returns null after the TTL expires', () => {
    vi.useFakeTimers()
    const cache = createTtlCache<string[]>(1000)
    cache.set(['a'])
    vi.advanceTimersByTime(1001)
    expect(cache.get()).toBeNull()
  })

  it('clears stored values', () => {
    const cache = createTtlCache<string[]>(5000)
    cache.set(['a'])
    cache.clear()
    expect(cache.get()).toBeNull()
  })
})
