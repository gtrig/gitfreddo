/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitTimeline } from './CommitTimeline'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useCommitSearchStore } from '@/stores/commitSearch'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'
import { DEFAULT_TIMELINE_COLUMN_VISIBILITY } from '@/lib/timeline/timelineColumnVisibility'
import { DEFAULT_GRAPH_METRICS } from '@/lib/graph/graphMetrics'
import type { GitWorkingStatus } from '@/lib/types'

const commitA = makeCommit({
  hash: 'aaa111111111111111111111111111111111111',
  shortHash: 'aaa1111',
  subject: 'First commit',
  refs: ['main']
})
const commitB = makeCommit({
  hash: 'bbb222222222222222222222222222222222222',
  shortHash: 'bbb2222',
  subject: 'Second commit',
  parents: [commitA.hash]
})

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

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        start: index * estimateSize(),
        size: estimateSize()
      })),
    getTotalSize: () => count * estimateSize(),
    measureElement: vi.fn()
  }))
}))

vi.mock('@/hooks/useForgePullRequestActions', () => ({
  useForgePullRequestActions: () => ({
    canCreatePr: true,
    provider: 'github' as const,
    submitPullRequest: vi.fn(async () => undefined)
  })
}))

vi.mock('@/hooks/useAppSettings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/hooks/useAppSettings')>()
  return {
    ...actual,
    useAiEnabled: vi.fn(() => false)
  }
})

vi.mock('@/components/Branches/MergeBranchDialog', () => ({
  MergeBranchDialog: ({
    sourceBranch,
    targetBranch
  }: {
    sourceBranch: string
    targetBranch?: string
  }) => (
    <div data-testid="merge-branch-dialog">
      {targetBranch ? `${sourceBranch}->${targetBranch}` : sourceBranch}
    </div>
  )
}))
vi.mock('@/components/Forge/ForgeCreatePrModal', () => ({
  ForgeCreatePrModal: ({ open, defaultHead }: { open: boolean; defaultHead: string }) =>
    open ? <div data-testid="create-pr-modal">{defaultHead}</div> : null
}))
vi.mock('@/components/Worktrees/AddWorktreeModal', () => ({
  AddWorktreeModal: ({
    open,
    initialBranch,
    initialCommit
  }: {
    open: boolean
    initialBranch?: string
    initialCommit?: string
  }) =>
    open ? (
      <div data-testid="add-worktree-modal">{initialBranch ?? initialCommit}</div>
    ) : null
}))
vi.mock('@/components/Branches/CheckoutRemoteModal', () => ({
  CheckoutRemoteModal: ({ open, remoteBranch }: { open: boolean; remoteBranch: string }) =>
    open ? <div data-testid="checkout-remote-modal">{remoteBranch}</div> : null
}))
vi.mock('@/components/Branches/CreateBranchModal', () => ({
  CreateBranchModal: ({ open, startPoint }: { open: boolean; startPoint?: string }) =>
    open ? <div data-testid="create-branch-modal">{startPoint}</div> : null
}))
vi.mock('@/components/Branches/RenameBranchModal', () => ({
  RenameBranchModal: ({ open, currentName }: { open: boolean; currentName: string }) =>
    open ? <div data-testid="rename-branch-modal">{currentName}</div> : null
}))
vi.mock('@/components/Tags/RenameTagModal', () => ({
  RenameTagModal: ({ open, currentName }: { open: boolean; currentName: string }) =>
    open ? <div data-testid="rename-tag-modal">{currentName}</div> : null
}))
vi.mock('@/components/Branches/SetUpstreamModal', () => ({
  SetUpstreamModal: ({ open, branchName }: { open: boolean; branchName: string }) =>
    open ? <div data-testid="set-upstream-modal">{branchName}</div> : null
}))
vi.mock('@/components/Branches/RebaseSequenceModal', () => ({
  RebaseSequenceModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="rebase-sequence-modal">rebase</div> : null
}))
vi.mock('@/components/Tags/CreateTagModal', () => ({
  CreateTagModal: ({ open, target }: { open: boolean; target?: string }) =>
    open ? <div data-testid="create-tag-modal">{target}</div> : null
}))
vi.mock('@/components/DetailPanel/DeleteCommitModal', () => ({
  DeleteCommitModal: ({ open, action }: { open: boolean; action: string }) =>
    open ? <div data-testid="delete-commit-modal">{action}</div> : null
}))
vi.mock('@/components/Tags/DeleteTagModal', () => ({
  DeleteTagModal: ({ open, tag }: { open: boolean; tag: { name: string } }) =>
    open ? <div data-testid="delete-tag-modal">{tag.name}</div> : null
}))
vi.mock('@/components/DetailPanel/RemoveStaleBranchesModal', () => ({
  RemoveStaleBranchesModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="remove-stale-modal">stale</div> : null
}))
vi.mock('@/components/DetailPanel/RewordCommitModal', () => ({
  RewordCommitModal: ({ open, commit }: { open: boolean; commit: { subject: string } }) =>
    open ? <div data-testid="reword-commit-modal">{commit.subject}</div> : null
}))
vi.mock('@/components/DetailPanel/ExplainCommitWithAi', () => ({
  ExplainCommitModal: ({ open }: { open: boolean }) =>
    open ? <div data-testid="explain-commit-modal">explain</div> : null
}))
vi.mock('@/components/DetailPanel/AddNoteModal', () => ({
  AddNoteModal: ({ open, commit }: { open: boolean; commit: { subject: string } }) =>
    open ? <div data-testid="add-note-modal">{commit.subject}</div> : null
}))
vi.mock('@/components/History/PickMergeParentModal', () => ({
  PickMergeParentModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Pick merge parent</div> : null
}))
vi.mock('@/components/Ui/Modal', async () => {
  const actual = await vi.importActual<typeof import('@/components/Ui/Modal')>('@/components/Ui/Modal')
  return {
    ...actual,
    ConfirmDialog: ({
      open,
      onConfirm,
      message
    }: {
      open: boolean
      onConfirm: () => void | Promise<void>
      message: string
    }) =>
      open ? (
        <div role="dialog">
          <p>{message}</p>
          <button type="button" onClick={() => void onConfirm()}>
            Confirm delete
          </button>
        </div>
      ) : null
  }
})

