/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useBranchVisibilityStore } from '@/stores/branchVisibility'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { LocalBranchesSection, RemoteBranchesSection } from './LocalBranchesSection'

const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }
const submitPullRequest = vi.fn(async () => undefined)
let canCreatePr = true

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    deleteBranch: mutation,
    unsetUpstream: mutation,
    merge: mutation,
    fastForwardBranch: mutation,
    fetch: mutation,
    deleteRemoteBranch: mutation,
    remoteRemove: mutation
  })
}))

vi.mock('@/hooks/useForgePullRequestActions', () => ({
  useForgePullRequestActions: () => ({
    canCreatePr,
    provider: 'github' as const,
    submitPullRequest
  })
}))

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

vi.mock('@/components/Branches/MergeBranchDialog', () => ({
  MergeBranchDialog: ({ sourceBranch }: { sourceBranch: string }) => (
    <div data-testid="merge-dialog">{sourceBranch}</div>
  )
}))
vi.mock('@/components/Branches/SquashMergeIntoModal', () => ({
  SquashMergeIntoModal: ({ sourceBranch }: { sourceBranch: string }) => (
    <div data-testid="squash-dialog">{sourceBranch}</div>
  )
}))
vi.mock('@/components/Branches/RenameBranchModal', () => ({
  RenameBranchModal: ({ currentName }: { currentName: string }) => (
    <div data-testid="rename-dialog">{currentName}</div>
  )
}))
vi.mock('@/components/Forge/ForgeCreatePrModal', () => ({
  ForgeCreatePrModal: ({
    defaultHead,
    onSubmit,
    onClose
  }: {
    defaultHead: string
    onSubmit?: (params: { title: string; body: string; head: string; base: string }) => Promise<void>
    onClose?: () => void
  }) => (
    <div data-testid="pr-dialog">
      {defaultHead}
      <button
        type="button"
        onClick={() =>
          void onSubmit?.({ title: 'PR title', body: 'PR body', head: defaultHead, base: 'main' })
        }
      >
        Submit PR
      </button>
      <button type="button" onClick={() => onClose?.()}>
        Close PR
      </button>
    </div>
  )
}))
vi.mock('@/components/Worktrees/AddWorktreeModal', () => ({
  AddWorktreeModal: ({ initialBranch }: { initialBranch: string }) => (
    <div data-testid="worktree-dialog">{initialBranch}</div>
  )
}))
vi.mock('@/components/Branches/SetUpstreamModal', () => ({
  SetUpstreamModal: ({ branchName }: { branchName: string }) => (
    <div data-testid="upstream-dialog">{branchName}</div>
  )
}))
vi.mock('@/components/Branches/CheckoutRemoteModal', () => ({
  CheckoutRemoteModal: ({ remoteBranch }: { remoteBranch: string }) => (
    <div data-testid="checkout-remote-dialog">{remoteBranch}</div>
  )
}))
vi.mock('@/components/Remotes/AddRemoteModal', () => ({
  AddRemoteModal: ({ open }: { open: boolean }) => (open ? <div data-testid="add-remote-dialog" /> : null)
}))
vi.mock('@/components/Remotes/EditRemoteUrlModal', () => ({
  EditRemoteUrlModal: ({ remoteName }: { remoteName: string }) => (
    <div data-testid="edit-remote-dialog">{remoteName}</div>
  )
}))
vi.mock('@/components/Remotes/RenameRemoteModal', () => ({
  RenameRemoteModal: ({ currentName }: { currentName: string }) => (
    <div data-testid="rename-remote-dialog">{currentName}</div>
  )
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
            Confirm
          </button>
        </div>
      ) : null
  }
})

const branches = [
  { name: 'main', head: 'abc', isCurrent: true, isRemote: false, ahead: 0, behind: 0 },
  { name: 'feature/login', head: 'def', isCurrent: false, isRemote: false, ahead: 2, behind: 1 },
  { name: 'feature/settings', head: 'ghi', isCurrent: false, isRemote: false, ahead: 0, behind: 0 },
  { name: 'remotes/origin/main', head: 'abc', isCurrent: false, isRemote: true, ahead: 0, behind: 0 },
  { name: 'remotes/origin/feature', head: 'def', isCurrent: false, isRemote: true, ahead: 0, behind: 0 }
]

