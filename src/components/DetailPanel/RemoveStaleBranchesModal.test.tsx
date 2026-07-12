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

vi.mock('@/hooks/useInvalidateGit', () => ({
  useInvalidateGit: () => vi.fn()
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

describe('RemoveStaleBranchesModal', () => {
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
})
