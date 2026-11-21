import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import { WorkspaceTabs } from './WorkspaceTabs'
import { renderWithProviders } from '@/test/render'
import { useWorkspaceStore, type WorkspaceTab } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

function tab(path: string, connected = true, connecting = false): WorkspaceTab {
  return { path, connected, connecting }
}

describe('WorkspaceTabs', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [tab('/repos/alpha'), tab('/repos/beta'), tab('/repos/gamma')],
      activePath: '/repos/beta',
      workspacePath: '/repos/beta',
      connected: true,
      workspacePickerOpen: false,
      switchWorkspace: vi.fn(async () => undefined),
      closeWorkspace: vi.fn(async () => undefined),
      reorderWorkspaceTabs: useWorkspaceStore.getState().reorderWorkspaceTabs,
      openWorkspaceDialog: vi.fn(async () => undefined)
    })
  })

  it('returns null when there are no tabs', () => {
    useWorkspaceStore.setState({ tabs: [], activePath: null, workspacePath: null, connected: false })
    const { container } = renderWithProviders(<WorkspaceTabs />)
    expect(container.firstChild).toBeNull()
  })

  it('switches workspace when clicking an inactive tab', () => {
    const switchWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ switchWorkspace })
    renderWithProviders(<WorkspaceTabs />)

    fireEvent.click(screen.getByRole('button', { name: 'alpha' }))
    expect(switchWorkspace).toHaveBeenCalledWith('/repos/alpha')
  })

  it('closes a tab from the close button', () => {
    const closeWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ closeWorkspace })
    renderWithProviders(<WorkspaceTabs />)

    fireEvent.click(screen.getByRole('button', { name: /close alpha/i }))
    expect(closeWorkspace).toHaveBeenCalledWith('/repos/alpha')
  })

  it('opens the workspace picker from the plus button', () => {
    const openWorkspaceDialog = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ openWorkspaceDialog })
    renderWithProviders(<WorkspaceTabs />)

    fireEvent.click(screen.getByRole('button', { name: /open workspace/i }))
    expect(openWorkspaceDialog).toHaveBeenCalled()
  })

  it('shows a toast when switching workspaces fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    useWorkspaceStore.setState({
      switchWorkspace: vi.fn(async () => {
        throw new Error('switch failed')
      })
    })
    renderWithProviders(<WorkspaceTabs />)

    fireEvent.click(screen.getByRole('button', { name: 'alpha' }))
    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('switch failed', 'error')
    })
  })

  it('reorders tabs via drag and drop', () => {
    renderWithProviders(<WorkspaceTabs />)

    const alpha = screen.getByRole('button', { name: 'alpha' })
    const gamma = screen.getByRole('button', { name: 'gamma' })
    const dataTransfer = {
      setData: () => undefined,
      getData: () => '/repos/alpha',
      effectAllowed: 'move',
      dropEffect: 'move'
    }

    fireEvent.dragStart(alpha, { dataTransfer })
    fireEvent.dragOver(gamma, { dataTransfer })
    fireEvent.drop(gamma, { dataTransfer })

    expect(useWorkspaceStore.getState().tabs.map((item) => item.path)).toEqual([
      '/repos/beta',
      '/repos/gamma',
      '/repos/alpha'
    ])
  })

  const dataTransfer = (data = '') => ({
    setData: vi.fn(),
    getData: () => data,
    effectAllowed: 'move',
    dropEffect: 'move'
  })

  it('shows a toast when closing a tab fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    useWorkspaceStore.setState({
      closeWorkspace: vi.fn(async () => {
        throw new Error('close failed')
      })
    })
    renderWithProviders(<WorkspaceTabs />)
    fireEvent.click(screen.getAllByRole('button', { name: /close/i })[0]!)
    await waitFor(() => expect(show).toHaveBeenCalledWith('close failed', 'error'))
  })

  it('does not start a drag when there is only one tab', () => {
    useWorkspaceStore.setState({ tabs: [tab('/repos/solo')], activePath: '/repos/solo' })
    renderWithProviders(<WorkspaceTabs />)
    const solo = screen.getByRole('button', { name: 'solo' })
    const transfer = dataTransfer()
    fireEvent.dragStart(solo, { dataTransfer: transfer })
    expect(transfer.setData).not.toHaveBeenCalled()
  })

  it('clears the drop target on drag leave and drag end, and ignores drops on itself', () => {
    renderWithProviders(<WorkspaceTabs />)
    const alpha = screen.getByRole('button', { name: 'alpha' })
    const gamma = screen.getByRole('button', { name: 'gamma' })

    fireEvent.dragStart(alpha, { dataTransfer: dataTransfer('/repos/alpha') })
    fireEvent.dragOver(alpha, { dataTransfer: dataTransfer('/repos/alpha') })
    fireEvent.dragOver(gamma, { dataTransfer: dataTransfer('/repos/alpha') })
    fireEvent.dragOver(gamma, { dataTransfer: dataTransfer('/repos/alpha') })
    fireEvent.dragLeave(gamma)
    fireEvent.dragEnd(alpha)

    fireEvent.dragStart(alpha, { dataTransfer: dataTransfer('/repos/alpha') })
    fireEvent.drop(alpha, { dataTransfer: dataTransfer('/repos/alpha') })
    expect(useWorkspaceStore.getState().tabs.map((item) => item.path)).toEqual([
      '/repos/alpha',
      '/repos/beta',
      '/repos/gamma'
    ])
  })
})

