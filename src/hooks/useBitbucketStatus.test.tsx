/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBitbucketStatus, useInvalidateBitbucketStatus, useSetBitbucketStatus } from './useBitbucketStatus'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useBitbucketStatus', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketGetStatus).mockResolvedValue({
      connected: true,
      login: 'bb-user',
      avatarUrl: null,
      authType: null,
      sshKeyTitle: null
    })
  })

  it('loads Bitbucket connection status', async () => {
    const { result } = renderHook(() => useBitbucketStatus(), { wrapper })
    await waitFor(() => expect(result.current.data?.connected).toBe(true))
    expect(result.current.data?.login).toBe('bb-user')
  })

  it('invalidates cached Bitbucket status', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const invalidateWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInvalidateBitbucketStatus(), { wrapper: invalidateWrapper })
    await act(async () => {
      await result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['bitbucket-status'] })
  })

  it('sets Bitbucket status in the query cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const setWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSetBitbucketStatus(), { wrapper: setWrapper })
    act(() => {
      result.current({
        connected: false,
        login: null,
        avatarUrl: null,
        authType: null,
        sshKeyTitle: null
      })
    })

    expect(queryClient.getQueryData(['bitbucket-status'])).toEqual({
      connected: false,
      login: null,
      avatarUrl: null,
      authType: null,
      sshKeyTitle: null
    })
  })
})
