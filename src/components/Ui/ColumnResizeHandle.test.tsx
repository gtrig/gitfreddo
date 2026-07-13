/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import { ColumnResizeHandle } from './ColumnResizeHandle'
import { renderWithProviders } from '@/test/render'

describe('ColumnResizeHandle', () => {
  afterEach(() => cleanup())

  it('renders vertical resize separator', () => {
    renderWithProviders(<ColumnResizeHandle onDrag={vi.fn()} />)
    expect(screen.getByRole('separator', { name: /resize/i })).toBeInTheDocument()
  })

  it('reports drag deltas while resizing', () => {
    const onDrag = vi.fn()
    const onResizeStart = vi.fn()
    const onResizeEnd = vi.fn()
    renderWithProviders(
      <ColumnResizeHandle onDrag={onDrag} onResizeStart={onResizeStart} onResizeEnd={onResizeEnd} />
    )

    const handle = screen.getByRole('separator', { name: /resize/i })
    fireEvent.mouseDown(handle, { clientX: 100 })
    expect(onResizeStart).toHaveBeenCalled()

    fireEvent.mouseMove(window, { clientX: 130 })
    expect(onDrag).toHaveBeenCalledWith(30)

    fireEvent.mouseUp(window)
    expect(onResizeEnd).toHaveBeenCalled()
  })
})