describe('LocalBranchesSection', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    mutation.mutateAsync.mockClear()
    canCreatePr = true
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(),
      toggleBranchVisibility: vi.fn(),
      isBranchHidden: () => false,
      setBranchVisibility: vi.fn()
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders local branch rows', () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText('main')).toBeInTheDocument()
    expect(screen.getByText('feature')).toBeInTheDocument()
  })

  it('filters branches by name', () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText('login')).toBeInTheDocument()
    expect(screen.queryByText('main')).not.toBeInTheDocument()
  })

  it('shows loading and error states', () => {
    const { rerender } = renderWithProviders(
      <LocalBranchesSection
        branches={[]}
        filter=""
        isLoading
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <LocalBranchesSection
        branches={[]}
        filter=""
        isLoading={false}
        error={new Error('Branch load failed')}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText('Branch load failed')).toBeInTheDocument()
  })

  it('shows empty state when no branches match the filter', () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="missing"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText(/no local branches/i)).toBeInTheDocument()
  })

  it('shows detached HEAD row and selects commit on click', async () => {
    const onSelectCommit = vi.fn()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached
        head="detached-hash"
        onSelectCommit={onSelectCommit}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    await userEvent.click(screen.getByText(/HEAD/i))
    expect(onSelectCommit).toHaveBeenCalledWith('detached-hash')
  })

  it('expands nested branch folders and checks out on double click', async () => {
    const onCheckout = vi.fn()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={onCheckout}
        onCreateBranch={vi.fn()}
      />
    )

    const loginRow = screen.getByRole('button', { name: /login/i })
    fireEvent.doubleClick(loginRow)
    expect(onCheckout).toHaveBeenCalledWith({ name: 'feature/login' })
  })

  it('virtualizes very large branch lists', () => {
    const manyBranches = Array.from({ length: 55 }, (_, index) => ({
      name: `branch-${index}`,
      head: `${index}`.padStart(40, '0'),
      isCurrent: index === 0,
      isRemote: false,
      ahead: 0,
      behind: 0
    }))

    renderWithProviders(
      <LocalBranchesSection
        branches={manyBranches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head={manyBranches[0]!.head}
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    expect(screen.getByText('branch-0')).toBeInTheDocument()
    expect(screen.getByText('branch-54')).toBeInTheDocument()
  })

  it('opens branch context menu and merge dialog', async () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /login/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /merge feature\/login into main/i }))
    expect(screen.getByTestId('merge-dialog')).toHaveTextContent('feature/login')
  })

  it('calls onCreateBranch from the section header', async () => {
    const onCreateBranch = vi.fn()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={onCreateBranch}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /create branch/i }))
    expect(onCreateBranch).toHaveBeenCalled()
  })

  it('opens rename, squash merge, create PR, and delete dialogs from the branch menu', async () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    const loginRow = screen.getByRole('button', { name: /login/i })

    fireEvent.contextMenu(loginRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /^rename/i }))
    expect(screen.getByTestId('rename-dialog')).toHaveTextContent('feature/login')

    fireEvent.contextMenu(loginRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /create pull request/i }))
    expect(screen.getByTestId('pr-dialog')).toHaveTextContent('feature/login')

    fireEvent.contextMenu(loginRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /delete branch/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ name: 'feature/login', force: true })

    cleanup()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    fireEvent.contextMenu(screen.getByRole('button', { name: /^main$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /squash and merge into/i }))
    expect(screen.getByTestId('squash-dialog')).toHaveTextContent('main')
  })

  it('shows checkout pending state', () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText(/checking out/i)).toBeInTheDocument()
  })

  it('selects commit on branch row click', async () => {
    const onSelectCommit = vi.fn()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={onSelectCommit}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /login/i }))
    expect(onSelectCommit).toHaveBeenCalledWith('def')
  })

  it('does not checkout the current branch on double click', async () => {
    const onCheckout = vi.fn()
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={onCheckout}
        onCreateBranch={vi.fn()}
      />
    )
    fireEvent.doubleClick(screen.getByRole('button', { name: /^main$/i }))
    expect(onCheckout).not.toHaveBeenCalled()
  })

  it('shows ahead and behind counts on branch rows', () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    expect(screen.getByText(/↑2/)).toBeInTheDocument()
    expect(screen.getByText(/↓1/)).toBeInTheDocument()
  })

  it('toggles branch graph visibility from the row action', async () => {
    const toggleBranchVisibility = vi.fn()
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(),
      toggleBranchVisibility,
      isBranchHidden: () => false,
      setBranchVisibility: vi.fn()
    })
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /hide from graph/i }))
    expect(toggleBranchVisibility).toHaveBeenCalled()
  })

  it('opens worktree, merge, and upstream dialogs from branch menu actions', async () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={[
          ...branches,
          {
            name: 'feature/upstream',
            head: 'jkl',
            isCurrent: false,
            isRemote: false,
            ahead: 0,
            behind: 0,
            upstream: 'origin/feature/upstream'
          }
        ]}
        filter="upstream"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    const upstreamRow = screen.getByRole('button', { name: /upstream/i })

    fireEvent.contextMenu(upstreamRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /checkout in new worktree/i }))
    expect(screen.getByTestId('worktree-dialog')).toHaveTextContent('feature/upstream')

    fireEvent.contextMenu(upstreamRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /change upstream/i }))
    expect(screen.getByTestId('upstream-dialog')).toHaveTextContent('feature/upstream')

    fireEvent.contextMenu(upstreamRow)
    await userEvent.click(screen.getByRole('menuitem', { name: /unset upstream/i }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ branch: 'feature/upstream' })
  })

  it('does not offer squash merge on non-current branches', async () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /login/i }))
    expect(
      screen.queryByRole('menuitem', { name: /squash and merge into/i })
    ).not.toBeInTheDocument()
  })

  it('renders detached HEAD as the first row in a virtualized list', async () => {
    const onSelectCommit = vi.fn()
    const manyBranches = Array.from({ length: 55 }, (_, index) => ({
      name: `branch-${index}`,
      head: `${index}`.padStart(40, '0'),
      isCurrent: index === 0,
      isRemote: false,
      ahead: 0,
      behind: 0
    }))

    renderWithProviders(
      <LocalBranchesSection
        branches={manyBranches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached
        head="detached-hash"
        onSelectCommit={onSelectCommit}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    await userEvent.click(screen.getByText(/HEAD/i))
    expect(onSelectCommit).toHaveBeenCalledWith('detached-hash')
  })

  it('renders nested folders in a virtualized branch list', async () => {
    const manyNested = [
      ...Array.from({ length: 26 }, (_, index) => ({
        name: `group-a/branch-${index}`,
        head: `a${index}`.padStart(39, '0'),
        isCurrent: index === 0,
        isRemote: false,
        ahead: 0,
        behind: 0
      })),
      ...Array.from({ length: 26 }, (_, index) => ({
        name: `group-b/branch-${index}`,
        head: `b${index}`.padStart(39, '0'),
        isCurrent: false,
        isRemote: false,
        ahead: 0,
        behind: 0
      }))
    ]

    renderWithProviders(
      <LocalBranchesSection
        branches={manyNested}
        filter="branch"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head={manyNested[0]!.head}
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /^group-a$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^group-b$/i })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^branch-0$/i })).toHaveLength(2)
  })

  it('shows success toast after creating a pull request', async () => {
    submitPullRequest.mockClear()
    const show = vi.fn()
    useToastStore.setState({ show })

    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /login/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /create pull request/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Submit PR' }))

    expect(submitPullRequest).toHaveBeenCalled()
    expect(show).toHaveBeenCalledWith(expect.any(String), 'success')
  })

  it('dims branches hidden from the graph in virtualized lists', () => {
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(['feature/login']),
      toggleBranchVisibility: vi.fn(),
      isBranchHidden: (key: string) => key === 'feature/login',
      setBranchVisibility: vi.fn()
    })

    const manyBranches = Array.from({ length: 55 }, (_, index) => ({
      name: index === 5 ? 'feature/login' : `branch-${index}`,
      head: `${index}`.padStart(40, '0'),
      isCurrent: index === 0,
      isRemote: false,
      ahead: 0,
      behind: 0
    }))

    renderWithProviders(
      <LocalBranchesSection
        branches={manyBranches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head={manyBranches[0]!.head}
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /^login$/i }).className).toContain('opacity-60')
  })

  it('hides create pull request when forge integration is unavailable', async () => {
    canCreatePr = false
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter="login"
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /login/i }))
    expect(
      screen.queryByRole('menuitem', { name: /create pull request/i })
    ).not.toBeInTheDocument()
  })

  it('expands and collapses nested branch folders', async () => {
    renderWithProviders(
      <LocalBranchesSection
        branches={branches}
        filter=""
        isLoading={false}
        error={null}
        checkoutPending={false}
        isDetached={false}
        head="abc"
        onSelectCommit={vi.fn()}
        onCheckout={vi.fn()}
        onCreateBranch={vi.fn()}
      />
    )

    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^feature$/i }))
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /^feature$/i }))
    expect(screen.queryByRole('button', { name: /login/i })).not.toBeInTheDocument()
  })
})

