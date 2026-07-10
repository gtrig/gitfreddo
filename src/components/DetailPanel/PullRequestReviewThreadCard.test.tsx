import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestReviewThreadCard } from './PullRequestReviewThreadCard'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequestReviewThread } from '@shared/github'

const thread: GitHubPullRequestReviewThread = {
  id: 'PRRT_abc',
  isResolved: false,
  isOutdated: false,
  path: 'src/a.ts',
  line: 12,
  comments: [
    {
      id: 10,
      body: 'Rename this',
      user: 'alice',
      createdAt: '2026-01-02T10:00:00Z',
      path: 'src/a.ts',
      line: 12
    },
    {
      id: 11,
      body: 'Good catch',
      user: 'bob',
      createdAt: '2026-01-02T11:00:00Z',
      path: 'src/a.ts',
      line: 12
    }
  ]
}

describe('PullRequestReviewThreadCard', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      prDetailNumber: null
    })
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('renders thread comments and actions', () => {
    renderWithProviders(
      <PullRequestReviewThreadCard
        thread={thread}
        prNumber={7}
        repository={{ owner: 'o', repo: 'r' }}
      />
    )

    expect(screen.getByText('Rename this')).toBeInTheDocument()
    expect(screen.getByText('Good catch')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Resolve' })).toBeInTheDocument()
  })

  it('posts a reply to the root review comment', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    vi.mocked(window.gitfreddo.githubReplyPullRequestReviewComment).mockResolvedValue(undefined)

    renderWithProviders(
      <PullRequestReviewThreadCard
        thread={thread}
        prNumber={7}
        repository={{ owner: 'o', repo: 'r' }}
        onUpdated={onUpdated}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Reply' }))
    await user.type(screen.getByPlaceholderText('Write a reply…'), 'Thanks!')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))

    expect(window.gitfreddo.githubReplyPullRequestReviewComment).toHaveBeenCalledWith(
      expect.any(String),
      7,
      10,
      'Thanks!',
      { owner: 'o', repo: 'r' }
    )
    expect(onUpdated).toHaveBeenCalled()
  })

  it('resolves a review thread', async () => {
    const user = userEvent.setup()
    const onUpdated = vi.fn()
    vi.mocked(window.gitfreddo.githubResolvePullRequestReviewThread).mockResolvedValue(undefined)

    renderWithProviders(
      <PullRequestReviewThreadCard
        thread={thread}
        prNumber={7}
        repository={{ owner: 'o', repo: 'r' }}
        onUpdated={onUpdated}
      />
    )

    await user.click(screen.getByRole('button', { name: 'Resolve' }))

    expect(window.gitfreddo.githubResolvePullRequestReviewThread).toHaveBeenCalledWith(
      expect.any(String),
      'PRRT_abc'
    )
    expect(onUpdated).toHaveBeenCalled()
  })
})
