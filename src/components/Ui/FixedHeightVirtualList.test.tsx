/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, afterEach, beforeEach, vi } from 'vitest'
import { cleanup, render, screen, act } from '@testing-library/react'
import { FixedHeightVirtualList } from './FixedHeightVirtualList'

// ResizeObserver is globally mocked in src/test/setup.ts to fire immediately with
// a 500px-tall viewport, so virtualized lists render their windowed items here.

describe('FixedHeightVirtualList', () => {
  const ITEM_HEIGHT = 20

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(async () => {
    await act(async () => {
      vi.runOnlyPendingTimers()
    })
    cleanup()
    vi.useRealTimers()
  })

  it('renders a bounded subset of items for a large list', async () => {
    const items = Array.from({ length: 200 }, (_, i) => `item-${i}`)
    await act(async () => {
      render(
        <FixedHeightVirtualList
          items={items}
          estimateSize={ITEM_HEIGHT}
          renderItem={(item) => <div data-testid="row">{item}</div>}
        />
      )
      vi.runOnlyPendingTimers()
    })
    const rows = screen.getAllByTestId('row')
    // viewport 500 / 20px rows = 25 visible + 2*8 overscan = ~41 max, certainly < 200
    expect(rows.length).toBeLessThan(200)
    expect(rows.length).toBeGreaterThan(0)
  })

  it('renders all items when the list is small', async () => {
    const items = Array.from({ length: 5 }, (_, i) => `item-${i}`)
    await act(async () => {
      render(
        <FixedHeightVirtualList
          items={items}
          estimateSize={ITEM_HEIGHT}
          renderItem={(item) => <div data-testid="row">{item}</div>}
        />
      )
      vi.runOnlyPendingTimers()
    })
    expect(screen.getAllByTestId('row')).toHaveLength(5)
  })

  it('calls onScroll when the container scrolls', async () => {
    const onScroll = vi.fn()
    const items = Array.from({ length: 10 }, (_, i) => `item-${i}`)
    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <FixedHeightVirtualList
          items={items}
          estimateSize={ITEM_HEIGHT}
          renderItem={(item) => <div>{item}</div>}
          onScroll={onScroll}
        />
      )
      container = result.container
      vi.runOnlyPendingTimers()
    })
    const scrollEl = container.firstElementChild as HTMLElement
    Object.defineProperty(scrollEl, 'scrollTop', { configurable: true, get: () => 40 })
    scrollEl.dispatchEvent(new Event('scroll', { bubbles: true }))
    expect(onScroll).toHaveBeenCalledWith(40)
  })

  it('applies className to the scroll container', async () => {
    let container!: HTMLElement
    await act(async () => {
      const result = render(
        <FixedHeightVirtualList
          items={['a']}
          estimateSize={ITEM_HEIGHT}
          renderItem={(item) => <div>{item}</div>}
          className="custom-class"
        />
      )
      container = result.container
      vi.runOnlyPendingTimers()
    })
    expect(container.firstElementChild).toHaveClass('custom-class')
  })

  it('renders nothing for an empty list', async () => {
    await act(async () => {
      render(
        <FixedHeightVirtualList
          items={[]}
          estimateSize={ITEM_HEIGHT}
          renderItem={(item) => <div>{item}</div>}
        />
      )
      vi.runOnlyPendingTimers()
    })
    expect(screen.queryByTestId('row')).toBeNull()
  })
})
