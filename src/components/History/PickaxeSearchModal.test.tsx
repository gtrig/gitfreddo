/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { PickaxeSearchModal } from './PickaxeSearchModal'

describe('PickaxeSearchModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({ timelineSelection: null })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders dialog', () => {
    renderWithProviders(<PickaxeSearchModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('searches commits and selects a result', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method) => {
      if (method === 'log.pickaxe') {
        return [
          {
            hash: 'abc123',
            shortHash: 'abc123',
            subject: 'Fix parser',
            author: { name: 'Dev', email: 'dev@test.com', date: '2026-01-01T00:00:00Z' }
          }
        ]
      }
      return undefined
    })

    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<PickaxeSearchModal open onClose={onClose} />)

    await user.type(screen.getByRole('textbox'), 'parser')
    await user.click(screen.getByRole('button', { name: /search/i }))

    await waitFor(() => expect(screen.getByText('Fix parser')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /Fix parser/i }))

    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: 'abc123'
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('shows error state when search fails', async () => {
    vi.mocked(window.gitfreddo.invoke).mockRejectedValueOnce(new Error('regex invalid'))
    const user = userEvent.setup()
    renderWithProviders(<PickaxeSearchModal open onClose={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'bad')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(await screen.findByText(/regex invalid/i)).toBeInTheDocument()
  })

  it('shows empty state when no commits match', async () => {
    vi.mocked(window.gitfreddo.invoke).mockResolvedValueOnce([])
    const user = userEvent.setup()
    renderWithProviders(<PickaxeSearchModal open onClose={vi.fn()} />)

    await user.type(screen.getByRole('textbox'), 'missing')
    await user.click(screen.getByRole('button', { name: /search/i }))
    expect(await screen.findByText(/No matching commits/i)).toBeInTheDocument()
  })
})
