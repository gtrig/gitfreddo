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
import { AddRemoteModal } from './AddRemoteModal'

const remoteAddMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    remoteAdd: { mutateAsync: remoteAddMutate, isPending: false }
  })
}))

vi.mock('@/components/GitHub/RepoPicker', () => ({
  RepoPicker: ({
    onSelect
  }: {
    onSelect: (repo: { cloneUrl: string; name: string; fullName: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          cloneUrl: 'https://github.com/org/alpha.git',
          name: 'alpha',
          fullName: 'org/alpha'
        })
      }
    >
      Pick GitHub repo
    </button>
  )
}))

vi.mock('@/components/GitHub/CreateGitHubRepoModal', () => ({
  CreateGitHubRepoModal: ({
    open,
    onCreated
  }: {
    open: boolean
    onCreated: (repo: { cloneUrl: string; name: string; fullName: string }) => void | Promise<void>
  }) =>
    open ? (
      <button
        type="button"
        onClick={() =>
          void onCreated({
            cloneUrl: 'https://github.com/org/new-repo.git',
            name: 'new-repo',
            fullName: 'org/new-repo'
          })
        }
      >
        Create GitHub repo
      </button>
    ) : null
}))

describe('AddRemoteModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    remoteAddMutate.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
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
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('adds a remote from name and url fields', async () => {
    const show = vi.fn()
    const onClose = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    renderWithProviders(<AddRemoteModal open onClose={onClose} />)

    await userEvent.type(screen.getByPlaceholderText('origin'), 'upstream')
    await userEvent.type(
      screen.getByPlaceholderText('https://github.com/user/repo.git'),
      'https://example.com/up.git'
    )
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'upstream',
        url: 'https://example.com/up.git'
      })
    })
    expect(show).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('fills fields from GitHub browse and adds the remote', async () => {
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /browse github/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick github repo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'alpha',
        url: 'https://github.com/org/alpha.git'
      })
    })
  })

  it('creates a GitHub repo and adds it as a remote', async () => {
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create on github/i }))
    await userEvent.click(screen.getByRole('button', { name: /create github repo/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'new-repo',
        url: 'https://github.com/org/new-repo.git'
      })
    })
  })

  it('disables add until both name and url are filled', () => {
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled()
  })
})
