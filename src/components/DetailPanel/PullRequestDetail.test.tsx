/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestDetail } from './PullRequestDetail'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useDiffCommits } from '@/hooks/useGit'
import { useToastStore } from '@/stores/toast'
import type { GitHubPullRequest } from '@shared/github'

const showToast = vi.fn()

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ data: { diffViewMode: 'unified' } })
}))

vi.mock('@/hooks/useGit', () => ({
  useDiffCommits: vi.fn(() => ({ data: null, isLoading: false, error: null }))
}))

const filesMock = vi.fn<
  () => { data: Array<{ path: string; additions: number; deletions: number; status: string }>; isLoading: boolean; error: null }
>(() => ({ data: [], isLoading: false, error: null }))
const commitsMock = vi.fn<
  () => { data: Array<{ sha: string; message: string; author: string; date: string }>; isLoading: boolean; error: null }
>(() => ({ data: [], isLoading: false, error: null }))

vi.mock('@/hooks/useGitHubPullRequest', () => ({
  useGitHubPullRequestCommits: () => commitsMock(),
  useGitHubPullRequestFiles: () => filesMock(),
  useGitHubPullRequestReviewThreads: () => ({ data: [], isLoading: false, error: null }),
  useGitHubPullRequestTimeline: () => ({ data: [], isLoading: false, error: null }),
  useInvalidateGitHubPullRequestDetail: () => vi.fn()
}))

vi.mock('@/hooks/useGitHubPullRequests', () => ({
  useInvalidateGitHubPullRequests: () => vi.fn(async () => undefined)
}))

vi.mock('@/components/DetailPanel/PullRequestOverviewPanel', () => ({
  PullRequestOverviewPanel: () => <div>Overview panel</div>
}))
vi.mock('@/components/DetailPanel/PullRequestCommitsPanel', () => ({
  PullRequestCommitsPanel: () => <div>Commits panel</div>
}))
vi.mock('@/components/DetailPanel/PullRequestSidebar', () => ({
  PullRequestSidebar: ({
    onSelectPane
  }: {
    onSelectPane: (pane: { kind: string; path?: string }) => void
  }) => (
    <div>
      <button type="button" onClick={() => onSelectPane({ kind: 'overview' })}>
        Overview tab
      </button>
      <button type="button" onClick={() => onSelectPane({ kind: 'commits' })}>
        Commits tab
      </button>
      <button type="button" onClick={() => onSelectPane({ kind: 'files' })}>
        Files tab
      </button>
      <button type="button" onClick={() => onSelectPane({ kind: 'file', path: 'src/app.ts' })}>
        Open file
      </button>
    </div>
  )
}))
vi.mock('@/components/DetailPanel/AddPrCommentModal', () => ({
  AddPrCommentModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Add PR comment</div> : null
}))
vi.mock('@/components/DetailPanel/AddPrLineCommentModal', () => ({
  AddPrLineCommentModal: () => null
}))
vi.mock('@/components/DetailPanel/AnalyzePullRequestWithAi', () => ({
  AnalyzePullRequestWithAi: () => null
}))

const pr = {
  number: 7,
  title: 'Feature pull request',
  state: 'open',
  htmlUrl: 'https://github.com/octo/repo/pull/7',
  repository: { owner: 'octo', repo: 'repo' },
  head: { ref: 'feature', sha: 'abc' },
  base: { ref: 'main', sha: 'def' },
  body: '',
  draft: false,
  mergeable: true,
  user: 'octo'
} as const

