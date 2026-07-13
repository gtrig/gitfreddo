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
import { AddWorktreeModal } from './AddWorktreeModal'

const mockBranches = [
  { name: 'main', isCurrent: true, isRemote: false, head: 'abc', ahead: 0, behind: 0 },
  { name: 'feature', isCurrent: false, isRemote: false, head: 'def', ahead: 0, behind: 0 }
]

const worktreeAddMutate = vi.fn(async () => '/tmp/repo-feature')

vi.mock('@/hooks/useGit', () => ({
  useRepoStatus: vi.fn(() => ({
    data: { root: '/tmp/repo', branch: 'main' },
    isLoading: false,
    error: null
  })),
  useBranches: vi.fn(() => ({
    data: mockBranches,
    isLoading: false,
    error: null
  }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    worktreeAdd: { mutateAsync: worktreeAddMutate, isPending: false }
  })
}))

describe('AddWorktreeModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      openWorkspace: vi.fn(async () => undefined)
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders dialog', () => {
    renderWithProviders(<AddWorktreeModal open onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('pre-selects initial branch and lists local branches', async () => {
    renderWithProviders(
      <AddWorktreeModal open initialBranch="feature" onClose={vi.fn()} />
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox')).toHaveValue('feature')
    })
    expect(screen.getByRole('option', { name: /main/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /feature/i })).toBeInTheDocument()
  })

  it('submits an existing-branch worktree and opens the workspace', async () => {
    const onClose = vi.fn()
    const openWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ openWorkspace })

    renderWithProviders(
      <AddWorktreeModal open initialBranch="feature" onClose={onClose} />
    )

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('feature'))
    await userEvent.click(screen.getByRole('button', { name: /add worktree/i }))

    await waitFor(() => {
      expect(worktreeAddMutate).toHaveBeenCalledWith({
        branch: 'feature',
        detach: false,
        path: '/tmp/feature'
      })
    })
    expect(openWorkspace).toHaveBeenCalledWith('/tmp/repo-feature')
    expect(onClose).toHaveBeenCalled()
  })

  it('submits a new-branch worktree when that mode is selected', async () => {
    renderWithProviders(<AddWorktreeModal open onClose={vi.fn()} />)

    await userEvent.click(screen.getByLabelText(/new branch/i))
    const branchInput = screen.getByPlaceholderText('feature/my-branch')
    await userEvent.clear(branchInput)
    await userEvent.type(branchInput, 'topic/worktree')
    await userEvent.click(screen.getByRole('button', { name: /add worktree/i }))

    await waitFor(() => {
      expect(worktreeAddMutate).toHaveBeenCalledWith(
        expect.objectContaining({ newBranch: 'topic/worktree' })
      )
    })
  })

  it('fills the path from the directory picker', async () => {
    vi.mocked(window.gitfreddo.pickDirectory).mockResolvedValue('/picked/worktree-path')
    renderWithProviders(<AddWorktreeModal open initialBranch="feature" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('feature'))
    await userEvent.click(screen.getByRole('button', { name: /browse/i }))

    await waitFor(() => {
      expect(window.gitfreddo.pickDirectory).toHaveBeenCalled()
    })
    expect(screen.getByDisplayValue('/picked/worktree-path')).toBeInTheDocument()
  })

  it('submits a detached worktree from advanced options', async () => {
    renderWithProviders(<AddWorktreeModal open initialBranch="feature" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('feature'))
    await userEvent.click(screen.getByRole('button', { name: /show advanced/i }))
    await userEvent.click(screen.getByLabelText(/detached head/i))
    await userEvent.click(screen.getByRole('button', { name: /add worktree/i }))

    await waitFor(() => {
      expect(worktreeAddMutate).toHaveBeenCalledWith(
        expect.objectContaining({ branch: 'feature', detach: true })
      )
    })
  })

  it('shows commit context when creating from a specific commit', () => {
    renderWithProviders(
      <AddWorktreeModal
        open
        initialCommit="abc1234567890abcdef1234567890abcdef123456"
        initialCommitShort="abc1234"
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText('abc1234')).toBeInTheDocument()
  })

  it('shows an error toast when worktree creation fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    worktreeAddMutate.mockRejectedValueOnce(new Error('path already exists'))
    renderWithProviders(<AddWorktreeModal open initialBranch="feature" onClose={vi.fn()} />)

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('feature'))
    await userEvent.click(screen.getByRole('button', { name: /add worktree/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith('path already exists', 'error')
    })
  })
})
