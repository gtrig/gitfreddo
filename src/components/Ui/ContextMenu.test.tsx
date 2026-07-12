/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { ContextMenu } from './ContextMenu'
import { renderWithProviders } from '@/test/render'

describe('ContextMenu', () => {
  afterEach(() => cleanup())
  it('renders menu items', () => {
    renderWithProviders(
      <ContextMenu
        x={10}
        y={20}
        items={[{ id: 'copy', label: 'Copy path', onClick: vi.fn() }]}
        onClose={vi.fn()}
      />
    )
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Copy path' })).toBeInTheDocument()
  })
})
