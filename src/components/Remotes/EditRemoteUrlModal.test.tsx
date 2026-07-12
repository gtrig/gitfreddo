/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { EditRemoteUrlModal } from './EditRemoteUrlModal'

describe('EditRemoteUrlModal', () => {
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
  it('renders dialog', () => {
    renderWithProviders(<EditRemoteUrlModal open remoteName="origin" currentUrl="https://example.com/repo.git" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
