/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { DocsModal } from './DocsModal'
import * as docsContent from '@/lib/docs/content'

describe('DocsModal', () => {
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
    renderWithProviders(<DocsModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('loads known initial doc path when opened', () => {
    renderWithProviders(
      <DocsModal open initialPath="getting-started.md" onClose={vi.fn()} />
    )
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('navigates between docs from sidebar selection', async () => {
    renderWithProviders(<DocsModal open onClose={vi.fn()} />)
    const sidebarButtons = screen.getAllByRole('button', { name: /getting started/i })
    await userEvent.click(sidebarButtons[0]!)
    expect(screen.getByRole('article')).toBeInTheDocument()
  })

  it('shows not-found message for unknown doc paths', () => {
    vi.spyOn(docsContent, 'getDocContent').mockReturnValue(null)
    renderWithProviders(<DocsModal open onClose={vi.fn()} />)
    expect(screen.getByText(/page not found/i)).toBeInTheDocument()
    vi.restoreAllMocks()
  })
})
