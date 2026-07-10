import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestConversationTimeline } from './PullRequestConversationTimeline'
import { PullRequestOverviewPanel } from './PullRequestOverviewPanel'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequest, GitHubPullRequestTimelineItem } from '@shared/github'

const pr: GitHubPullRequest = {
  number: 7,
  title: 'Add feature',
  state: 'open',
  htmlUrl: 'https://github.com/o/r/pull/7',
  repository: { owner: 'o', repo: 'r' },
  user: 'dev',
  head: { ref: 'feature', sha: 'abc' },
  base: { ref: 'main', sha: 'def' },
  body: 'Summary of the change',
  draft: false,
  mergeable: true
}

const items: GitHubPullRequestTimelineItem[] = [
  {
    id: 'conversation-1',
    kind: 'conversation',
    body: 'Please update the docs',
    user: 'alice',
    createdAt: '2026-01-02T10:00:00Z'
  }
]

const threads = [
  {
    id: 'PRRT_1',
    isResolved: false,
    isOutdated: false,
    path: 'src/a.ts',
    line: 12,
    comments: [
      {
        id: 2,
        body: 'Rename this variable',
        user: 'bob',
        createdAt: '2026-01-02T11:00:00Z',
        path: 'src/a.ts',
        line: 12
      }
    ]
  }
]

describe('PullRequestConversationTimeline', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders conversation comments', () => {
    renderWithProviders(<PullRequestConversationTimeline items={items} />)

    expect(screen.getByText('Please update the docs')).toBeInTheDocument()
  })
})

describe('PullRequestOverviewPanel', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows the opening post, review threads, and conversation feed', async () => {
    const user = userEvent.setup()
    const onOpenFile = vi.fn()

    renderWithProviders(
      <PullRequestOverviewPanel
        pr={pr}
        items={items}
        threads={threads}
        onOpenFile={onOpenFile}
      />
    )

    expect(screen.getByText('Summary of the change')).toBeInTheDocument()
    expect(screen.getByText(/opened this pull request/i)).toBeInTheDocument()
    expect(screen.getByText('Rename this variable')).toBeInTheDocument()
    expect(screen.getByText('Please update the docs')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'src/a.ts:12' }))
    expect(onOpenFile).toHaveBeenCalledWith('src/a.ts')
  })
})
