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
import type { GitlabIssue } from '@shared/gitlab'

const issue: GitlabIssue = {
  number: 7,
  title: 'Broken build',
  state: 'open',
  htmlUrl: 'https://gitlab.com/acme/app/-/issues/7',
  user: 'dev',
  body: 'CI fails on main',
  labels: []
}

const showToast = vi.fn()

describe('GitLab EditIssueModal', () => {
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
    expect(screen.getByDisplayValue('Broken build')).toBeInTheDocument()
    expect(screen.getByDisplayValue('CI fails on main')).toBeInTheDocument()
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

    const updatedIssue = { ...issue, number: 8, title: 'Another issue', body: 'Details' }
    rerender(
      <EditIssueModal
        open
        issue={updatedIssue}
        repoPath="/tmp/repo"
        onClose={vi.fn()}
        onUpdated={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('Another issue')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Details')).toBeInTheDocument()
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

    await userEvent.clear(screen.getByDisplayValue('Broken build'))
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    expect(showToast).toHaveBeenCalledWith('Issue title is required.', 'error')
    expect(window.gitfreddo.gitlabUpdateIssue).not.toHaveBeenCalled()
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

    const titleInput = screen.getByDisplayValue('Broken build')
    await userEvent.clear(titleInput)
    await userEvent.type(titleInput, 'Fixed build')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabUpdateIssue).toHaveBeenCalledWith('/tmp/repo', 7, {
        title: 'Fixed build',
        body: 'CI fails on main'
      })
    })
    expect(onUpdated).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith('Issue updated.', 'success')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows API errors from update', async () => {
    vi.mocked(window.gitfreddo.gitlabUpdateIssue).mockRejectedValue(new Error('Not allowed'))

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
      expect(showToast).toHaveBeenCalledWith('Not allowed', 'error')
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
