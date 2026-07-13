/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useGitlabPullRequests,
  useInvalidateGitlabPullRequests
} from './useGitlabPullRequests'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitlabPullRequests', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.gitlabListPullRequests).mockResolvedValue([
      { number: 1, title: 'Feature', state: 'opened' }
    ] as never)
  })

  it('loads merge requests for the active repository', async () => {
    const { result } = renderHook(() => useGitlabPullRequests('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.gitlabListPullRequests).toHaveBeenCalledWith('/repo')
    expect(result.current.data?.[0]?.title).toBe('Feature')
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useGitlabPullRequests(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.gitlabListPullRequests).not.toHaveBeenCalled()
    })
  })

  it('invalidates merge request queries', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    function InvalidateWrapper({ children }: { children: ReactNode }) {
      return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }

    const { result } = renderHook(() => useInvalidateGitlabPullRequests(), {
      wrapper: InvalidateWrapper
    })

    await act(async () => {
      result.current('/repo')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['gitlab-pull-requests', '/repo']
    })
  })
})
