/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { AddSubmoduleModal } from './AddSubmoduleModal'

describe('AddSubmoduleModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method) => {
      if (method === 'repo.status') {
        return { root: '/tmp/repo', branch: 'main', isClean: true }
      }
      return undefined
    })
    vi.mocked(window.gitfreddo.pickDirectory).mockResolvedValue('/tmp/repo/vendor/lib')
  })

  it('renders dialog', () => {
    renderWithProviders(<AddSubmoduleModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('submits submodule add with optional branch', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderWithProviders(<AddSubmoduleModal open onClose={onClose} />)

    await user.type(screen.getByPlaceholderText('https://github.com/user/repo.git'), 'git@github.com:org/lib.git')
    await user.type(screen.getByPlaceholderText('vendor/lib'), 'vendor/lib')
    await user.click(screen.getByRole('button', { name: /set tracking branch/i }))
    await user.type(screen.getByPlaceholderText('main'), 'develop')
    await user.click(screen.getByRole('button', { name: /add submodule/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('submodule.add', {
        url: 'git@github.com:org/lib.git',
        path: 'vendor/lib',
        branch: 'develop'
      })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('fills path from directory picker relative to repo root', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AddSubmoduleModal open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /browse/i }))

    expect(await screen.findByDisplayValue('vendor/lib')).toBeInTheDocument()
  })

  it('shows an error toast when submodule add fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(new Error('already exists'))

    const user = userEvent.setup()
    renderWithProviders(<AddSubmoduleModal open onClose={vi.fn()} />)

    await user.type(screen.getByPlaceholderText('https://github.com/user/repo.git'), 'git@github.com:org/lib.git')
    await user.type(screen.getByPlaceholderText('vendor/lib'), 'vendor/lib')
    await user.click(screen.getByRole('button', { name: /add submodule/i }))

    await waitFor(() => expect(show).toHaveBeenCalledWith('already exists', 'error'))
  })
})
