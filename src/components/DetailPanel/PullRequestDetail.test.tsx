/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { PullRequestDetail } from './PullRequestDetail'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useAppSettings', () => ({
  useAppSettings: () => ({ data: { diffViewMode: 'unified' } })
}))

vi.mock('@/hooks/useGit', () => ({
  useDiffCommits: () => ({ data: '', isLoading: false, error: null })
}))

vi.mock('@/hooks/useGitHubPullRequest', () => ({
  useGitHubPullRequestCommits: () => ({ data: [], isLoading: false, error: null }),
  useGitHubPullRequestFiles: () => ({ data: [], isLoading: false, error: null }),
  useGitHubPullRequestReviewThreads: () => ({ data: [], isLoading: false, error: null }),
  useGitHubPullRequestTimeline: () => ({ data: [], isLoading: false, error: null }),
  useInvalidateGitHubPullRequestDetail: () => vi.fn()
}))

vi.mock('@/hooks/useGitHubPullRequests', () => ({
  useInvalidateGitHubPullRequests: () => vi.fn()
}))

vi.mock('@/components/DetailPanel/PullRequestOverviewPanel', () => ({
  PullRequestOverviewPanel: () => null
}))
vi.mock('@/components/DetailPanel/PullRequestCommitsPanel', () => ({
  PullRequestCommitsPanel: () => null
}))
vi.mock('@/components/DetailPanel/PullRequestSidebar', () => ({
  PullRequestSidebar: () => null
}))
vi.mock('@/components/DetailPanel/AddPrCommentModal', () => ({
  AddPrCommentModal: () => null
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
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders pull request header and close action', () => {
    renderWithProviders(<PullRequestDetail pr={pr} onClose={vi.fn()} />)
    expect(screen.getByText('Feature pull request')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})
