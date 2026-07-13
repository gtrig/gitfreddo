/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useBitbucketPullRequests,
  useInvalidateBitbucketPullRequests
} from './useBitbucketPullRequests'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useBitbucketPullRequests', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketListPullRequests).mockResolvedValue([
      { id: 1, title: 'Feature', state: 'OPEN' }
    ] as never)
  })

  it('loads pull requests for the active repository', async () => {
    const { result } = renderHook(() => useBitbucketPullRequests('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.bitbucketListPullRequests).toHaveBeenCalledWith('/repo')
    expect(result.current.data?.[0]?.title).toBe('Feature')
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useBitbucketPullRequests(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.bitbucketListPullRequests).not.toHaveBeenCalled()
    })
  })

  it('invalidates pull request queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function InvalidateWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useInvalidateBitbucketPullRequests(), {
      wrapper: InvalidateWrapper
    })

    await act(async () => {
      result.current('/repo')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['bitbucket-pull-requests', '/repo']
    })
  })
})
