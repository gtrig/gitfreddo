/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBitbucketIssues, useInvalidateBitbucketIssues } from './useBitbucketIssues'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useBitbucketIssues', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketListIssues).mockResolvedValue([
      {
        number: 1,
        title: 'Bug',
        state: 'open',
        htmlUrl: 'https://bitbucket.org/test/repo/issues/1',
        user: 'test',
        body: '',
        labels: []
      }
    ])
  })

  it('loads issues for the active repository', async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result } = renderHook(() => useBitbucketIssues('/tmp/repo', 'me'), {
      wrapper: createWrapper(queryClient)
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(window.gitfreddo.bitbucketListIssues).toHaveBeenCalledWith('/tmp/repo', 'me')
  })

  it('invalidates bitbucket issue queries', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateBitbucketIssues(), {
      wrapper: createWrapper(queryClient)
    })

    result.current('/tmp/repo')
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bitbucket-issues', '/tmp/repo'] })
  })
})
