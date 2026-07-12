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

vi.mock('@/components/Branches/MergeBranchDialog', () => ({ MergeBranchDialog: () => null }))
vi.mock('@/components/Forge/ForgeCreatePrModal', () => ({ ForgeCreatePrModal: () => null }))
vi.mock('@/components/Worktrees/AddWorktreeModal', () => ({ AddWorktreeModal: () => null }))
vi.mock('@/components/Branches/CheckoutRemoteModal', () => ({ CheckoutRemoteModal: () => null }))
vi.mock('@/components/Branches/CreateBranchModal', () => ({ CreateBranchModal: () => null }))
vi.mock('@/components/Branches/RenameBranchModal', () => ({ RenameBranchModal: () => null }))
vi.mock('@/components/Tags/RenameTagModal', () => ({ RenameTagModal: () => null }))
vi.mock('@/components/Branches/SetUpstreamModal', () => ({ SetUpstreamModal: () => null }))
vi.mock('@/components/Branches/RebaseSequenceModal', () => ({ RebaseSequenceModal: () => null }))
vi.mock('@/components/Tags/CreateTagModal', () => ({ CreateTagModal: () => null }))
vi.mock('@/components/DetailPanel/DeleteCommitModal', () => ({ DeleteCommitModal: () => null }))
vi.mock('@/components/Tags/DeleteTagModal', () => ({ DeleteTagModal: () => null }))
vi.mock('@/components/DetailPanel/RemoveStaleBranchesModal', () => ({ RemoveStaleBranchesModal: () => null }))
vi.mock('@/components/DetailPanel/RewordCommitModal', () => ({ RewordCommitModal: () => null }))
vi.mock('@/components/DetailPanel/ExplainCommitWithAi', () => ({ ExplainCommitModal: () => null }))
vi.mock('@/components/DetailPanel/AddNoteModal', () => ({ AddNoteModal: () => null }))
vi.mock('@/components/History/PickMergeParentModal', () => ({ PickMergeParentModal: () => null }))
vi.mock('@/components/Ui/Modal', async () => {
  const actual = await vi.importActual<typeof import('@/components/Ui/Modal')>('@/components/Ui/Modal')
  return { ...actual, ConfirmDialog: () => null }
})

const checkoutMutate = vi.fn(async () => undefined)
const stashApplyMutate = vi.fn(async () => undefined)

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    checkout: { mutateAsync: checkoutMutate, isPending: false },
    stashApply: { mutateAsync: stashApplyMutate, isPending: false },
    stashPop: { mutateAsync: vi.fn(), isPending: false },
    stashDrop: { mutateAsync: vi.fn(), isPending: false },
    branchRename: { mutateAsync: vi.fn(), isPending: false },
    branchDelete: { mutateAsync: vi.fn(), isPending: false },
    tagDelete: { mutateAsync: vi.fn(), isPending: false },
    remoteBranchDelete: { mutateAsync: vi.fn(), isPending: false }
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
    metrics: { laneWidth: 12, nodeRadius: 4, rowHeight: 28 },
    resizing: false,
    setResizing: vi.fn(),
    onBranchTagResize: vi.fn(),
    onGraphLaneResize: vi.fn()
  }))
}))
vi.mock('@/hooks/useTimelineColumnVisibility', () => ({
  useTimelineColumnVisibility: vi.fn(() => ({
    visibility: DEFAULT_TIMELINE_COLUMN_VISIBILITY,
    toggleColumn: vi.fn()
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
    window.gitfreddo = createGitFreddoMock()
    await resetGitMocks()
  })
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
})
