/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { RowResizeHandle } from './RowResizeHandle'
import { renderWithProviders } from '@/test/render'

describe('RowResizeHandle', () => {
  afterEach(() => cleanup())
  it('reports drag deltas while resizing', () => {
    const onDrag = vi.fn()
    const onResizeStart = vi.fn()
    const onResizeEnd = vi.fn()
    renderWithProviders(
      <RowResizeHandle onDrag={onDrag} onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
    )

    const handle = screen.getByRole('separator', { name: /resize/i })
    fireEvent.mouseDown(handle, { clientY: 100 })
    expect(onResizeStart).toHaveBeenCalled()

    fireEvent.mouseMove(window, { clientY: 70 })
    expect(onDrag).toHaveBeenCalledWith(30)

    fireEvent.mouseUp(window)
    expect(onResizeEnd).toHaveBeenCalled()
  })
})
