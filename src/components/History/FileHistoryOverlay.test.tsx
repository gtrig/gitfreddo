import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileHistoryOverlay } from './FileHistoryOverlay'
import { renderWithProviders } from '@/test/render'
import { useWorkspaceStore } from '@/stores/workspace'
import type { GitCommit } from '@/lib/types'

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: vi.fn(
    ({
      count,
      estimateSize
    }: {
      count: number
      estimateSize: (index: number) => number
    }) => ({
      getVirtualItems: () =>
        Array.from({ length: count }, (_, index) => ({
          index,
          key: index,
          start: index * estimateSize(index),
          size: estimateSize(index)
        })),
      getTotalSize: () =>
        Array.from({ length: count }, (_, index) => estimateSize(index)).reduce(
          (total, size) => total + size,
          0
        ),
      scrollToIndex: vi.fn(),
      measureElement: vi.fn()
    })
  )
}))

function makeCommit(index: number): GitCommit {
  const hash = `${index}`.padStart(40, 'a')
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents: [],
    subject: `Commit ${index}`,
    body: '',
    message: `Commit ${index}`,
    author: { name: 'Alice', email: 'a@test.com', date: '2024-06-01T00:00:00Z' },
    committer: { name: 'Alice', email: 'a@test.com', date: '2024-06-01T00:00:00Z' },
    refs: [],
    notes: '',
    signature: null,
    stats: null
  }
}

const commits: GitCommit[] = [
  {
    hash: 'aaa111111111111111111111111111111111111',
    shortHash: 'aaa1111',
    parents: [],
    subject: 'Update readme',
    body: '',
    message: 'Update readme',
    author: { name: 'Alice', email: 'a@test.com', date: '2024-06-01T00:00:00Z' },
    committer: { name: 'Alice', email: 'a@test.com', date: '2024-06-01T00:00:00Z' },
    refs: [],
    notes: '',
    signature: null,
    stats: null
  },
  {
    hash: 'bbb222222222222222222222222222222222222',
    shortHash: 'bbb2222',
    parents: ['aaa111111111111111111111111111111111111'],
    subject: 'Add feature',
    body: '',
    message: 'Add feature',
    author: { name: 'Bob', email: 'b@test.com', date: '2024-05-01T00:00:00Z' },
    committer: { name: 'Bob', email: 'b@test.com', date: '2024-05-01T00:00:00Z' },
    refs: [],
    notes: '',
    signature: null,
    stats: null
  }
]

const sampleDiff = `diff --git a/README.md b/README.md
index 1234567..89abcde 100644
--- a/README.md
+++ b/README.md
@@ -1 +1,2 @@
 hello
+world
`

describe('FileHistoryOverlay', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })

    window.gitfreddo.invoke = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'log.file') {
        expect(params?.path).toBe('README.md')
        return commits
      }
      if (method === 'diff.show') {
        return { unified: sampleDiff, path: params?.path as string }
      }
      return {}
    }) as typeof window.gitfreddo.invoke
  })

  afterEach(() => {
    cleanup()
  })

  it('lists commits in the sidebar and shows diff for the selected commit', async () => {
    const user = userEvent.setup()
    renderWithProviders(
      <FileHistoryOverlay path="README.md" onClose={() => undefined} />
    )

    expect(await screen.findByText('Update readme')).toBeInTheDocument()
    expect(screen.getByText('Add feature')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('world')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /Add feature/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('diff.show', {
        ref: 'bbb222222222222222222222222222222222222',
        path: 'README.md'
      })
    })
  })

  it('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={onClose} />)

    await screen.findByText('Update readme')
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('opens the file in the configured editor', async () => {
    const user = userEvent.setup()
    const openInEditor = vi.fn(async () => undefined)
    window.gitfreddo.openInEditor = openInEditor

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)

    await screen.findByText('Update readme')
    await user.click(screen.getByRole('button', { name: 'Open in editor' }))
    expect(openInEditor).toHaveBeenCalledWith('README.md')
  })

  it('shows loading state while commits are fetched', () => {
    window.gitfreddo.invoke = vi.fn(() => new Promise(() => undefined)) as typeof window.gitfreddo.invoke
    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(screen.getByText(/loading file history/i)).toBeInTheDocument()
  })

  it('shows error when commit list fails to load', async () => {
    window.gitfreddo.invoke = vi.fn(async (method: string) => {
      if (method === 'log.file') throw new Error('history failed')
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(await screen.findByText('history failed')).toBeInTheDocument()
  })

  it('shows empty message when the file has no commits', async () => {
    window.gitfreddo.invoke = vi.fn(async (method: string) => {
      if (method === 'log.file') return []
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(await screen.findByText(/no commits found for this file/i)).toBeInTheDocument()
  })

  it('shows full file content in full view mode', async () => {
    const user = userEvent.setup()
    window.gitfreddo.invoke = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'log.file') return commits
      if (method === 'file.read') {
        return 'full file contents'
      }
      if (method === 'diff.show') {
        return { unified: sampleDiff, path: params?.path as string }
      }
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    await screen.findByText('Update readme')
    await user.click(screen.getByRole('button', { name: /^full file$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith('file.read', {
        ref: commits[0]!.hash,
        path: 'README.md'
      })
    })
    expect(await screen.findByText('full file contents')).toBeInTheDocument()
  })

  it('shows split diff view when side-by-side mode is selected', async () => {
    const user = userEvent.setup()
    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    await screen.findByText('Update readme')
    await user.click(screen.getByRole('button', { name: /side by side/i }))
    expect(await screen.findByText('world')).toBeInTheDocument()
  })

  it('shows no-changes message when diff is empty', async () => {
    window.gitfreddo.invoke = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'log.file') return commits
      if (method === 'diff.show') {
        return { unified: '', path: params?.path as string }
      }
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(await screen.findByText(/no changes in this range/i)).toBeInTheDocument()
  })

  it('shows diff error message when diff fetch fails', async () => {
    window.gitfreddo.invoke = vi.fn(async (method: string) => {
      if (method === 'log.file') return commits
      if (method === 'diff.show') throw new Error('diff failed')
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(await screen.findByText('diff failed')).toBeInTheDocument()
  })

  it('virtualizes long commit lists', async () => {
    const manyCommits = Array.from({ length: 55 }, (_, index) => makeCommit(index))
    window.gitfreddo.invoke = vi.fn(async (method: string, params?: Record<string, unknown>) => {
      if (method === 'log.file') return manyCommits
      if (method === 'diff.show') {
        return { unified: sampleDiff, path: params?.path as string }
      }
      return {}
    }) as typeof window.gitfreddo.invoke

    renderWithProviders(<FileHistoryOverlay path="README.md" onClose={() => undefined} />)
    expect(await screen.findByText('Commit 0')).toBeInTheDocument()
    expect(screen.getByText('Commit 54')).toBeInTheDocument()
  })
})
