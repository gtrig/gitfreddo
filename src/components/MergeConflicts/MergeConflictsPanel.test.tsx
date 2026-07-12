/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MergeConflictsPanel } from './MergeConflictsPanel'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }

vi.mock('@/hooks/useGit', () => ({
  useMergeStatus: vi.fn(() => ({
    data: {
      inProgress: true,
      kind: 'merge',
      conflictedPaths: ['file.txt', 'other.txt'],
      incomingLabel: 'feature',
      currentBranch: 'main',
      mergeMessage: "Merge branch 'feature'"
    },
    isLoading: false,
    error: null
  })),
  useWorkingStatus: vi.fn(() => ({
    data: { staged: [], unstaged: [], untracked: [], conflicted: [{ path: 'file.txt' }] }
  }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    mergeAbort: mutation,
    mergeContinue: mutation,
    rebaseContinue: mutation,
    rebaseAbort: mutation,
    rebaseSkip: mutation,
    cherryPickContinue: mutation,
    cherryPickAbort: mutation,
    cherryPickSkip: mutation,
    stageAdd: mutation
  })
}))

vi.mock('@/hooks/useAiFill', () => ({
  useAiFill: () => ({ mutateAsync: vi.fn(), isPending: false })
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: () => true
}))

vi.mock('@/hooks/useInvalidateGit', () => ({
  useInvalidateGit: () => vi.fn()
}))

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    options: { count },
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn(),
    scrollToIndex: vi.fn()
  }))
}))

describe('MergeConflictsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(async () => {
    mutation.mutateAsync.mockClear()
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'merge',
        conflictedPaths: ['file.txt', 'other.txt'],
        incomingLabel: 'feature',
        currentBranch: 'main',
        mergeMessage: "Merge branch 'feature'"
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: { staged: [], unstaged: [], untracked: [], conflicted: [{ path: 'file.txt' }] }
    } as unknown as ReturnType<typeof git.useWorkingStatus>)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    useSelectionStore.setState({ selectedConflictFile: null })
  })

  it('renders conflict file list', () => {
    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText('file.txt')).toBeInTheDocument()
    expect(screen.getByText('other.txt')).toBeInTheDocument()
  })

  it('selects a conflict file when clicked', async () => {
    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByText('file.txt'))
    expect(useSelectionStore.getState().selectedConflictFile).toBe('file.txt')
  })

  it('aborts the merge from the footer actions', async () => {
    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /abort merge/i }))
    expect(mutation.mutateAsync).toHaveBeenCalled()
  })

  it('shows rebase operation title when merge status is rebase', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'rebase',
        conflictedPaths: ['src/app.ts'],
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText('Rebase in progress')).toBeInTheDocument()
  })

  it('toggles between tree and path views', async () => {
    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    expect(screen.getByRole('button', { name: /^path$/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    expect(screen.getByRole('button', { name: /^tree$/i })).toBeInTheDocument()
  })

  it('stages all conflicted files when markers are resolved', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') {
        return { content: 'resolved content without markers' }
      }
      return undefined
    })

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /mark all resolved/i }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ paths: ['file.txt', 'other.txt'] })
  })

  it('shows resolved files when staged paths no longer conflict', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: {
        staged: [{ path: 'resolved.txt' }],
        unstaged: [],
        untracked: [],
        conflicted: [{ path: 'file.txt' }]
      }
    } as unknown as ReturnType<typeof git.useWorkingStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText('resolved.txt')).toBeInTheDocument()
  })

  it('shows prompt when no merge is in progress', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/no merge operation in progress/i)).toBeInTheDocument()
  })

  it('shows cherry-pick title for cherry-pick conflicts', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'cherry-pick',
        conflictedPaths: ['pick.txt'],
        incomingLabel: 'abc1234',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/cherry-pick in progress/i)).toBeInTheDocument()
  })

  it('prompts to open a repository when disconnected', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/open a repository/i)).toBeInTheDocument()
  })
})