const checkoutMutate = vi.fn(async () => undefined)
const stashApplyMutate = vi.fn(async () => undefined)
const stashPopMutate = vi.fn(async () => undefined)
const stashDropMutate = vi.fn(async () => undefined)
const deleteBranchMutate = vi.fn(async () => undefined)
const deleteRemoteBranchMutate = vi.fn(async () => undefined)
const toggleColumn = vi.fn()
const mutationStub = { mutateAsync: vi.fn(async () => undefined), isPending: false }

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    checkout: { mutateAsync: checkoutMutate, isPending: false },
    stashApply: { mutateAsync: stashApplyMutate, isPending: false },
    stashPop: { mutateAsync: stashPopMutate, isPending: false },
    stashDrop: { mutateAsync: stashDropMutate, isPending: false },
    deleteBranch: { mutateAsync: deleteBranchMutate, isPending: false },
    deleteRemoteBranch: { mutateAsync: deleteRemoteBranchMutate, isPending: false },
    pushTag: mutationStub,
    unsetUpstream: mutationStub,
    cherryPick: mutationStub,
    squashCommits: mutationStub,
    rebaseStart: mutationStub,
    rebaseContinue: mutationStub,
    rebaseAbort: mutationStub,
    rebaseSkip: mutationStub,
    mergeContinue: mutationStub,
    mergeAbort: mutationStub,
    cherryPickContinue: mutationStub,
    cherryPickAbort: mutationStub,
    cherryPickSkip: mutationStub,
    revertCommit: mutationStub,
    reset: mutationStub
  })
}))

