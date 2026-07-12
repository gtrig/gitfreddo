/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { DiffLineCommentBlocks } from './DiffLineCommentBlocks'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequestReviewThread } from '@shared/github'

const thread: GitHubPullRequestReviewThread = {
  id: 'PRRT_test',
  isResolved: false,
  isOutdated: false,
  path: 'src/app.ts',
  line: 10,
  comments: [
    {
      id: 1,
      body: 'Consider renaming',
      user: 'alice',
      createdAt: '2026-01-01T00:00:00Z',
      path: 'src/app.ts',
      line: 10
    }
  ]
}

describe('DiffLineCommentBlocks', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    vi.mocked(window.gitfreddo.githubReplyPullRequestReviewComment).mockResolvedValue(undefined)
  })

  it('returns null when there are no review threads', () => {
    const { container } = renderWithProviders(
      <DiffLineCommentBlocks threads={[]} prNumber={1} repository={{ owner: 'o', repo: 'r' }} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders compact review thread cards for each thread', () => {
    renderWithProviders(
      <DiffLineCommentBlocks
        threads={[thread]}
        prNumber={3}
        repository={{ owner: 'org', repo: 'app' }}
        onUpdated={vi.fn()}
      />
    )
    expect(screen.getByText('Consider renaming')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reply' })).toBeInTheDocument()
  })
})