describe('PullRequestDetail', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    filesMock.mockReturnValue({ data: [], isLoading: false, error: null })
    commitsMock.mockReturnValue({ data: [], isLoading: false, error: null })
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    vi.mocked(useDiffCommits).mockReturnValue({
      data: null,
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommits>)
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('renders pull request header and close action', async () => {
    const onClose = vi.fn()
    renderWithProviders(<PullRequestDetail pr={pr} onClose={onClose} />)
    expect(screen.getByText('Feature pull request')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('shows file and commit summaries when data is available', () => {
    filesMock.mockReturnValue({
      data: [{ path: 'src/app.ts', additions: 3, deletions: 1, status: 'modified' }],
      isLoading: false,
      error: null
    })
    commitsMock.mockReturnValue({
      data: [{ sha: 'abc', message: 'Fix bug', author: 'octo', date: '2026-01-01' }],
      isLoading: false,
      error: null
    })

    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    expect(screen.getByText(/1 file/i)).toBeInTheDocument()
    expect(screen.getByText(/1 commit/i)).toBeInTheDocument()
  })

  it('merges an open pull request from the header actions', async () => {
    vi.mocked(window.gitfreddo.githubMergePullRequest).mockResolvedValue(undefined)
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /merge pull request/i }))
    expect(window.gitfreddo.githubMergePullRequest).toHaveBeenCalledWith('/tmp/repo', 7, 'merge')
  })

  it('reopens a closed pull request', async () => {
    vi.mocked(window.gitfreddo.githubReopenPullRequest).mockResolvedValue({
      ...pr,
      state: 'open'
    } as GitHubPullRequest)
    renderWithProviders(
      <PullRequestDetail
        pr={{ ...pr, state: 'closed', mergeable: false }}
        onClose={vi.fn()}
      />
    )
    await userEvent.click(screen.getByRole('button', { name: /reopen/i }))
    expect(window.gitfreddo.githubReopenPullRequest).toHaveBeenCalledWith('/tmp/repo', 7)
  })

  it('opens the add-comment modal and external browser link', async () => {
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /add comment/i }))
    expect(screen.getByText('Add PR comment')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /open in browser/i }))
    expect(window.open).toHaveBeenCalledWith(pr.htmlUrl, '_blank', 'noopener,noreferrer')
  })

  it('switches sidebar panes to commits and file diff', async () => {
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    expect(screen.getByText('Overview panel')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Commits tab' }))
    expect(screen.getByText('Commits panel')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Open file' }))
    expect(screen.getByText('src/app.ts')).toBeInTheDocument()
  })

  it('shows files loading state and select-file hint on files tab', async () => {
    filesMock.mockReturnValue({ data: [], isLoading: true, error: null })
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    expect(screen.getByText(/loading files/i)).toBeInTheDocument()

    filesMock.mockReturnValue({
      data: [{ path: 'src/app.ts', additions: 1, deletions: 0, status: 'modified' }],
      isLoading: false,
      error: null
    })
    await userEvent.click(screen.getByRole('button', { name: 'Files tab' }))
    expect(screen.getByText(/select a file/i)).toBeInTheDocument()
  })

  it('shows diff loading state for file pane', async () => {
    vi.mocked(useDiffCommits).mockReturnValue({
      data: null,
      isLoading: true,
      error: null
    } as unknown as ReturnType<typeof useDiffCommits>)
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open file' }))
    expect(screen.getByText(/loading diff/i)).toBeInTheDocument()
  })

  it('shows diff error state for file pane', async () => {
    vi.mocked(useDiffCommits).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Diff unavailable')
    } as unknown as ReturnType<typeof useDiffCommits>)
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open file' }))
    expect(screen.getByText(/not available locally/i)).toBeInTheDocument()
  })

  it('shows empty diff state for selected file', async () => {
    vi.mocked(useDiffCommits).mockReturnValue({
      data: { path: 'src/app.ts', unified: '' },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommits>)
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open file' }))
    expect(screen.getByText(/no changes in this range/i)).toBeInTheDocument()
  })

  it('renders unified and split diff views for selected file', async () => {
    vi.mocked(useDiffCommits).mockReturnValue({
      data: {
        path: 'src/app.ts',
        unified: `diff --git a/src/app.ts b/src/app.ts
--- a/src/app.ts
+++ b/src/app.ts
@@ -1 +1,2 @@
-old
+new
+line`
      },
      isLoading: false,
      error: null
    } as unknown as ReturnType<typeof useDiffCommits>)
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open file' }))
    expect(screen.getByText('new')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /side by side/i }))
    expect(screen.getByText('old')).toBeInTheDocument()
  })

  it('shows error toasts when merge or reopen actions fail', async () => {
    vi.mocked(window.gitfreddo.githubMergePullRequest).mockRejectedValue(new Error('Merge blocked'))
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: /merge pull request/i }))
    expect(showToast).toHaveBeenCalledWith('Merge blocked', 'error')

    vi.mocked(window.gitfreddo.githubReopenPullRequest).mockRejectedValue(new Error('Reopen failed'))
    renderWithProviders(
      <PullRequestDetail pr={{ ...pr, state: 'closed', mergeable: false }} onClose={vi.fn()} />
    )
    await userEvent.click(screen.getByRole('button', { name: /reopen/i }))
    expect(showToast).toHaveBeenCalledWith('Reopen failed', 'error')
  })
})
