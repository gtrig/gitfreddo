/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditIssueModal } from './EditIssueModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useToastStore } from '@/stores/toast'
import type { GitHubIssue } from '@shared/github'

const issue: GitHubIssue = {
  number: 42,
  title: 'Fix login bug',
  state: 'open',
  htmlUrl: 'https://github.com/acme/app/issues/42',
  user: 'dev',
  body: 'Steps to reproduce…',
  labels: []
}

const showToast = vi.fn()

describe('GitHub EditIssueModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
  })

  it('renders issue fields when open', () => {
    renderWithProviders(
      <EditIssueModal
        open
        issue={issue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Fix login bug')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Steps to reproduce…')).toBeInTheDocument()
  })

  it('resets fields when reopened with a different issue', () => {
    const { rerender } = renderWithProviders(
      <EditIssueModal
        open={false}
        issue={issue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    const updatedIssue = { ...issue, number: 43, title: 'New title', body: 'New body' }
    rerender(
      <EditIssueModal
        open
        issue={updatedIssue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('New title')).toBeInTheDocument()
    expect(screen.getByDisplayValue('New body')).toBeInTheDocument()
  })

  it('requires a non-empty title before saving', async () => {
    renderWithProviders(
      <EditIssueModal
        open
        issue={issue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    await userEvent.clear(screen.getByDisplayValue('Fix login bug'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(showToast).toHaveBeenCalledWith('Issue title is required.', 'error')
    expect(window.gitfreddo.githubUpdateIssue).not.toHaveBeenCalled()
  })

  it('updates the issue and closes on success', async () => {
    const onClose = vi.fn()
    const onUpdated = vi.fn()

    renderWithProviders(
      <EditIssueModal
        open
        issue={issue}
        repoPath="/tmp/repo"
        onClose={onClose}
        onUpdated={onUpdated}
      />
    )

    const titleInput = screen.getByDisplayValue('Fix login bug')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Updated title')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubUpdateIssue).toHaveBeenCalledWith('/tmp/repo', 42, {
        title: 'Updated title',
        body: 'Steps to reproduce…'
      })
    })
    expect(onUpdated).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Issue updated.', 'success')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows API errors from update', async () => {
    vi.mocked(window.gitfreddo.githubUpdateIssue).mockRejectedValue(new Error('Forbidden'))

    renderWithProviders(
      <EditIssueModal
        open
        issue={issue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Forbidden', 'error')
    })
  })

  it('calls onClose from cancel button', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <EditIssueModal
        open
        issue={issue}
        repoPath="/tmp/repo"
        onClose={onClose}
        onUpdated={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
