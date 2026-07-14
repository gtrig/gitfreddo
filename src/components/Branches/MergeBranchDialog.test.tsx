/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { MergeBranchDialog } from './MergeBranchDialog'

const mergeMutate = vi.fn()
const mergeIntoMutate = vi.fn()

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    merge: { mutateAsync: mergeMutate, isPending: false },
    mergeInto: { mutateAsync: mergeIntoMutate, isPending: false }
  })
}))

vi.mock('@/hooks/useGit', () => ({
  useBranches: vi.fn(() => ({
    data: [{ name: 'main', isCurrent: true, isRemote: false, head: 'abc', ahead: 0, behind: 0 }]
  }))
}))

describe('MergeBranchDialog', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    mergeMutate.mockReset()
    mergeIntoMutate.mockReset()
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    useSelectionStore.setState({
      selectTimelineNode: vi.fn(),
      selectCommitRange: vi.fn(),
      toggleCommitSelection: vi.fn(),
      selectStash: vi.fn()
    })
  })

  it('renders dialog', () => {
    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('merges with no-ff and squash options', async () => {
    mergeMutate.mockResolvedValue({ status: 'completed' })
    const onClose = vi.fn()
    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={onClose} />)

    await userEvent.click(screen.getByLabelText(/create merge commit/i))
    await userEvent.click(screen.getByLabelText(/squash merge/i))
    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    await waitFor(() => {
      expect(mergeMutate).toHaveBeenCalledWith({ branch: 'feature', noFf: true, squash: true })
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('merges the current branch into the target via mergeInto when a target is given', async () => {
    mergeIntoMutate.mockResolvedValue({ status: 'completed' })
    const onClose = vi.fn()
    // current branch is "main"; merging main into feature is the reverse direction.
    renderWithProviders(
      <MergeBranchDialog sourceBranch="main" targetBranch="feature" onClose={onClose} />
    )

    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    await waitFor(() => {
      expect(mergeIntoMutate).toHaveBeenCalledWith({
        sourceBranch: 'main',
        targetBranch: 'feature',
        noFf: false,
        squash: false
      })
    })
    expect(mergeMutate).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows success toast when merge completes cleanly', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    mergeMutate.mockResolvedValue({ status: 'completed' })

    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith(expect.stringMatching(/merge/i), 'success')
    })
  })

  it('routes to merge conflicts when git reports conflicted paths', async () => {
    const show = vi.fn()
    const selectTimelineNode = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    useSelectionStore.setState({
      selectTimelineNode,
      selectCommitRange: vi.fn(),
      toggleCommitSelection: vi.fn(),
      selectStash: vi.fn()
    })
    mergeMutate.mockResolvedValue({
      status: 'conflicts',
      conflictedPaths: ['src/a.ts', 'src/b.ts']
    })

    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith(expect.stringMatching(/2/i), 'info')
      expect(selectTimelineNode).toHaveBeenCalledWith('merge', 'conflicts')
    })
  })

  it('shows conflict toast for a single file', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    mergeMutate.mockResolvedValue({
      status: 'conflicts',
      conflictedPaths: ['README.md']
    })

    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    await waitFor(() => {
      expect(show).toHaveBeenCalledWith(expect.stringContaining('README.md'), 'info')
    })
  })

  it('shows inline error when merge fails', async () => {
    mergeMutate.mockRejectedValue(new Error('merge blocked'))

    renderWithProviders(<MergeBranchDialog sourceBranch="feature" onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /^merge$/i }))

    expect(await screen.findByText('merge blocked')).toBeInTheDocument()
  })
})
