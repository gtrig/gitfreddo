/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarMenuButton } from './SidebarMenuButton'
import { renderWithProviders } from '@/test/render'

describe('SidebarMenuButton', () => {
  afterEach(() => cleanup())
  it('renders more actions menu button', () => {
    renderWithProviders(
      <SidebarMenuButton
        items={[{ id: 'a', label: 'Action', onClick: vi.fn() }]}
        onOpenMenu={vi.fn()}
      />
    )
    expect(screen.getByRole('button', { name: /more actions/i })).toBeInTheDocument()
  })
})
