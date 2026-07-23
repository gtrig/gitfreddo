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
import { useToastStore } from '@/stores/toast'

const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const aiFillMutate = vi.fn(async () => '')
const showToast = vi.fn()

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
  useAiFill: () => ({ mutateAsync: aiFillMutate, isPending: false })
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: vi.fn(() => true)
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
    aiFillMutate.mockReset()
    aiFillMutate.mockResolvedValue('')
    showToast.mockClear()
    const settings = await import('@/hooks/useAppSettings')
    vi.mocked(settings.useAiEnabled).mockReturnValue(true)
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
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
    expect(screen.getByRole('button', { name: /^tree$/i })).toHaveClass(/bg-gf-accent/)
    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    expect(screen.getByRole('button', { name: /^path$/i })).toHaveClass(/bg-gf-accent/)
    expect(screen.getByRole('button', { name: /^tree$/i })).not.toHaveClass(/bg-gf-accent/)
    await userEvent.click(screen.getByRole('button', { name: /^tree$/i }))
    expect(screen.getByRole('button', { name: /^tree$/i })).toHaveClass(/bg-gf-accent/)
  })

  it('expands all folders in tree view', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'merge',
        conflictedPaths: ['src/nested/conflict.ts'],
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: {
        staged: [{ path: 'lib/done.ts' }],
        unstaged: [],
        untracked: [],
        conflicted: [{ path: 'src/nested/conflict.ts' }]
      }
    } as unknown as ReturnType<typeof git.useWorkingStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.queryByText('conflict.ts')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /expand all/i }))
    expect(screen.getByText('conflict.ts')).toBeInTheDocument()
    expect(screen.getByText('done.ts')).toBeInTheDocument()
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

  it('shows an error toast when staged files still contain conflict markers', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') {
        return { content: '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n' }
      }
      return undefined
    })

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /mark all resolved/i }))
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/still contain conflict markers/i),
      'error'
    )
  })

  it('auto-resolves conflicted files with AI proposals', async () => {
    aiFillMutate.mockResolvedValue(
      JSON.stringify({
        resolutions: [{ hunkId: 0, text: 'merged content', confidence: 90 }]
      })
    )

    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') {
        return { content: '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n' }
      }
      return undefined
    })

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /auto-resolve all/i }))
    expect(aiFillMutate).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/ai proposals ready/i),
      'info'
    )
  })

  it('renders conflict files in tree view with nested folders', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'merge',
        conflictedPaths: ['src/nested/conflict.ts'],
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: 'src/' }))
    await userEvent.click(screen.getByRole('button', { name: 'nested/' }))
    expect(screen.getByText('conflict.ts')).toBeInTheDocument()
    expect(screen.queryByText('src/nested/conflict.ts')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('conflict.ts'))
    expect(useSelectionStore.getState().selectedConflictFile).toBe('src/nested/conflict.ts')
  })

  it('shows loading row while merge status is loading', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('shows placeholder when there are no conflicted files', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'merge',
        conflictedPaths: [],
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getAllByText('—')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /auto-resolve all/i })).not.toBeInTheDocument()
  })

  it('shows AI proposal badges and ready message', () => {
    useSelectionStore.setState({
      pendingAiProposals: {
        'file.txt': [{ hunkId: 0, text: 'merged', analysis: 'Use merged text', confidence: 85 }]
      }
    })

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText('85%')).toBeInTheDocument()
    expect(screen.getByText(/ai proposals ready/i)).toBeInTheDocument()
  })

  it('shows generic merge operation title for unknown kind', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'unknown',
        conflictedPaths: ['file.txt'],
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/merge operation in progress/i)).toBeInTheDocument()
  })

  it('shows an error toast when staging all resolved files fails', async () => {
    mutation.mutateAsync.mockRejectedValueOnce(new Error('Stage failed'))
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') {
        return { content: 'resolved content without markers' }
      }
      return undefined
    })

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /mark all resolved/i }))
    expect(showToast).toHaveBeenCalledWith('Stage failed', 'error')
  })

  it('shows an error toast when bulk AI resolve fails', async () => {
    aiFillMutate.mockRejectedValueOnce(new Error('AI failed'))
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.read') {
        return { content: '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n' }
      }
      return undefined
    })

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /auto-resolve all/i }))
    expect(showToast).toHaveBeenCalledWith('AI failed', 'error')
  })

  it('hides AI resolve button when AI is disabled', async () => {
    const settings = await import('@/hooks/useAppSettings')
    vi.mocked(settings.useAiEnabled).mockReturnValue(false)

    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.queryByRole('button', { name: /auto-resolve all/i })).not.toBeInTheDocument()
  })

  it('shows merge branch labels in the operation title', () => {
    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText(/merging feature into main/i)).toBeInTheDocument()
  })

  it('virtualizes conflict files in path view when the list is large', async () => {
    const git = await import('@/hooks/useGit')
    const manyPaths = Array.from({ length: 55 }, (_, index) => `src/file-${index}.ts`)
    vi.mocked(git.useMergeStatus).mockReturnValue({
      data: {
        inProgress: true,
        kind: 'merge',
        conflictedPaths: manyPaths,
        incomingLabel: 'feature',
        currentBranch: 'main'
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useMergeStatus>)

    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    expect(screen.getByText('src/file-0.ts')).toBeInTheDocument()
    expect(screen.getByText('src/file-54.ts')).toBeInTheDocument()
  })

  it('lists resolved files in path view', async () => {
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
    await userEvent.click(screen.getByRole('button', { name: /^path$/i }))
    expect(screen.getByText('resolved.txt')).toBeInTheDocument()
  })
})
