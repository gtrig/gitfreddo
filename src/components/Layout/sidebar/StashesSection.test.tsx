/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { StashesSection } from './StashesSection'

describe('StashesSection', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders section content', () => {
    renderWithProviders(<StashesSection stashes={[{ index: 0, hash: "abc", message: "WIP on main", branch: "main" }]} filter="" isLoading={false} error={null} selectedIndex={null} onSelect={vi.fn()} />)
    expect(screen.getByText('WIP on main')).toBeInTheDocument()
  })
})
