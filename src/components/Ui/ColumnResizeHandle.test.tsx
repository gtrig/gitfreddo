/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { ColumnResizeHandle } from './ColumnResizeHandle'
import { renderWithProviders } from '@/test/render'

describe('ColumnResizeHandle', () => {
  afterEach(() => cleanup())
  it('renders vertical resize separator', () => {
    renderWithProviders(<ColumnResizeHandle onDrag={vi.fn()} />)
    expect(screen.getByRole('separator', { name: /resize/i })).toBeInTheDocument()
  })
})
