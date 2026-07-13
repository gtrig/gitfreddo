/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useGitHubPullRequests,
  useInvalidateGitHubPullRequests
} from './useGitHubPullRequests'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitHubPullRequests', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubListPullRequests).mockResolvedValue([
      { number: 42, title: 'Feature', state: 'open' }
    ] as never)
  })

  it('loads pull requests for the active repository', async () => {
    const { result } = renderHook(() => useGitHubPullRequests('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.githubListPullRequests).toHaveBeenCalledWith('/repo')
    expect(result.current.data?.[0]?.number).toBe(42)
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useGitHubPullRequests(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.githubListPullRequests).not.toHaveBeenCalled()
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

    const { result } = renderHook(() => useInvalidateGitHubPullRequests(), {
      wrapper: InvalidateWrapper
    })

    await act(async () => {
      result.current('/repo')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['github-pull-requests', '/repo']
    })
  })
})
