/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { RepoSidebar } from './RepoSidebar'

describe('RepoSidebar', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('prompts to open a repository when disconnected', () => {
    renderWithProviders(<RepoSidebar />)
    expect(screen.getByText(/open a repository/i)).toBeInTheDocument()
  })
})
