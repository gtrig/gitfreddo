/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestConversationTimeline } from './PullRequestConversationTimeline'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequestTimelineItem } from '@shared/github'

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

const conversationItem: GitHubPullRequestTimelineItem = {
  id: 'conversation-1',
  kind: 'conversation',
  body: 'Please update the docs',
  user: 'alice',
  createdAt: '2026-01-02T10:00:00Z'
}

const lineItem: GitHubPullRequestTimelineItem = {
  id: 'line-1',
  kind: 'line',
  body: 'Rename this variable',
  user: 'bob',
  createdAt: '2026-01-02T11:00:00Z',
  path: 'src/a.ts',
  line: 12
}

describe('PullRequestConversationTimeline', () => {
  afterEach(() => cleanup())

  it('shows empty state when there are no items', () => {
    renderWithProviders(<PullRequestConversationTimeline items={[]} />)
    expect(screen.getByText(/No comments or reviews yet/i)).toBeInTheDocument()
  })

  it('renders conversation comments with kind badge', () => {
    renderWithProviders(<PullRequestConversationTimeline items={[conversationItem]} />)

    expect(screen.getByText('Please update the docs')).toBeInTheDocument()
    expect(screen.getByText('alice')).toBeInTheDocument()
    expect(screen.getByText(/Comment/i)).toBeInTheDocument()
  })

  it('renders line comments as clickable file links when onOpenFile is provided', async () => {
    const onOpenFile = vi.fn()
    renderWithProviders(
      <PullRequestConversationTimeline items={[lineItem]} onOpenFile={onOpenFile} />
    )

    expect(screen.getByText(/line comment/i)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'src/a.ts:12' }))
    expect(onOpenFile).toHaveBeenCalledWith('src/a.ts')
  })

  it('renders line comments as plain text when onOpenFile is omitted', () => {
    renderWithProviders(<PullRequestConversationTimeline items={[lineItem]} />)

    expect(screen.getByText('src/a.ts:12')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'src/a.ts:12' })).not.toBeInTheDocument()
  })

  it('shows review state labels and fallback text for reviews without comments', () => {
    const items: GitHubPullRequestTimelineItem[] = [
      {
        id: 'review-approved',
        kind: 'review',
        body: '',
        user: 'reviewer',
        createdAt: '2026-01-02T12:00:00Z',
        reviewState: 'APPROVED'
      },
      {
        id: 'review-changes',
        kind: 'review',
        body: '',
        user: 'reviewer2',
        createdAt: '2026-01-02T13:00:00Z',
        reviewState: 'CHANGES_REQUESTED'
      },
      {
        id: 'review-dismissed',
        kind: 'review',
        body: '',
        user: 'reviewer3',
        createdAt: '2026-01-02T14:00:00Z',
        reviewState: 'DISMISSED'
      },
      {
        id: 'review-pending',
        kind: 'review',
        body: '',
        user: 'reviewer4',
        createdAt: '2026-01-02T15:00:00Z',
        reviewState: 'PENDING'
      }
    ]

    renderWithProviders(<PullRequestConversationTimeline items={items} />)

    expect(screen.getAllByText(/approved/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/changes requested/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/dismissed/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/pending/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Submitted a review without a comment/i)).toHaveLength(4)
  })

  it('preserves invalid timestamps as-is', () => {
    renderWithProviders(
      <PullRequestConversationTimeline
        items={[{ ...conversationItem, createdAt: 'not-a-date' }]}
      />
    )

    expect(screen.getByText('not-a-date')).toBeInTheDocument()
  })

  it('virtualizes long conversation feeds', () => {
    const items = Array.from({ length: 50 }, (_, index) => ({
      ...conversationItem,
      id: `conversation-${index}`,
      body: `Comment ${index}`
    }))

    renderWithProviders(<PullRequestConversationTimeline items={items} />)

    expect(screen.getByText('Comment 0')).toBeInTheDocument()
    expect(screen.getByText('Comment 49')).toBeInTheDocument()
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })
})
