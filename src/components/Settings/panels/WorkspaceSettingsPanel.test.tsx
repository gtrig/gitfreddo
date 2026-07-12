/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceSettingsPanel } from './WorkspaceSettingsPanel'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const showToast = vi.fn()

describe('WorkspaceSettingsPanel', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.list') {
        return {
          'user.name': 'Test User',
          'user.email': 'test@example.com',
          'commit.gpgsign': 'false',
          'pull.rebase': 'false',
          'init.defaultBranch': 'main'
        }
      }
      if (method === 'config.set') return undefined
      return undefined
    })
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
  })

  it('prompts to connect a repository when no workspace is open', () => {
    renderWithProviders(<WorkspaceSettingsPanel />)

    expect(
      screen.getByText('Open a repository to manage workspace settings.')
    ).toBeInTheDocument()
  })

  it('loads and displays local repo config fields', async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })

    renderWithProviders(<WorkspaceSettingsPanel />)

    expect(await screen.findByDisplayValue('Test User')).toBeInTheDocument()
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
    expect(screen.getByText('Repository files')).toBeInTheDocument()
    expect(screen.getByText('Git hooks')).toBeInTheDocument()
  })

  it('shows loading state while config is fetched', () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(
      () => new Promise(() => undefined)
    )

    renderWithProviders(<WorkspaceSettingsPanel />)

    expect(screen.getByText(/loading repo config/i)).toBeInTheDocument()
  })

  it('shows an error when config loading fails', async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(new Error('Config unavailable'))

    renderWithProviders(<WorkspaceSettingsPanel />)

    expect(await screen.findByText('Config unavailable')).toBeInTheDocument()
  })

  it('saves a changed config key', async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })

    renderWithProviders(<WorkspaceSettingsPanel />)
    const nameInput = await screen.findByDisplayValue('Test User')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'New Name')

    const saveButtons = screen.getAllByRole('button', { name: /^save$/i })
    await userEvent.click(saveButtons[0]!)

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('config.set', {
        key: 'user.name',
        value: 'New Name',
        scope: 'local'
      })
    })
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/user\.name/i),
      'success'
    )
  })

  it('disables save when the value is unchanged', async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })

    renderWithProviders(<WorkspaceSettingsPanel />)
    await screen.findByDisplayValue('Test User')

    const saveButtons = screen.getAllByRole('button', { name: /^save$/i })
    expect(saveButtons[0]).toBeDisabled()
  })

  it('shows an error toast when saving config fails', async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'config.list') {
        return { 'user.name': 'Test User' }
      }
      if (method === 'config.set') {
        throw new Error('Write denied')
      }
      return undefined
    })

    renderWithProviders(<WorkspaceSettingsPanel />)
    const nameInput = await screen.findByDisplayValue('Test User')
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Denied')

    await userEvent.click(screen.getAllByRole('button', { name: /^save$/i })[0]!)

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Write denied', 'error')
    })
  })
})
