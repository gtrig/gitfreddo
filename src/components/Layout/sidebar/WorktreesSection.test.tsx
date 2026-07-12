/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { WorktreesSection } from './WorktreesSection'

describe('WorktreesSection', () => {
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
    renderWithProviders(<WorktreesSection worktrees={[{ path: "/tmp/wt", head: "abc", branch: "feature", isMain: false, isBare: false, isDetached: false }]} filter="" isLoading={false} error={null} />)
    expect(screen.getByText('feature')).toBeInTheDocument()
  })
})
