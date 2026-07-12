/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { SidebarTreeRow } from './SidebarTreeRow'
import { SidebarIconBranch } from './SidebarIcons'
import { renderWithProviders } from '@/test/render'

describe('SidebarTreeRow', () => {
  afterEach(() => cleanup())
  it('renders row label', () => {
    renderWithProviders(
      <SidebarTreeRow icon={<SidebarIconBranch />} label="main" onClick={vi.fn()} />
    )
    expect(screen.getByRole('button', { name: /main/i })).toBeInTheDocument()
  })
})
