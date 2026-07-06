import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileHistoryOverlay } from './FileHistoryOverlay'
import { renderWithProviders } from '@/test/render'
import { useWorkspaceStore } from '@/stores/workspace'
import type { GitCommit } from '@/lib/types'

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
})
