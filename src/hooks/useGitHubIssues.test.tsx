/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitHubIssues, useInvalidateGitHubIssues } from './useGitHubIssues'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useGitHubIssues', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubListIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Bug',
        state: 'open',
        htmlUrl: 'https://github.com/test/repo/issues/1',
        user: 'test',
        body: '',
        labels: []
      }
    ])
  })

  it('loads issues for the active repository', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGitHubIssues('/tmp/repo', 'me'), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(window.gitfreddo.githubListIssues).toHaveBeenCalledWith('/tmp/repo', 'me')
  })

  it('returns empty data when repo path is null', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useGitHubIssues(null), {
      wrapper: createWrapper(queryClient)
    })

    expect(result.current.fetchStatus).toBe('idle')
    expect(window.gitfreddo.githubListIssues).not.toHaveBeenCalled()
  })

  it('invalidates github issue queries', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateGitHubIssues(), {
      wrapper: createWrapper(queryClient)
    })

    result.current('/tmp/repo')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['github-issues', '/tmp/repo'] })
  })
})
