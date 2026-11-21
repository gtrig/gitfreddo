/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToastStore } from '@/stores/toast'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { EditSubmoduleUrlModal } from './EditSubmoduleUrlModal'

describe('EditSubmoduleUrlModal', () => {
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
    renderWithProviders(<EditSubmoduleUrlModal open submodulePath="vendor/lib" currentUrl="https://example.com/lib.git" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('saves the URL, syncs the submodule and confirms', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    const onClose = vi.fn()
    renderWithProviders(
      <EditSubmoduleUrlModal open submodulePath="vendor/lib" currentUrl="https://old/lib.git" onClose={onClose} />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, ' https://new/lib.git ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'submodule.setUrl',
        { path: 'vendor/lib', url: 'https://new/lib.git' },
        '/tmp/repo'
      )
    )
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('submodule.sync', { paths: ['vendor/lib'] }, '/tmp/repo')
    )
    await waitFor(() => expect(show).toHaveBeenCalledWith(expect.any(String), 'success'))
    expect(onClose).toHaveBeenCalled()
  })

  it('skips the sync when unticked and reports failures', async () => {
    const show = vi.fn()
    useToastStore.setState({ show })
    vi.mocked(window.gitfreddo.invoke).mockRejectedValueOnce(new Error('no such submodule'))
    renderWithProviders(
      <EditSubmoduleUrlModal open submodulePath="vendor/lib" currentUrl="https://old/lib.git" onClose={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(show).toHaveBeenCalledWith('no such submodule', 'error'))
    expect(window.gitfreddo.invoke).not.toHaveBeenCalledWith('submodule.sync', expect.anything(), expect.anything())
  })

  it('cancels without saving', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <EditSubmoduleUrlModal open submodulePath="vendor/lib" currentUrl="https://old/lib.git" onClose={onClose} />
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalled()
  })
})
