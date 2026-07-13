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
import type { ForgeProvider } from '@/lib/forge/detect'

const remoteAddMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    remoteAdd: { mutateAsync: remoteAddMutate, isPending: false }
  })
}))

const useConnectedForges = vi.fn<() => ForgeProvider[]>(() => ['github'])

vi.mock('@/hooks/useConnectedForges', () => ({
  useConnectedForges: () => useConnectedForges()
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

vi.mock('@/components/Bitbucket/RepoPicker', () => ({
  RepoPicker: ({
    onSelect
  }: {
    onSelect: (repo: { cloneUrl: string; name: string; fullName: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          cloneUrl: 'https://bitbucket.org/team/beta.git',
          name: 'beta',
          fullName: 'team/beta'
        })
      }
    >
      Pick Bitbucket repo
    </button>
  )
}))

vi.mock('@/components/GitLab/RepoPicker', () => ({
  RepoPicker: ({
    onSelect
  }: {
    onSelect: (repo: { cloneUrl: string; name: string; fullName: string }) => void
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect({
          cloneUrl: 'https://gitlab.com/group/gamma.git',
          name: 'gamma',
          fullName: 'group/gamma'
        })
      }
    >
      Pick GitLab repo
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

vi.mock('@/components/Bitbucket/CreateBitbucketRepoModal', () => ({
  CreateBitbucketRepoModal: ({
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
            cloneUrl: 'https://bitbucket.org/team/new-repo.git',
            name: 'new-repo',
            fullName: 'team/new-repo'
          })
        }
      >
        Create Bitbucket repo
      </button>
    ) : null
}))

vi.mock('@/components/GitLab/CreateGitlabRepoModal', () => ({
  CreateGitlabRepoModal: ({
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
            cloneUrl: 'https://gitlab.com/group/new-repo.git',
            name: 'new-repo',
            fullName: 'group/new-repo'
          })
        }
      >
        Create GitLab repo
      </button>
    ) : null
}))

describe('AddRemoteModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    remoteAddMutate.mockClear()
    useConnectedForges.mockReturnValue(['github'])
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

  it('hides integration actions when no integrations are connected', () => {
    useConnectedForges.mockReturnValue([])
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /browse repositories/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /create on/i })).not.toBeInTheDocument()
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

    await userEvent.click(screen.getByRole('button', { name: /browse repositories/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick github repo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'alpha',
        url: 'https://github.com/org/alpha.git'
      })
    })
  })

  it('fills fields from Bitbucket browse when that integration is connected', async () => {
    useConnectedForges.mockReturnValue(['bitbucket'])
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /browse repositories/i }))
    await userEvent.click(screen.getByRole('button', { name: /pick bitbucket repo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'beta',
        url: 'https://bitbucket.org/team/beta.git'
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

  it('creates a GitLab repo and adds it as a remote', async () => {
    useConnectedForges.mockReturnValue(['gitlab'])
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create on gitlab/i }))
    await userEvent.click(screen.getByRole('button', { name: /create gitlab repo/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'new-repo',
        url: 'https://gitlab.com/group/new-repo.git'
      })
    })
  })

  it('creates a Bitbucket repo and adds it as a remote', async () => {
    useConnectedForges.mockReturnValue(['bitbucket'])
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create on bitbucket/i }))
    await userEvent.click(screen.getByRole('button', { name: /create bitbucket repo/i }))

    await waitFor(() => {
      expect(remoteAddMutate).toHaveBeenCalledWith({
        name: 'new-repo',
        url: 'https://bitbucket.org/team/new-repo.git'
      })
    })
  })

  it('shows provider tabs when multiple integrations are connected', async () => {
    useConnectedForges.mockReturnValue(['github', 'gitlab'])
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /browse repositories/i }))

    expect(screen.getByRole('button', { name: /^github$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^gitlab$/i })).toBeInTheDocument()
  })

  it('disables add until both name and url are filled', () => {
    renderWithProviders(<AddRemoteModal open onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled()
  })
})
