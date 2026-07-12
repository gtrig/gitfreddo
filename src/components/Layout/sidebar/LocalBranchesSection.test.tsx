/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { LocalBranchesSection } from './LocalBranchesSection'

const branches = [
  { name: 'main', head: 'abc', isCurrent: true, isRemote: false, ahead: 0, behind: 0 },
  { name: 'feature', head: 'def', isCurrent: false, isRemote: false, ahead: 1, behind: 0 }
]

describe('LocalBranchesSection', () => {
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
        filter="feat"
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
    expect(screen.getByText('feature')).toBeInTheDocument()
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
    expect(screen.queryByText('main')).not.toBeInTheDocument()
    expect(screen.queryByText('feature')).not.toBeInTheDocument()
  })
})
