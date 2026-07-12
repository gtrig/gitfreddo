/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { PullRequestCommitsPanel } from './PullRequestCommitsPanel'
import { renderWithProviders } from '@/test/render'

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

const commits = [
  {
    sha: 'abc123def4567890123456789012345678901234',
    subject: 'feat: add auth',
    message: 'feat: add auth',
    authorName: 'Dev User',
    authorLogin: 'dev',
    committedAt: '2026-01-01T12:00:00Z'
  }
]

describe('PullRequestCommitsPanel', () => {
  afterEach(() => cleanup())

  it('shows loading, error, empty, and populated states', () => {
    const { rerender } = renderWithProviders(
      <PullRequestCommitsPanel commits={[]} loading error={null} />
    )
    expect(screen.getByText(/loading commits/i)).toBeInTheDocument()

    rerender(
      <PullRequestCommitsPanel commits={[]} error={new Error('Failed to load commits')} />
    )
    expect(screen.getByText('Failed to load commits')).toBeInTheDocument()

    rerender(<PullRequestCommitsPanel commits={[]} />)
    expect(screen.getByText(/no commits/i)).toBeInTheDocument()

    rerender(<PullRequestCommitsPanel commits={commits} />)
    expect(screen.getByText('feat: add auth')).toBeInTheDocument()
    expect(screen.getByText('dev')).toBeInTheDocument()
  })

  it('virtualizes large commit lists', () => {
    const many = Array.from({ length: 60 }, (_, index) => ({
      sha: `${index}`.padStart(40, '0'),
      subject: `Commit ${index}`,
      message: `Commit ${index}`,
      authorName: 'Dev User',
      authorLogin: 'dev',
      committedAt: '2026-01-01T12:00:00Z'
    }))

    renderWithProviders(<PullRequestCommitsPanel commits={many} />)
    expect(screen.getByText('Commit 0')).toBeInTheDocument()
    expect(screen.getByText('Commit 59')).toBeInTheDocument()
  })
})
