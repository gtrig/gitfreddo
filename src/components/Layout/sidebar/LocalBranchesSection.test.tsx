/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useBranchVisibilityStore } from '@/stores/branchVisibility'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { LocalBranchesSection, RemoteBranchesSection } from './LocalBranchesSection'

const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    deleteBranch: mutation,
    unsetUpstream: mutation,
    fetch: mutation,
    deleteRemoteBranch: mutation,
    remoteRemove: mutation
  })
}))

vi.mock('@/hooks/useForgePullRequestActions', () => ({
  useForgePullRequestActions: () => ({
    canCreatePr: true,
    provider: 'github' as const,
    submitPullRequest: vi.fn(async () => undefined)
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
  ForgeCreatePrModal: ({ defaultHead }: { defaultHead: string }) => (
    <div data-testid="pr-dialog">{defaultHead}</div>
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
    await userEvent.click(screen.getByRole('menuitem', { name: /merge into current/i }))
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
})
