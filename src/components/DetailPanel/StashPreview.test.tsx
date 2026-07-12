/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { StashPreview } from './StashPreview'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGit', () => ({
  useStashFiles: vi.fn(() => ({
    data: 'M\tREADME.md',
    isLoading: false,
    error: null
  }))
}))

describe('StashPreview', () => {
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

  it('renders stash file list', () => {
    renderWithProviders(
      <StashPreview
        stash={{
          index: 0,
          hash: 'abc1234567890abcdef1234567890abcdef123456',
          message: 'WIP on main',
          branch: 'main'
        }}
      />
    )
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })
})
