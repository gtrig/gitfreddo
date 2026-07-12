/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { RowResizeHandle } from './RowResizeHandle'
import { renderWithProviders } from '@/test/render'

describe('RowResizeHandle', () => {
  afterEach(() => cleanup())
  it('renders horizontal resize separator', () => {
    renderWithProviders(<RowResizeHandle onDrag={vi.fn()} />)
    expect(screen.getByRole('separator', { name: /resize/i })).toBeInTheDocument()
  })
})
