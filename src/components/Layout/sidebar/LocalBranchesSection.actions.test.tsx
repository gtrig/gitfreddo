/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { useBranchVisibilityStore } from '@/stores/branchVisibility'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { LocalBranchesSection, RemoteBranchesSection } from './LocalBranchesSection'

const mutations = {
  deleteBranch: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  unsetUpstream: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  merge: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  fastForwardBranch: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  fetch: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  deleteRemoteBranch: { mutateAsync: vi.fn(async () => undefined), isPending: false },
  remoteRemove: { mutateAsync: vi.fn(async () => undefined), isPending: false }
}

vi.mock('@/hooks/useGitMutations', () => ({ useGitMutations: () => mutations }))
vi.mock('@/hooks/useForgePullRequestActions', () => ({
  useForgePullRequestActions: () => ({ canCreatePr: true, provider: 'github', submitPullRequest: vi.fn() })
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

/** Dialog stand-in that exposes its onClose, so closing paths run. */
function closeable(testId: string) {
  return ({ open = true, onClose }: { open?: boolean; onClose: () => void }) =>
    open ? (
      <div data-testid={testId}>
        <button type="button" onClick={onClose}>
          Close {testId}
        </button>
      </div>
    ) : null
}
vi.mock('@/components/Branches/MergeBranchDialog', () => ({ MergeBranchDialog: closeable('merge') }))
vi.mock('@/components/Branches/SquashMergeIntoModal', () => ({ SquashMergeIntoModal: closeable('squash') }))
vi.mock('@/components/Branches/RenameBranchModal', () => ({ RenameBranchModal: closeable('rename') }))
vi.mock('@/components/Forge/ForgeCreatePrModal', () => ({ ForgeCreatePrModal: closeable('pr') }))
vi.mock('@/components/Worktrees/AddWorktreeModal', () => ({ AddWorktreeModal: closeable('worktree') }))
vi.mock('@/components/Branches/SetUpstreamModal', () => ({ SetUpstreamModal: closeable('upstream') }))
vi.mock('@/components/Branches/CheckoutRemoteModal', () => ({ CheckoutRemoteModal: closeable('checkout-remote') }))
vi.mock('@/components/Remotes/AddRemoteModal', () => ({ AddRemoteModal: closeable('add-remote') }))
vi.mock('@/components/Remotes/EditRemoteUrlModal', () => ({ EditRemoteUrlModal: closeable('edit-remote') }))
vi.mock('@/components/Remotes/RenameRemoteModal', () => ({ RenameRemoteModal: closeable('rename-remote') }))

const branches = [
  { name: 'main', head: 'abc', isCurrent: true, isRemote: false, ahead: 0, behind: 0 },
  {
    name: 'feature/login',
    head: 'def',
    isCurrent: false,
    isRemote: false,
    ahead: 2,
    behind: 1,
    upstream: 'origin/feature/login'
  },
  { name: 'remotes/origin/main', head: 'abc', isCurrent: false, isRemote: true, ahead: 0, behind: 0 },
  { name: 'remotes/origin/feature', head: 'def', isCurrent: false, isRemote: true, ahead: 0, behind: 0 },
  { name: 'remotes/upstream/main', head: 'abc', isCurrent: false, isRemote: true, ahead: 0, behind: 0 }
]

const remotes = [
  { name: 'origin', url: 'https://example.com/repo.git', fetch: '', push: '' },
  { name: 'upstream', url: 'https://example.com/up.git', fetch: '', push: '' }
]

function renderLocal(filter = '') {
  renderWithProviders(
    <LocalBranchesSection
      branches={branches}
      filter={filter}
      isLoading={false}
      error={null}
      checkoutPending={false}
      head="abc"
      onSelectCommit={vi.fn()}
      onCheckout={vi.fn()}
      onCreateBranch={vi.fn()}
    />
  )
}

function renderRemote() {
  renderWithProviders(
    <RemoteBranchesSection
      branches={branches}
      remotes={remotes}
      filter=""
      isLoading={false}
      error={null}
      onSelectCommit={vi.fn()}
    />
  )
}

const branchMenu = async (name: RegExp, item: RegExp | string) => {
  fireEvent.contextMenu(screen.getByRole('button', { name }))
  await userEvent.click(screen.getByRole('menuitem', { name: item }))
}

describe('LocalBranchesSection actions', () => {
  let show: ReturnType<typeof vi.fn>
  afterEach(() => cleanup())
  beforeEach(() => {
    for (const mutation of Object.values(mutations)) {
      mutation.mutateAsync.mockReset()
      mutation.mutateAsync.mockResolvedValue(undefined)
    }
    show = vi.fn()
    useToastStore.setState({ show: show as (message: string, tone?: "success" | "error" | "info") => void })
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

  it('closes every branch dialog it opens', async () => {
    renderLocal('login')
    const cases: Array<[RegExp, string]> = [
      [/merge feature\/login into main/i, 'merge'],
      [/^rename/i, 'rename'],
      [/create pull request/i, 'pr'],
      [/checkout in new worktree/i, 'worktree'],
      [/change upstream/i, 'upstream']
    ]
    for (const [item, testId] of cases) {
      await branchMenu(/login/i, item)
      await userEvent.click(screen.getByRole('button', { name: `Close ${testId}` }))
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
  })

  it('closes the squash-merge dialog for the current branch', async () => {
    renderLocal('main')
    await branchMenu(/^main/i, /squash and merge into/i)
    await userEvent.click(screen.getByRole('button', { name: 'Close squash' }))
    expect(screen.queryByTestId('squash')).not.toBeInTheDocument()
  })

  it('cancels deleting a branch', async () => {
    renderLocal('login')
    await branchMenu(/login/i, /delete branch/i)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mutations.deleteBranch.mutateAsync).not.toHaveBeenCalled()
  })

  it('fast-forwards the current branch and reports success or failure', async () => {
    renderLocal('login')
    await branchMenu(/login/i, 'Fast-forward main to feature/login')
    expect(mutations.merge.mutateAsync).toHaveBeenCalled()
    await waitFor(() => expect(show).toHaveBeenCalledWith('Fast-forward completed.', 'success'))

    mutations.merge.mutateAsync.mockRejectedValueOnce(new Error('not a fast-forward'))
    await branchMenu(/login/i, 'Fast-forward main to feature/login')
    await waitFor(() => expect(show).toHaveBeenCalledWith('not a fast-forward', 'error'))
  })

  it('fast-forwards another branch to the current one and reports the result', async () => {
    renderLocal('login')
    await branchMenu(/login/i, 'Fast-forward feature/login to main')
    expect(mutations.fastForwardBranch.mutateAsync).toHaveBeenCalled()
    await waitFor(() => expect(show).toHaveBeenCalledWith('Fast-forward completed.', 'success'))

    mutations.fastForwardBranch.mutateAsync.mockRejectedValueOnce(new Error('diverged'))
    await branchMenu(/login/i, 'Fast-forward feature/login to main')
    await waitFor(() => expect(show).toHaveBeenCalledWith('diverged', 'error'))
  })

  it('unsets the upstream from the branch menu', async () => {
    renderLocal('login')
    await branchMenu(/login/i, 'Unset upstream')
    expect(mutations.unsetUpstream.mutateAsync).toHaveBeenCalledWith({ branch: 'feature/login' })
  })

  it('toggles a branch folder from its context menu', async () => {
    renderLocal()
    fireEvent.contextMenu(screen.getByRole('button', { name: /^feature$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /expand|collapse/i }))
    expect(screen.getByText('login')).toBeInTheDocument()
  })
})

describe('RemoteBranchesSection actions', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    for (const mutation of Object.values(mutations)) {
      mutation.mutateAsync.mockReset()
      mutation.mutateAsync.mockResolvedValue(undefined)
    }
    useBranchVisibilityStore.setState({
      hiddenBranches: new Set(),
      toggleBranchVisibility: vi.fn(),
      isBranchHidden: () => false,
      setBranchVisibility: vi.fn()
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('closes the remote dialogs it opens', async () => {
    renderRemote()
    const remoteMenu = async (item: RegExp) => {
      fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
      await userEvent.click(screen.getByRole('menuitem', { name: item }))
    }
    await remoteMenu(/edit url/i)
    await userEvent.click(screen.getByRole('button', { name: 'Close edit-remote' }))
    await remoteMenu(/^rename/i)
    await userEvent.click(screen.getByRole('button', { name: 'Close rename-remote' }))
    expect(screen.queryByTestId('edit-remote')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rename-remote')).not.toBeInTheDocument()

    fireEvent.contextMenu(screen.getAllByRole('button', { name: /feature/i })[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: /checkout as local branch/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Close checkout-remote' }))
    expect(screen.queryByTestId('checkout-remote')).not.toBeInTheDocument()
  })

  it('cancels removing a remote and deleting a remote branch', async () => {
    renderRemote()
    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /delete remote/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mutations.remoteRemove.mutateAsync).not.toHaveBeenCalled()

    fireEvent.contextMenu(screen.getAllByRole('button', { name: /feature/i })[0]!)
    await userEvent.click(screen.getByRole('menuitem', { name: /delete .*remote|delete branch/i }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(mutations.deleteRemoteBranch.mutateAsync).not.toHaveBeenCalled()
  })

  it('collapses and expands a remote', async () => {
    renderRemote()
    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
    await userEvent.click(screen.getByRole('button', { name: /^origin$/i }))
    expect(screen.queryByText('feature')).not.toBeInTheDocument()
    fireEvent.contextMenu(screen.getByRole('button', { name: /^origin$/i }))
    await userEvent.click(screen.getByRole('menuitem', { name: /expand/i }))
    expect(screen.getAllByText('feature').length).toBeGreaterThan(0)
  })
})
