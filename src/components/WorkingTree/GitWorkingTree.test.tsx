/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GitWorkingTree } from './GitWorkingTree'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import type { GitWorkingStatus } from '@/lib/types'

const emptyWorking: GitWorkingStatus = {
  branch: 'main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  untracked: [],
  conflicted: [],
  isClean: true,
  mergeInProgress: false,
  rebaseInProgress: false,
  cherryPickInProgress: false
}

vi.mock('@/components/WorkingTree/CommitPanel', () => ({
  CommitPanel: () => null
}))
vi.mock('@/components/WorkingTree/AnalyzeChangesWithAi', () => ({
  AnalyzeChangesWithAi: () => null
}))
vi.mock('@/components/WorkingTree/CleanUntrackedModal', () => ({
  CleanUntrackedModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Clean untracked</div> : null
}))
vi.mock('@/components/WorkingTree/RenameFileModal', () => ({
  RenameFileModal: () => null
}))

vi.mock('@/hooks/useGit', () => ({
  useWorkingStatus: vi.fn(() => ({
    data: emptyWorking,
    isLoading: false,
    error: null
  })),
  useRepoStatus: vi.fn(() => ({ data: { head: 'abc', branch: 'main', isDetached: false } })),
  useLogGraph: vi.fn(() => ({ data: { commits: [], refs: [] }, isLoading: false, error: null })),
  useCleanPreview: vi.fn(() => ({ data: [], isLoading: false, error: null }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => {
    const mutation = { isPending: false, mutateAsync: vi.fn() }
    return {
      stageAdd: mutation,
      stageReset: mutation,
      workingDiscard: mutation,
      workingRemove: mutation,
      workingAddToGitignore: mutation,
      submoduleUpdate: mutation,
      submoduleSync: mutation,
      commit: mutation
    }
  })
}))

vi.mock('@/hooks/useInvalidateGit', () => ({
  useInvalidateGit: vi.fn(() => vi.fn())
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

describe('GitWorkingTree', () => {
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
  it('renders working tree sections', () => {
    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText(/Changes \(\d+\)/)).toBeInTheDocument()
    expect(screen.getByText(/Staged \(\d+\)/)).toBeInTheDocument()
  })

  it('lists unstaged and staged files', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'dirty.txt', status: 'modified' }],
        staged: [{ path: 'ready.txt', status: 'added' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText('dirty.txt')).toBeInTheDocument()
    expect(screen.getByText('ready.txt')).toBeInTheDocument()
  })

  it('exposes working tree bulk actions for dirty repositories', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'dirty.txt', status: 'modified' }],
        staged: [{ path: 'ready.txt', status: 'added' }],
        untracked: [{ path: 'new.txt', status: 'untracked' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)

    await userEvent.click(screen.getAllByRole('button', { name: 'Stage all' })[0]!)
    await userEvent.click(screen.getAllByRole('button', { name: 'Unstage all' })[0]!)
    await userEvent.click(screen.getAllByRole('button', { name: 'Discard all…' })[0]!)
    await userEvent.click(screen.getByRole('button', { name: 'Tree' }))
  })

  it('prompts to open a repository when disconnected', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })

    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText(/Open a repository to view changes/i)).toBeInTheDocument()
  })

  it('shows loading and error states', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')

    vi.mocked(useWorkingStatus).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as ReturnType<typeof useWorkingStatus>)
    const { unmount } = renderWithProviders(<GitWorkingTree />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    unmount()

    vi.mocked(useWorkingStatus).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Working tree failed')
    } as ReturnType<typeof useWorkingStatus>)
    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText('Working tree failed')).toBeInTheDocument()
  })

  it('lists conflicted files and selects a working file', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        conflicted: [{ path: 'conflict.txt', status: 'conflicted' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    expect(screen.getByText('conflict.txt')).toBeInTheDocument()
    await userEvent.click(screen.getByText('conflict.txt'))
    expect(useSelectionStore.getState().selectedWorkingFile).toBe('conflict.txt')
  })

  it('toggles path view and expands all folders in tree mode', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'src/app.ts', status: 'modified' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    expect(screen.getByRole('button', { name: /^path$/i })).toBeInTheDocument()
  })

  it('stages a file from the row context menu', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    const { useGitMutations } = await import('@/hooks/useGitMutations')
    const stageAdd = vi.fn(async () => undefined)
    vi.mocked(useGitMutations).mockReturnValue({
      stageAdd: { isPending: false, mutateAsync: stageAdd },
      stageReset: { isPending: false, mutateAsync: vi.fn() },
      workingDiscard: { isPending: false, mutateAsync: vi.fn() },
      workingRemove: { isPending: false, mutateAsync: vi.fn() },
      workingAddToGitignore: { isPending: false, mutateAsync: vi.fn() },
      submoduleUpdate: { isPending: false, mutateAsync: vi.fn() },
      submoduleSync: { isPending: false, mutateAsync: vi.fn() },
      commit: { isPending: false, mutateAsync: vi.fn() }
    } as unknown as ReturnType<typeof useGitMutations>)

    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'dirty.txt', status: 'modified' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    fireEvent.contextMenu(screen.getByText('dirty.txt'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^stage$/i }))
    expect(stageAdd).toHaveBeenCalledWith({ paths: ['dirty.txt'] })
  })

  it('opens the clean untracked modal from bulk actions', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        untracked: [{ path: 'new.txt', status: 'untracked' }]
      },
      isLoading: false,
      error: null
    } as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<GitWorkingTree />)
    await userEvent.click(screen.getByRole('button', { name: /clean untracked/i }))
    expect(screen.getByText('Clean untracked')).toBeInTheDocument()
  })
})
