import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PullRequestDetailScreen } from './PullRequestDetailScreen'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import type { GitHubPullRequest } from '@shared/github'

const pr: GitHubPullRequest = {
  number: 7,
  title: 'Add feature',
  state: 'open',
  htmlUrl: 'https://github.com/o/r/pull/7',
  user: 'dev',
  head: { ref: 'feature', sha: 'abc' },
  base: { ref: 'main', sha: 'def' },
  body: 'Summary',
  draft: false,
  mergeable: true
}

describe('PullRequestDetailScreen', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false,
      prDetailNumber: 7
    })
    vi.mocked(window.gitfreddo.githubGetPullRequest).mockResolvedValue(pr)
    vi.mocked(window.gitfreddo.githubListPullRequestFiles).mockResolvedValue([
      {
        path: 'src/a.ts',
        status: 'modified',
        additions: 2,
        deletions: 1,
        changes: 3
      }
    ])
  })

  it('renders pull request detail when opened from the sidebar', async () => {
    renderWithProviders(<PullRequestDetailScreen />)

    expect(await screen.findByText('Add feature')).toBeInTheDocument()
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0)
    expect(await screen.findByText('src/a.ts')).toBeInTheDocument()
  })

  it('closes when the close button is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<PullRequestDetailScreen />)

    await screen.findByText('Add feature')
    await user.click(screen.getByRole('button', { name: /close/i }))

    expect(useWorkspaceStore.getState().prDetailNumber).toBeNull()
  })
})
