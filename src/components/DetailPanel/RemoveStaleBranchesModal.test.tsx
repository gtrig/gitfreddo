/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { RemoveStaleBranchesModal } from './RemoveStaleBranchesModal'
import { useToastStore } from '@/stores/toast'

const invalidate = vi.fn()
const showToast = vi.fn()

vi.mock('@/hooks/useInvalidateGit', () => ({
  useInvalidateGit: () => invalidate
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

const staleSummary = {
  totalCommitsNotOnHead: 2,
  matchingRefs: ['refs/heads/old-feature'],
  refs: [
    {
      ref: 'refs/heads/old-feature',
      label: 'old-feature',
      shortHash: 'abc1234',
      subject: 'Old work',
      kind: 'branch' as const,
      commitsNotOnHead: 2
    }
  ]
}

function makeStaleRef(index: number) {
  return {
    ref: `refs/heads/stale-${index}`,
    label: `stale-${index}`,
    shortHash: `abc${index}`,
    subject: `Subject ${index}`,
    kind: 'branch' as const,
    commitsNotOnHead: 1
  }
}

describe('RemoveStaleBranchesModal', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    invalidate.mockClear()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') return staleSummary
      if (method === 'maintenance.removeStaleBranches') {
        return { deletedRefs: ['refs/heads/old-feature'], removedCommitCount: 2 }
      }
      return undefined
    })
  })

  it('loads stale references when opened with seed hashes', async () => {
    renderWithProviders(
      <RemoveStaleBranchesModal open seedHash="abc1234567890" onClose={vi.fn()} />
    )

    expect(await screen.findByText('old-feature')).toBeInTheDocument()
    expect(screen.getByText(/Old work/)).toBeInTheDocument()
  })

  it('removes selected stale references', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <RemoveStaleBranchesModal open seedHash="abc1234567890" onClose={onClose} />
    )

    await screen.findByText('old-feature')
    await userEvent.click(screen.getByRole('button', { name: /delete 1 reference/i }))
    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'maintenance.removeStaleBranches',
        { refs: ['refs/heads/old-feature'] },
        '/tmp/repo'
      )
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('reloads matches when hash input changes', async () => {
    renderWithProviders(<RemoveStaleBranchesModal open onClose={vi.fn()} />)

    const textarea = await screen.findByRole('textbox')
    await userEvent.clear(textarea)
    await userEvent.type(textarea, 'def4567890abcd')
    await userEvent.click(screen.getByRole('button', { name: /match references/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'maintenance.staleBranches',
        { hashes: ['def4567890abcd'] },
        '/tmp/repo'
      )
    })
  })

  it('shows empty state when no stale references match', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') {
        return { totalCommitsNotOnHead: 0, matchingRefs: [], refs: [] }
      }
      return undefined
    })

    renderWithProviders(<RemoveStaleBranchesModal open onClose={vi.fn()} />)
    expect(await screen.findByText(/no stale references found/i)).toBeInTheDocument()
  })

  it('toggles reference selection and disables delete when none selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <RemoveStaleBranchesModal open seedHash="abc1234567890" onClose={vi.fn()} />
    )

    await screen.findByText('old-feature')
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    expect(screen.getByRole('button', { name: /delete 0 reference/i })).toBeDisabled()

    await user.click(checkbox)
    expect(screen.getByRole('button', { name: /delete 1 reference/i })).toBeEnabled()
  })

  it('shows kind hints for backup, remote, and tag references', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') {
        return {
          totalCommitsNotOnHead: 3,
          matchingRefs: ['refs/heads/b', 'refs/remotes/origin/r', 'refs/tags/t'],
          refs: [
            {
              ref: 'refs/heads/b',
              label: 'backup-branch',
              shortHash: 'abc1234',
              subject: 'Backup',
              kind: 'backup' as const,
              commitsNotOnHead: 1
            },
            {
              ref: 'refs/remotes/origin/r',
              label: 'origin/remote',
              shortHash: 'def5678',
              subject: 'Remote',
              kind: 'remote' as const,
              commitsNotOnHead: 1
            },
            {
              ref: 'refs/tags/t',
              label: 'v1.0',
              shortHash: 'ghi9012',
              subject: 'Tag',
              kind: 'tag' as const,
              commitsNotOnHead: 1
            }
          ]
        }
      }
      return undefined
    })

    renderWithProviders(<RemoveStaleBranchesModal open onClose={vi.fn()} />)
    expect(await screen.findByText(/rebase\/filter-branch backup/i)).toBeInTheDocument()
    expect(screen.getByText(/remote-tracking ref/i)).toBeInTheDocument()
    expect(screen.getByText(/Tag ·/)).toBeInTheDocument()
  })

  it('loads with seedHashes and shows commit count in delete label', async () => {
    renderWithProviders(
      <RemoveStaleBranchesModal
        open
        seedHashes={['abc1234567890', 'def4567890abcd']}
        onClose={vi.fn()}
      />
    )

    await screen.findByText('old-feature')
    expect(screen.getByRole('button', { name: /delete 1 reference \(2 commit\)/i })).toBeInTheDocument()
  })

  it('shows toast when loading stale references fails', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') throw new Error('scan failed')
      return undefined
    })

    renderWithProviders(<RemoveStaleBranchesModal open onClose={vi.fn()} />)
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('scan failed', 'error')
    })
  })

  it('shows toast when remove fails', async () => {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') return staleSummary
      if (method === 'maintenance.removeStaleBranches') throw new Error('delete failed')
      return undefined
    })

    const user = userEvent.setup()
    renderWithProviders(
      <RemoveStaleBranchesModal open seedHash="abc1234567890" onClose={vi.fn()} />
    )

    await screen.findByText('old-feature')
    await user.click(screen.getByRole('button', { name: /delete 1 reference/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('delete failed', 'error')
    })
  })

  it('invalidates git queries after successful remove', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(
      <RemoveStaleBranchesModal open seedHash="abc1234567890" onClose={onClose} />
    )

    await screen.findByText('old-feature')
    await user.click(screen.getByRole('button', { name: /delete 1 reference/i }))
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith('branch.list', 'log.graph', 'repo.status', 'working.status')
    })
  })

  it('virtualizes long reference lists', async () => {
    const manyRefs = Array.from({ length: 55 }, (_, index) => makeStaleRef(index))
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'maintenance.staleBranches') {
        return {
          totalCommitsNotOnHead: 55,
          matchingRefs: manyRefs.map((ref) => ref.ref),
          refs: manyRefs
        }
      }
      return undefined
    })

    renderWithProviders(<RemoveStaleBranchesModal open onClose={vi.fn()} />)
    expect(await screen.findByText('stale-0')).toBeInTheDocument()
    expect(screen.getByText('stale-54')).toBeInTheDocument()
  })
})
