/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnalyzePullRequestWithAi } from './AnalyzePullRequestWithAi'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import type { GitHubPullRequest, GitHubPullRequestCommit, GitHubPullRequestFile } from '@shared/github'

const pr: GitHubPullRequest = {
  number: 7,
  title: 'Add feature',
  state: 'open',
  htmlUrl: 'https://github.com/o/r/pull/7',
  repository: { owner: 'o', repo: 'r' },
  user: 'dev',
  head: { ref: 'feature', sha: 'headsha' },
  base: { ref: 'main', sha: 'basesha' },
  body: 'Summary',
  draft: false,
  mergeable: true
}

const files: GitHubPullRequestFile[] = [
  { path: 'src/a.ts', status: 'modified', additions: 2, deletions: 1, changes: 3 },
  { path: 'src/b.ts', status: 'modified', additions: 1, deletions: 0, changes: 1 }
]

const commits: GitHubPullRequestCommit[] = [
  {
    sha: 'abc',
    subject: 'First change',
    message: 'First change',
    authorName: 'Dev',
    authorLogin: 'dev',
    committedAt: '2026-01-01T00:00:00Z'
  }
]

const analysisResponse = JSON.stringify({
  summary: 'Auth refactor',
  keyChanges: '- Refresh tokens',
  risks: 'Session expiry',
  reviewFocus: 'Token path',
  testingNotes: 'Run auth tests'
})

const refineResponse = JSON.stringify({
  message: 'I expanded the testing notes.',
  analysis: {
    summary: 'Auth refactor',
    keyChanges: '- Refresh tokens',
    risks: 'Session expiry edge cases',
    reviewFocus: 'Logout flow',
    testingNotes: 'Add logout regression test'
  }
})

describe('AnalyzePullRequestWithAi', () => {
  afterEach(() => {
    cleanup()
  })

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock({
      getSettings: vi.fn(async () => ({
        ...defaultMockSettings,
        aiEnabled: true,
        aiBaseUrl: 'http://localhost:1234'
      })),
      aiFill: vi.fn(async (params: { purpose?: string }) => {
        if (params?.purpose === 'refine_pull_request_analysis') {
          return refineResponse
        }
        return analysisResponse
      })
    })
  })

  it('runs full pull request analysis', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <AnalyzePullRequestWithAi pr={pr} files={files} commits={commits} selectedFilePaths={[]} />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analyze with AI' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Analyze with AI' }))
    expect(await screen.findByText('Auth refactor')).toBeInTheDocument()
    expect(window.gitfreddo.aiFill).toHaveBeenCalledWith(
      expect.objectContaining({
        purpose: 'analyze_pull_request',
        context: expect.objectContaining({
          prNumber: 7,
          analysisScope: 'full'
        })
      })
    )
  })

  it('refines analysis from a chat prompt', async () => {
    const user = userEvent.setup()

    renderWithProviders(
      <AnalyzePullRequestWithAi
        pr={pr}
        files={files}
        commits={commits}
        selectedFilePaths={['src/a.ts']}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Analyze with AI' })).toBeInTheDocument()
    })
    await user.click(screen.getByRole('button', { name: 'Analyze with AI' }))
    await screen.findByText('Auth refactor')

    await user.type(
      screen.getByPlaceholderText('Ask about risks, testing, or a specific file…'),
      'Focus on logout risks'
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(await screen.findByText('I expanded the testing notes.')).toBeInTheDocument()
    expect(screen.getByText('Logout flow')).toBeInTheDocument()
    expect(window.gitfreddo.aiFill).toHaveBeenLastCalledWith(
      expect.objectContaining({
        purpose: 'refine_pull_request_analysis',
        context: expect.objectContaining({
          userMessage: 'Focus on logout risks',
          analysisScope: 'partial'
        })
      })
    )
  })
})