vi.mock('@/hooks/useGit', () => ({
  useLogGraph: vi.fn(() => ({
    data: { commits: [commitA, commitB], maxLane: 1 },
    isLoading: false,
    error: null
  })),
  useBranches: vi.fn(() => ({
    data: [{ name: 'main', head: commitA.hash, isCurrent: true, isRemote: false, upstream: null }],
    isLoading: false,
    error: null
  })),
  useRepoStatus: vi.fn(() => ({
    data: { head: commitA.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
  })),
  useRemotes: vi.fn(() => ({ data: [] })),
  useStashList: vi.fn(() => ({ data: [] })),
  useTags: vi.fn(() => ({ data: [] })),
  useWorkingStatus: vi.fn(() => ({ data: emptyWorking, isLoading: false, error: null })),
  useMergeStatus: vi.fn(() => ({ data: null }))
}))
vi.mock('@/hooks/useTimelineColumnSizes', () => ({
  useTimelineColumnSizes: vi.fn(() => ({
    branchTagWidth: 120,
    graphColumnWidth: 80,
    metrics: DEFAULT_GRAPH_METRICS,
    resizing: false,
    setResizing: vi.fn(),
    onBranchTagResize: vi.fn(),
    onGraphLaneResize: vi.fn()
  }))
}))
vi.mock('@/hooks/useTimelineColumnVisibility', () => ({
  useTimelineColumnVisibility: vi.fn(() => ({
    visibility: DEFAULT_TIMELINE_COLUMN_VISIBILITY,
    toggleColumn
  }))
}))

describe('CommitTimeline', () => {
  afterEach(() => cleanup())

  async function resetGitMocks() {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [commitA, commitB], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useWorkingStatus).mockReturnValue({
      data: emptyWorking,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useWorkingStatus>)
    vi.mocked(git.useMergeStatus).mockReturnValue({ data: null } as unknown as ReturnType<typeof git.useMergeStatus>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitA.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)
    vi.mocked(git.useTags).mockReturnValue({ data: [] } as unknown as ReturnType<typeof git.useTags>)
    vi.mocked(git.useRemotes).mockReturnValue({ data: [] } as unknown as ReturnType<typeof git.useRemotes>)
  }

  function mockTimelineOverlay(container: HTMLElement, top = 200) {
    const overlay = container.querySelector('[role="presentation"]') as HTMLElement | null
    expect(overlay).toBeTruthy()
    overlay!.setPointerCapture = vi.fn()
    overlay!.releasePointerCapture = vi.fn()
    overlay!.hasPointerCapture = vi.fn(() => true)
    overlay!.getBoundingClientRect = () =>
      ({
        top,
        left: 0,
        width: 800,
        height: 56,
        bottom: top + 56,
        right: 800,
        x: 0,
        y: top,
        toJSON: () => ({})
      }) as DOMRect
    return overlay!
  }

  beforeEach(async () => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useCommitSearchStore.setState({ query: '' })
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: [],
      selectedStashIndex: null
    })
    window.gitfreddo = createGitFreddoMock()
    checkoutMutate.mockClear()
    stashApplyMutate.mockClear()
    stashPopMutate.mockClear()
    stashDropMutate.mockClear()
    deleteBranchMutate.mockClear()
    deleteRemoteBranchMutate.mockClear()
    toggleColumn.mockClear()

    const { useVirtualizer } = await import('@tanstack/react-virtual')
    vi.mocked(useVirtualizer).mockImplementation(((
      { count, estimateSize }: { count: number; estimateSize: () => number }
    ) => ({
      getVirtualItems: () =>
        Array.from({ length: count }, (_, index) => ({
          index,
          key: index,
          start: index * estimateSize(),
          size: estimateSize()
        })),
      getTotalSize: () => count * estimateSize(),
      measureElement: vi.fn()
    })) as unknown as typeof useVirtualizer)

    const columnVisibility = await import('@/hooks/useTimelineColumnVisibility')
    vi.mocked(columnVisibility.useTimelineColumnVisibility).mockReturnValue({
      visibility: DEFAULT_TIMELINE_COLUMN_VISIBILITY,
      toggleColumn
    })

    const { useAiEnabled } = await import('@/hooks/useAppSettings')
    vi.mocked(useAiEnabled).mockReturnValue(false)

    await resetGitMocks()
  })

  async function mockPartialVirtualWindow(start: number, endExclusive: number) {
    const { useVirtualizer } = await import('@tanstack/react-virtual')
    vi.mocked(useVirtualizer).mockImplementation(((
      { count, estimateSize }: { count: number; estimateSize: () => number }
    ) => ({
      getVirtualItems: () =>
        Array.from({ length: endExclusive - start }, (_, offset) => {
          const index = start + offset
          return {
            index,
            key: index,
            start: index * estimateSize(),
            size: estimateSize()
          }
        }),
      getTotalSize: () => count * estimateSize(),
      measureElement: vi.fn()
    })) as unknown as typeof useVirtualizer)
  }

  async function setupFeatureBranchTimeline() {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useBranches).mockReturnValue({
      data: [
        { name: 'main', head: commitA.hash, isCurrent: true, isRemote: false, upstream: null },
        {
          name: 'feature',
          head: commitB.hash,
          isCurrent: false,
          isRemote: false,
          upstream: null,
          ahead: 2,
          behind: 0
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useBranches>)
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: {
        commits: [{ ...commitB, refs: ['feature'] }, commitA],
        maxLane: 1
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
  }
  it('renders timeline when connected', () => {
    renderWithProviders(<CommitTimeline />)
    expect(screen.getByRole('region', { name: /commit/i })).toBeInTheDocument()
    expect(screen.getByText('Branch / Tag')).toBeInTheDocument()
  })

  it('shows loading state while graph data is loading', async () => {
    const { useLogGraph } = await import('@/hooks/useGit')
    vi.mocked(useLogGraph).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as ReturnType<typeof useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error state when graph loading fails', async () => {
    const { useLogGraph } = await import('@/hooks/useGit')
    vi.mocked(useLogGraph).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Graph failed')
    } as ReturnType<typeof useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Graph failed')).toBeInTheDocument()
  })

  it('renders commit rows and navigates with arrow keys', async () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: commitA.hash },
      selectedCommitHashes: [commitA.hash]
    })

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('First commit')).toBeInTheDocument()
    expect(screen.getByText('Second commit')).toBeInTheDocument()

    const region = screen.getByRole('region', { name: /commit/i })
    region.focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: commitB.hash
    })
  })

  it('shows working and merge prefix rows when repo state requires them', async () => {
    const { useWorkingStatus, useMergeStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'dirty.txt', status: 'modified' }]
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useWorkingStatus>)
    vi.mocked(useMergeStatus).mockReturnValue({
      data: { inProgress: true, kind: 'merge', conflictedPaths: ['README.md'] }
    } as unknown as ReturnType<typeof useMergeStatus>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Uncommitted changes')).toBeInTheDocument()
    expect(screen.getByText('Merge conflicts detected')).toBeInTheDocument()

    await userEvent.click(screen.getByText('View Changes'))
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'working',
      id: 'changes'
    })

    await userEvent.click(screen.getByText('Resolve'))
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'merge',
      id: 'conflicts'
    })
  })

  it('keeps the merge row visible after all conflicts are staged', async () => {
    const { useMergeStatus } = await import('@/hooks/useGit')
    vi.mocked(useMergeStatus).mockReturnValue({
      data: { inProgress: true, kind: 'merge', conflictedPaths: [] }
    } as unknown as ReturnType<typeof useMergeStatus>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Merge conflicts detected')).toBeInTheDocument()
    expect(screen.getByText('Resolve')).toBeInTheDocument()
  })

  it('opens the header column visibility menu', async () => {
    renderWithProviders(<CommitTimeline />)
    const header = screen.getByText('Branch / Tag').closest('div.sticky')
    expect(header).toBeTruthy()
    fireEvent.contextMenu(header!)
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('prompts to open a repo when disconnected', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText(/Open a repository to view commits/i)).toBeInTheDocument()
  })

  it('dims commits that do not match the active search query', async () => {
    useCommitSearchStore.setState({ query: 'Second' })
    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Second commit')).toBeInTheDocument()
  })

  it('renders stash commits with stash badge and selects on click', async () => {
    const stashHash = 'ccc333333333333333333333333333333333333'
    const stashCommit = makeCommit({
      hash: stashHash,
      shortHash: 'ccc3333',
      subject: 'WIP on main: bbb2222 saved work',
      parents: [commitB.hash],
      refs: ['stash']
    })

    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [stashCommit, commitB, commitA], maxLane: 2 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitB.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)
    vi.mocked(git.useBranches).mockReturnValue({
      data: [{ name: 'main', head: commitB.hash, isCurrent: true, isRemote: false, upstream: null }],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useBranches>)
    vi.mocked(git.useStashList).mockReturnValue({
      data: [{ index: 0, hash: stashHash, message: 'saved work' }]
    } as unknown as ReturnType<typeof git.useStashList>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('WIP on main: bbb2222 saved work')).toBeInTheDocument()
    expect(screen.getAllByText('stash').length).toBeGreaterThan(0)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: commitB.hash },
      selectedCommitHashes: [commitB.hash]
    })
    const region = screen.getByRole('region', { name: /commit/i })
    region.focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: stashHash
    })
  })

  it('shows empty state when there are no commits', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [], maxLane: 0 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText(/no commits yet/i)).toBeInTheDocument()
  })

  it('selects the newest commit when pressing arrow up with no selection', async () => {
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: []
    })

    const { container } = renderWithProviders(<CommitTimeline />)
    const region = screen.getByRole('region', { name: /commit/i })
    region.focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: commitB.hash
    })
    expect(container.querySelector('[role="presentation"]')).toBeTruthy()
  })

  it('selects commits from overlay clicks and opens the commit context menu', async () => {
    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)

    fireEvent.click(overlay, { clientY: 214 })
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: commitA.hash
    })

    fireEvent.contextMenu(overlay, { clientY: 242 })
    expect(screen.getByRole('menu')).toBeInTheDocument()
  })

  it('checks out a commit when double-clicking the overlay', async () => {
    checkoutMutate.mockClear()
    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)

    fireEvent.doubleClick(overlay, { clientY: 214 })
    expect(checkoutMutate).toHaveBeenCalled()
  })

  it('shows detached HEAD metadata and tag names in the graph column', async () => {
    const taggedCommit = {
      ...commitA,
      refs: ['main', 'v1.0.0', 'origin/main']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [taggedCommit, commitB], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitA.hash, branch: '', isDetached: true, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)
    vi.mocked(git.useTags).mockReturnValue({
      data: [{ name: 'v1.0.0', hash: commitA.hash, remote: null }]
    } as unknown as ReturnType<typeof git.useTags>)
    vi.mocked(git.useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]
    } as unknown as ReturnType<typeof git.useRemotes>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getAllByText('HEAD').length).toBeGreaterThan(0)
  })

  it('toggles timeline columns from the header context menu', async () => {
    renderWithProviders(<CommitTimeline />)
    const header = screen.getByText('Branch / Tag').closest('div.sticky')
    fireEvent.contextMenu(header!)
    await userEvent.click(screen.getByRole('menuitem', { name: 'Hash' }))
    expect(toggleColumn).toHaveBeenCalledWith('hash')
  })

  it('opens the ref context menu from a branch badge', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useBranches).mockReturnValue({
      data: [
        { name: 'main', head: commitA.hash, isCurrent: true, isRemote: false, upstream: null },
        { name: 'feature', head: commitB.hash, isCurrent: false, isRemote: false, upstream: null }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useBranches>)
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: {
        commits: [{ ...commitB, refs: ['feature'] }, commitA],
        maxLane: 1
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    fireEvent.contextMenu(screen.getByText('feature'))
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /focus commit/i })).toBeInTheDocument()
  })

  it('opens rename branch modal from the ref context menu', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useBranches).mockReturnValue({
      data: [
        { name: 'main', head: commitA.hash, isCurrent: true, isRemote: false, upstream: null },
        { name: 'feature', head: commitB.hash, isCurrent: false, isRemote: false, upstream: null }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useBranches>)
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: {
        commits: [
          { ...commitB, refs: ['feature'] },
          commitA
        ],
        maxLane: 1
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^rename/i }))
    expect(screen.getByTestId('rename-branch-modal')).toHaveTextContent('feature')
  })

  it('renders many commits through the virtualizer window', async () => {
    const manyCommits = Array.from({ length: 55 }, (_, index) =>
      makeCommit({
        hash: `${index.toString().padStart(40, '0')}`,
        shortHash: `c${index.toString().padStart(6, '0')}`,
        subject: `Commit ${index}`,
        parents: index > 0 ? [`${(index - 1).toString().padStart(40, '0')}`] : []
      })
    )
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: manyCommits, maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: manyCommits[0]!.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Commit 0')).toBeInTheDocument()
    expect(screen.getByText('Commit 54')).toBeInTheDocument()
  })

  it('renders remote branch refs on commits', async () => {
    const remoteCommit = {
      ...commitA,
      refs: ['origin/feature']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [remoteCommit, commitB], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: remoteCommit.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)
    vi.mocked(git.useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]
    } as unknown as ReturnType<typeof git.useRemotes>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('origin/feature')).toBeInTheDocument()
  })

  it('opens create branch and tag modals from the commit context menu', async () => {
    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)

    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /create branch here/i }))
    expect(screen.getByTestId('create-branch-modal')).toHaveTextContent(commitB.hash)

    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /create tag here/i }))
    expect(screen.getByTestId('create-tag-modal')).toHaveTextContent(commitB.hash)
  })

  it('runs stash context menu actions on stash commits', async () => {
    const stashHash = 'ccc333333333333333333333333333333333333'
    const stashCommit = makeCommit({
      hash: stashHash,
      shortHash: 'ccc3333',
      subject: 'WIP on main: saved work',
      parents: [commitB.hash],
      refs: ['stash']
    })
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [stashCommit, commitB, commitA], maxLane: 2 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useStashList).mockReturnValue({
      data: [{ index: 0, hash: stashHash, message: 'saved work' }]
    } as unknown as ReturnType<typeof git.useStashList>)

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 214 })

    await userEvent.click(screen.getByRole('menuitem', { name: /^apply$/i }))
    expect(stashApplyMutate).toHaveBeenCalledWith({ index: 0 })

    fireEvent.contextMenu(overlay, { clientY: 214 })
    await userEvent.click(screen.getByRole('menuitem', { name: /^pop$/i }))
    expect(stashPopMutate).toHaveBeenCalledWith({ index: 0 })

    fireEvent.contextMenu(overlay, { clientY: 214 })
    await userEvent.click(screen.getByRole('menuitem', { name: /^drop$/i }))
    expect(stashDropMutate).toHaveBeenCalledWith({ index: 0 })
  })

  it('opens merge parent pick when cherry-picking a merge commit', async () => {
    const parent1 = 'parent1hashparent1hashparent1hashparent1hash12'
    const parent2 = 'parent2hashparent2hashparent2hashparent2hash12'
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      subject: 'Merge feature',
      parents: [parent1, parent2],
      refs: []
    })
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [mergeCommit, commitB, commitA], maxLane: 2 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitA.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 214 })
    await userEvent.click(screen.getByRole('menuitem', { name: /cherry-pick merge12 onto main/i }))
    expect(screen.getByText('Pick merge parent')).toBeInTheDocument()
  })

  it('selects the first commit when pressing arrow down with no selection', async () => {
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: []
    })

    renderWithProviders(<CommitTimeline />)
    const region = screen.getByRole('region', { name: /commit/i })
    region.focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: commitA.hash
    })
  })

  it('shows working change counts for modified, added, and deleted files', async () => {
    const { useWorkingStatus } = await import('@/hooks/useGit')
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        isClean: false,
        unstaged: [{ path: 'changed.txt', status: 'modified' }],
        untracked: [{ path: 'new.txt', status: 'added' }],
        staged: [{ path: 'gone.txt', status: 'deleted' }]
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useWorkingStatus>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText(/1 modified/i)).toBeInTheDocument()
    expect(screen.getByText(/1 added/i)).toBeInTheDocument()
    expect(screen.getByText(/1 deleted/i)).toBeInTheDocument()
  })

  it('renders merge label on merge commits when parents column is hidden', async () => {
    const parent1 = 'parent1hashparent1hashparent1hashparent1hash12'
    const parent2 = 'parent2hashparent2hashparent2hashparent2hash12'
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      subject: 'Merge feature branch',
      parents: [parent1, parent2],
      refs: []
    })
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [mergeCommit, commitB, commitA], maxLane: 2 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Merge feature branch')).toBeInTheDocument()
    expect(screen.getByText('merge')).toBeInTheDocument()
  })

  it('renders optional timeline columns when they are visible', async () => {
    const columnVisibility = await import('@/hooks/useTimelineColumnVisibility')
    vi.mocked(columnVisibility.useTimelineColumnVisibility).mockReturnValue({
      visibility: {
        ...DEFAULT_TIMELINE_COLUMN_VISIBILITY,
        hash: true,
        author: true
      },
      toggleColumn
    })

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Hash')).toBeInTheDocument()
    expect(screen.getAllByText('Author').length).toBeGreaterThan(0)
    expect(screen.getAllByText('aaa1111').length).toBeGreaterThan(0)
  })

  it('renders virtual spacers when the virtual window is partial', async () => {
    const manyCommits = Array.from({ length: 20 }, (_, index) =>
      makeCommit({
        hash: `${index.toString().padStart(40, '0')}`,
        shortHash: `c${index.toString().padStart(6, '0')}`,
        subject: `Commit ${index}`,
        parents: index > 0 ? [`${(index - 1).toString().padStart(40, '0')}`] : []
      })
    )
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: manyCommits, maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: manyCommits[0]!.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    await mockPartialVirtualWindow(5, 8)
    const { container } = renderWithProviders(<CommitTimeline />)

    expect(screen.getByText('Commit 5')).toBeInTheDocument()
    expect(screen.getByText('Commit 7')).toBeInTheDocument()
    expect(screen.queryByText('Commit 0')).not.toBeInTheDocument()
    expect(container.querySelector('[aria-hidden][style*="height: 140px"]')).toBeTruthy()
  })

  it('resizes timeline columns via drag handles', async () => {
    const columnSizes = await import('@/hooks/useTimelineColumnSizes')
    const onBranchTagResize = vi.fn()
    const onGraphLaneResize = vi.fn()
    const setResizing = vi.fn()
    vi.mocked(columnSizes.useTimelineColumnSizes).mockReturnValue({
      branchTagWidth: 120,
      graphColumnWidth: 80,
      metrics: DEFAULT_GRAPH_METRICS,
      resizing: false,
      setResizing,
      onBranchTagResize,
      onGraphLaneResize
    })

    renderWithProviders(<CommitTimeline />)
    const handles = screen.getAllByRole('separator', { name: /resize column/i })
    expect(handles.length).toBeGreaterThan(0)

    fireEvent.mouseDown(handles[0]!, { clientX: 100 })
    fireEvent.mouseMove(window, { clientX: 120 })
    fireEvent.mouseUp(window)

    expect(setResizing).toHaveBeenCalled()
    expect(onBranchTagResize).toHaveBeenCalled()

    const graphHandle = handles[handles.length - 1]!
    fireEvent.mouseDown(graphHandle, { clientX: 200 })
    fireEvent.mouseMove(window, { clientX: 210 })
    fireEvent.mouseUp(window)
    expect(onGraphLaneResize).toHaveBeenCalled()
  })

  it('renders graph body without connector provider when only the graph column is visible', async () => {
    const columnVisibility = await import('@/hooks/useTimelineColumnVisibility')
    vi.mocked(columnVisibility.useTimelineColumnVisibility).mockReturnValue({
      visibility: {
        ...DEFAULT_TIMELINE_COLUMN_VISIBILITY,
        branchTag: false,
        graph: true
      },
      toggleColumn
    })

    renderWithProviders(<CommitTimeline />)
    expect(screen.queryByText('Branch / Tag')).not.toBeInTheDocument()
    expect(screen.getByText('First commit')).toBeInTheDocument()
  })

  it('checks out a branch when double-clicking its ref badge', async () => {
    await setupFeatureBranchTimeline()
    checkoutMutate.mockClear()

    renderWithProviders(<CommitTimeline />)
    await userEvent.dblClick(screen.getByText('feature'))

    expect(checkoutMutate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'feature' })
    )
  })

  it('does not checkout when double-clicking the current branch ref', async () => {
    checkoutMutate.mockClear()
    renderWithProviders(<CommitTimeline />)
    await userEvent.dblClick(screen.getAllByText('main')[0]!)
    expect(checkoutMutate).not.toHaveBeenCalled()
  })

  it('opens checkout remote modal when double-clicking a remote ref', async () => {
    const remoteCommit = {
      ...commitB,
      refs: ['origin/feature']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [remoteCommit, commitA], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitA.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)
    vi.mocked(git.useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]
    } as unknown as ReturnType<typeof git.useRemotes>)

    renderWithProviders(<CommitTimeline />)
    await userEvent.dblClick(screen.getByText('origin/feature'))
    expect(screen.getByTestId('checkout-remote-modal')).toHaveTextContent('remotes/origin/feature')
  })

  it('checks out a tag when double-clicking its ref badge', async () => {
    const taggedCommit = {
      ...commitB,
      refs: ['v2.0.0']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [taggedCommit, commitA], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useTags).mockReturnValue({
      data: [{ name: 'v2.0.0', hash: commitB.hash, remote: null }]
    } as unknown as ReturnType<typeof git.useTags>)
    checkoutMutate.mockClear()

    renderWithProviders(<CommitTimeline />)
    await userEvent.dblClick(screen.getByText('v2.0.0'))
    expect(checkoutMutate).toHaveBeenCalled()
  })

  it('opens merge branch dialog from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge feature into/i }))
    expect(screen.getByTestId('merge-branch-dialog')).toHaveTextContent('feature')
  })

  it('opens the reverse merge dialog (current into branch) from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /into feature/i }))
    // Reverse direction merges the current branch into feature (source->target).
    expect(screen.getByTestId('merge-branch-dialog').textContent).toMatch(/->feature$/)
  })

  it('opens create pull request modal from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /create pull request/i }))
    expect(screen.getByTestId('create-pr-modal')).toHaveTextContent('feature')
  })

  it('opens worktree modal from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /checkout in new worktree/i }))
    expect(screen.getByTestId('add-worktree-modal')).toHaveTextContent('feature')
  })

  it('opens set upstream modal from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /set upstream/i }))
    expect(screen.getByTestId('set-upstream-modal')).toHaveTextContent('feature')
  })

  it('opens delete branch confirm from the ref context menu', async () => {
    await setupFeatureBranchTimeline()
    renderWithProviders(<CommitTimeline />)

    fireEvent.contextMenu(screen.getByText('feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete branch/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('feature')
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    expect(deleteBranchMutate).toHaveBeenCalledWith({ name: 'feature', force: true })
  })

  it('opens delete remote branch confirm from the remote ref context menu', async () => {
    const remoteCommit = {
      ...commitB,
      refs: ['origin/feature']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [remoteCommit, commitA], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useBranches).mockReturnValue({
      data: [
        { name: 'main', head: commitA.hash, isCurrent: true, isRemote: false, upstream: null },
        {
          name: 'remotes/origin/feature',
          head: commitB.hash,
          isCurrent: false,
          isRemote: true,
          upstream: null
        }
      ],
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useBranches>)
    vi.mocked(git.useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]
    } as unknown as ReturnType<typeof git.useRemotes>)

    renderWithProviders(<CommitTimeline />)
    fireEvent.contextMenu(screen.getByText('origin/feature'))
    await userEvent.click(screen.getByRole('menuitem', { name: /delete remote branch/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('origin/feature')
    await userEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    expect(deleteRemoteBranchMutate).toHaveBeenCalledWith({
      remote: 'origin',
      branch: 'feature'
    })
  })

  it('opens rename and delete tag modals from the tag ref context menu', async () => {
    const taggedCommit = {
      ...commitB,
      refs: ['v2.0.0']
    }
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [taggedCommit, commitA], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useTags).mockReturnValue({
      data: [{ name: 'v2.0.0', hash: commitB.hash, remote: null }]
    } as unknown as ReturnType<typeof git.useTags>)

    renderWithProviders(<CommitTimeline />)
    fireEvent.contextMenu(screen.getAllByText('v2.0.0')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: /^rename/i }))
    expect(screen.getByTestId('rename-tag-modal')).toHaveTextContent('v2.0.0')

    fireEvent.contextMenu(screen.getAllByText('v2.0.0')[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: /^delete tag/i }))
    expect(screen.getByTestId('delete-tag-modal')).toHaveTextContent('v2.0.0')
  })

  it('opens commit modals from the commit context menu', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitB.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: commitB.hash },
      selectedCommitHashes: [commitB.hash]
    })

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 242 })

    await userEvent.click(screen.getByRole('menuitem', { name: /reword/i }))
    expect(screen.getByTestId('reword-commit-modal')).toHaveTextContent('Second commit')

    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /add note/i }))
    expect(screen.getByTestId('add-note-modal')).toHaveTextContent('Second commit')

    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /checkout in new worktree/i }))
    expect(screen.getByTestId('add-worktree-modal')).toBeInTheDocument()

    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /delete this commit \(soft\)/i }))
    expect(screen.getByTestId('delete-commit-modal')).toHaveTextContent('delete')
  })

  it('opens interactive rebase modal from multi-select commit context menu', async () => {
    const commitC = makeCommit({
      hash: 'ccc333333333333333333333333333333333333',
      shortHash: 'ccc3333',
      subject: 'Third commit',
      parents: [commitB.hash]
    })
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [commitC, commitB, commitA], maxLane: 1 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitC.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: commitB.hash },
      selectedCommitHashes: [commitB.hash, commitA.hash]
    })

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /interactive rebase/i }))
    expect(screen.getByTestId('rebase-sequence-modal')).toBeInTheDocument()
  })

  it('opens remove stale branches modal from the commit context menu', async () => {
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useRepoStatus).mockReturnValue({
      data: { head: commitA.hash, branch: 'main', isDetached: false, root: '/tmp/repo' }
    } as unknown as ReturnType<typeof git.useRepoStatus>)

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /remove stale branch history/i }))
    expect(screen.getByTestId('remove-stale-modal')).toBeInTheDocument()
  })

  it('opens explain commit modal when AI is enabled', async () => {
    const { useAiEnabled } = await import('@/hooks/useAppSettings')
    vi.mocked(useAiEnabled).mockReturnValue(true)

    const { container } = renderWithProviders(<CommitTimeline />)
    const overlay = mockTimelineOverlay(container)
    fireEvent.contextMenu(overlay, { clientY: 242 })
    await userEvent.click(screen.getByRole('menuitem', { name: /explain/i }))
    expect(screen.getByTestId('explain-commit-modal')).toBeInTheDocument()
  })

  it('selects stash via keyboard when navigating to a stash commit', async () => {
    const stashHash = 'ccc333333333333333333333333333333333333'
    const stashCommit = makeCommit({
      hash: stashHash,
      shortHash: 'ccc3333',
      subject: 'WIP on main: saved work',
      parents: [commitB.hash],
      refs: ['stash']
    })
    const git = await import('@/hooks/useGit')
    vi.mocked(git.useLogGraph).mockReturnValue({
      data: { commits: [stashCommit, commitB, commitA], maxLane: 2 },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof git.useLogGraph>)
    vi.mocked(git.useStashList).mockReturnValue({
      data: [{ index: 2, hash: stashHash, message: 'saved work' }]
    } as unknown as ReturnType<typeof git.useStashList>)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: commitB.hash },
      selectedCommitHashes: [commitB.hash]
    })

    renderWithProviders(<CommitTimeline />)
    const region = screen.getByRole('region', { name: /commit/i })
    region.focus()
    await userEvent.keyboard('{ArrowUp}')

    expect(useSelectionStore.getState().selectedStashIndex).toBe(2)
  })
})
