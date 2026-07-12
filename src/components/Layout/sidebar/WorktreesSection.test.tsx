/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { copyToClipboard } from '@/lib/clipboard'
import { WorktreesSection } from './WorktreesSection'
import type { GitWorktreeEntry } from '@/lib/types'

const worktreeRemoveMutate = vi.fn(async () => undefined)
const worktreePruneMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    worktreeRemove: { mutateAsync: worktreeRemoveMutate, isPending: false },
    worktreePrune: { mutateAsync: worktreePruneMutate, isPending: false }
  })
}))

vi.mock('@/lib/clipboard', () => ({
  copyToClipboard: vi.fn(async () => undefined)
}))

vi.mock('@/components/Worktrees/AddWorktreeModal', () => ({
  AddWorktreeModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="add-worktree-modal" /> : null
}))

const mainWorktree: GitWorktreeEntry = {
  path: '/tmp/repo',
  head: 'abc123',
  branch: 'main',
  isMain: true,
  isBare: false,
  isDetached: false
}

const featureWorktree: GitWorktreeEntry = {
  path: '/tmp/repo-feature',
  head: 'def456',
  branch: 'feature',
  isMain: false,
  isBare: false,
  isDetached: false
}

describe('WorktreesSection', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    worktreeRemoveMutate.mockResolvedValue(undefined)
    worktreePruneMutate.mockResolvedValue(undefined)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      openWorkspace: vi.fn(async () => undefined),
      switchWorkspace: vi.fn(async () => undefined),
      closeWorkspace: vi.fn(async () => undefined)
    })
    window.gitfreddo = createGitFreddoMock({
      normalizeRepoPath: vi.fn(async (path: string) => path)
    })
  })

  it('renders worktree rows with branch labels', () => {
    renderWithProviders(
      <WorktreesSection
        worktrees={[mainWorktree, featureWorktree]}
        filter=""
        isLoading={false}
        error={null}
      />
    )
    expect(screen.getByRole('button', { name: /^main$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^feature$/i })).toBeInTheDocument()
  })

  it('shows loading, error, and empty states', () => {
    const { rerender } = renderWithProviders(
      <WorktreesSection worktrees={[]} filter="" isLoading error={null} />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <WorktreesSection
        worktrees={[]}
        filter=""
        isLoading={false}
        error={new Error('Worktree load failed')}
      />
    )
    expect(screen.getByText('Worktree load failed')).toBeInTheDocument()

    rerender(
      <WorktreesSection worktrees={[]} filter="" isLoading={false} error={null} />
    )
    expect(screen.getByText(/no worktrees/i)).toBeInTheDocument()
  })

  it('filters worktrees by branch name or path', () => {
    renderWithProviders(
      <WorktreesSection
        worktrees={[mainWorktree, featureWorktree]}
        filter="feature"
        isLoading={false}
        error={null}
      />
    )
    expect(screen.getByText('feature')).toBeInTheDocument()
    expect(screen.queryByText(/^main$/i)).not.toBeInTheDocument()
  })

  it('shows main badge for the primary worktree', () => {
    renderWithProviders(
      <WorktreesSection worktrees={[mainWorktree]} filter="" isLoading={false} error={null} />
    )
    expect(screen.getByRole('button', { name: /^main$/i })).toBeInTheDocument()
    expect(screen.getByText(/^main$/i, { selector: 'span' })).toBeInTheDocument()
  })

  it('opens add worktree modal from the section header', async () => {
    renderWithProviders(
      <WorktreesSection worktrees={[mainWorktree]} filter="" isLoading={false} error={null} />
    )
    await userEvent.click(screen.getByRole('button', { name: /add worktree/i }))
    expect(screen.getByTestId('add-worktree-modal')).toBeInTheDocument()
  })

  it('opens an existing tab when clicking a worktree row', async () => {
    useWorkspaceStore.setState({
      tabs: [
        { path: '/tmp/repo', connected: true, connecting: false },
        { path: '/tmp/repo-feature', connected: true, connecting: false }
      ],
      switchWorkspace: vi.fn(async () => undefined)
    })

    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByRole('button', { name: /feature/i }))
    await waitFor(() => {
      expect(useWorkspaceStore.getState().switchWorkspace).toHaveBeenCalledWith('/tmp/repo-feature')
    })
  })

  it('opens a new workspace tab when the worktree is not already open', async () => {
    const openWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ openWorkspace })

    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByRole('button', { name: /feature/i }))
    await waitFor(() => {
      expect(openWorkspace).toHaveBeenCalledWith('/tmp/repo-feature')
    })
  })

  it('copies the worktree path from the context menu', async () => {
    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /copy path/i }))
    expect(copyToClipboard).toHaveBeenCalledWith('/tmp/repo-feature')
  })

  it('removes a worktree after confirmation', async () => {
    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /remove worktree/i }))
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(worktreeRemoveMutate).toHaveBeenCalledWith({
        path: '/tmp/repo-feature',
        force: false
      })
    })
  })

  it('prompts for force remove when the worktree has uncommitted changes', async () => {
    worktreeRemoveMutate.mockRejectedValueOnce(
      new Error('worktree contains modified or untracked files')
    )

    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /remove worktree/i }))
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }))

    expect(await screen.findByText(/force remove worktree/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /force remove/i }))
    expect(worktreeRemoveMutate).toHaveBeenLastCalledWith({
      path: '/tmp/repo-feature',
      force: true
    })
  })

  it('closes an open tab after removing its worktree', async () => {
    const closeWorkspace = vi.fn(async () => undefined)
    useWorkspaceStore.setState({
      tabs: [
        { path: '/tmp/repo', connected: true, connecting: false },
        { path: '/tmp/repo-feature', connected: true, connecting: false }
      ],
      closeWorkspace
    })

    renderWithProviders(
      <WorktreesSection worktrees={[featureWorktree]} filter="" isLoading={false} error={null} />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /remove worktree/i }))
    await userEvent.click(screen.getByRole('button', { name: /^remove$/i }))

    await waitFor(() => {
      expect(closeWorkspace).toHaveBeenCalledWith('/tmp/repo-feature')
    })
  })

  it('prunes stale worktrees from the section menu', async () => {
    renderWithProviders(
      <WorktreesSection worktrees={[mainWorktree]} filter="" isLoading={false} error={null} />
    )

    await userEvent.click(screen.getByRole('button', { name: /worktrees actions/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /prune stale worktrees/i }))
    expect(worktreePruneMutate).toHaveBeenCalledWith(undefined)
  })
})