describe('RemoteBranchesSection', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(),
      toggleBranchVisibility: vi.fn(),
      isBranchHidden: () => false,
      setBranchVisibility: vi.fn()
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders remote branches grouped by remote', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    expect(screen.getByText('origin')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /feature/i })).toBeInTheDocument()
  })

  it('nests slash-separated remote branches into folders and shows forge icon on the remote only', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={[
          {
            name: 'remotes/origin/main',
            head: 'abc',
            isCurrent: false,
            isRemote: true,
            ahead: 0,
            behind: 0
          },
          {
            name: 'remotes/origin/feature/login',
            head: 'def',
            isCurrent: false,
            isRemote: true,
            ahead: 0,
            behind: 0
          }
        ]}
        remotes={[
          { name: 'origin', url: 'https://github.com/acme/repo.git', fetch: '', push: '' }
        ]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    expect(screen.getByTitle('GitHub')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^feature$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^login$/i })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /^feature$/i }))
    expect(screen.getByRole('button', { name: /^login$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^main$/i })).toBeInTheDocument()
  })

  it('shows fetch hint for empty remotes and opens add-remote modal', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={[]}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    expect(screen.getByText(/fetch/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /add remote/i }))
    expect(screen.getByTestId('add-remote-dialog')).toBeInTheDocument()
  })

  it('opens remote branch context menu and checkout dialog', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /checkout as local branch/i }))
    expect(screen.getByTestId('checkout-remote-dialog')).toBeInTheDocument()
  })

  it('shows loading, error, and empty remote states', () => {
    const { rerender } = renderWithProviders(
      <RemoteBranchesSection
        branches={[]}
        remotes={[]}
        filter=""
        isLoading
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()

    rerender(
      <RemoteBranchesSection
        branches={[]}
        remotes={[]}
        filter=""
        isLoading={false}
        error={new Error('Remote load failed')}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('Remote load failed')).toBeInTheDocument()

    rerender(
      <RemoteBranchesSection
        branches={[]}
        remotes={[]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText(/no remotes/i)).toBeInTheDocument()
  })

  it('selects commit when a remote branch row is clicked', async () => {
    const onSelectCommit = vi.fn()
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={onSelectCommit}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /feature/i }))
    expect(onSelectCommit).toHaveBeenCalledWith('def')
  })

  it('filters remote branches and remotes by search query', () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[
          { name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' },
          { name: 'upstream', url: 'https://example.com/up.git', fetch: '', push: '' }
        ]}
        filter="upstream"
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    expect(screen.getByText('upstream')).toBeInTheDocument()
    expect(screen.queryByText(/^origin$/i)).not.toBeInTheDocument()
  })

  it('runs remote folder actions from the context menu', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /fetch from remote/i }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ remote: 'origin' })

    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /edit url/i }))
    expect(screen.getByTestId('edit-remote-dialog')).toHaveTextContent('origin')

    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /^rename/i }))
    expect(screen.getByTestId('rename-remote-dialog')).toHaveTextContent('origin')

    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /delete remote/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ name: 'origin' })
  })

  it('deletes a remote branch after confirmation', async () => {
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )

    fireEvent.contextMenu(screen.getByRole('button', { name: /feature/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /delete remote branch/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(mutation.mutateAsync).toHaveBeenCalledWith({ remote: 'origin', branch: 'feature' })
  })

  it('toggles remote branch graph visibility', async () => {
    const toggleBranchVisibility = vi.fn()
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(),
      toggleBranchVisibility,
      isBranchHidden: () => false,
      setBranchVisibility: vi.fn()
    })
    renderWithProviders(
      <RemoteBranchesSection
        branches={branches}
        remotes={[{ name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' }]}
        filter=""
        isLoading={false}
        error={null}
        onSelectCommit={vi.fn()}
      />
    )
    await userEvent.click(screen.getAllByRole('button', { name: /hide from graph/i })[0]!)
    expect(toggleBranchVisibility).toHaveBeenCalled()
  })
})
