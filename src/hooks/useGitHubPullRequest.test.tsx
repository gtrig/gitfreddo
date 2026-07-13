/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useGitHubPullRequest,
  useGitHubPullRequestCommits,
  useGitHubPullRequestFiles,
  useGitHubPullRequestReviewThreads,
  useGitHubPullRequestTimeline,
  useInvalidateGitHubPullRequestDetail
} from './useGitHubPullRequest'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitHubPullRequest hooks', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubGetPullRequest).mockResolvedValue({
      number: 42,
      title: 'Feature',
      state: 'open'
    } as never)
    vi.mocked(window.gitfreddo.githubListPullRequestFiles).mockResolvedValue([
      { path: 'README.md', status: 'modified', additions: 1, deletions: 0, changes: 1 }
    ])
    vi.mocked(window.gitfreddo.githubListPullRequestCommits).mockResolvedValue([
      { sha: 'abc', message: 'Commit' }
    ] as never)
    vi.mocked(window.gitfreddo.githubListPullRequestReviewThreads).mockResolvedValue([] as never)
    vi.mocked(window.gitfreddo.githubListPullRequestConversationComments).mockResolvedValue([
      { id: 1, body: 'Looks good', createdAt: '2024-01-01T00:00:00Z', user: 'alice' }
    ] as never)
    vi.mocked(window.gitfreddo.githubListPullRequestReviewComments).mockResolvedValue([] as never)
    vi.mocked(window.gitfreddo.githubListPullRequestReviews).mockResolvedValue([] as never)
  })

  it('loads pull request details with repository context', async () => {
    const { result } = renderHook(
      () =>
        useGitHubPullRequest('/repo', 42, { owner: 'acme', repo: 'app' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.githubGetPullRequest).toHaveBeenCalledWith('/repo', 42, {
      owner: 'acme',
      repo: 'app'
    })
  })

  it('loads pull request files and commits', async () => {
    const repository = { owner: 'acme', repo: 'app' }
    const files = renderHook(
      () => useGitHubPullRequestFiles('/repo', 42, repository),
      { wrapper }
    )
    const commits = renderHook(
      () => useGitHubPullRequestCommits('/repo', 42, repository),
      { wrapper }
    )

    await waitFor(() => expect(files.result.current.isSuccess).toBe(true))
    await waitFor(() => expect(commits.result.current.isSuccess).toBe(true))
    expect(files.result.current.data?.[0]?.path).toBe('README.md')
    expect(commits.result.current.data?.[0]?.sha).toBe('abc')
  })

  it('loads review threads', async () => {
    const { result } = renderHook(
      () => useGitHubPullRequestReviewThreads('/repo', 42, { owner: 'acme', repo: 'app' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.githubListPullRequestReviewThreads).toHaveBeenCalled()
  })

  it('merges conversation, review comments, and reviews into a timeline', async () => {
    const { result } = renderHook(
      () => useGitHubPullRequestTimeline('/repo', 42, { owner: 'acme', repo: 'app' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('stays idle without repo path or number', async () => {
    renderHook(() => useGitHubPullRequest(null, null, null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.githubGetPullRequest).not.toHaveBeenCalled()
    })
  })

  it('invalidates pull request detail queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function InvalidateWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useInvalidateGitHubPullRequestDetail(), {
      wrapper: InvalidateWrapper
    })

    await act(async () => {
      result.current('/repo', 42)
    })

    expect(invalidateSpy).toHaveBeenCalled()
  })
})
