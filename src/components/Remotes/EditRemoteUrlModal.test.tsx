/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('saves a trimmed URL and closes; cancel closes without saving', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <EditRemoteUrlModal open remoteName="origin" currentUrl="https://old/repo.git" onClose={onClose} />
    )
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, ' https://new/repo.git ')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'remote.setUrl',
        { name: 'origin', url: 'https://new/repo.git' },
        '/tmp/repo'
      )
    )
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
