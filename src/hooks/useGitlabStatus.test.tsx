/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitlabStatus, useInvalidateGitlabStatus, useSetGitlabStatus } from './useGitlabStatus'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitlabStatus', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.gitlabGetStatus).mockResolvedValue({
      connected: true,
      login: 'gl-user',
      avatarUrl: null,
      authType: null,
      sshKeyTitle: null,
      host: 'gitlab.com'
    })
  })

  it('loads GitLab connection status', async () => {
    const { result } = renderHook(() => useGitlabStatus(), { wrapper })
    await waitFor(() => expect(result.current.data?.connected).toBe(true))
    expect(result.current.data?.login).toBe('gl-user')
  })

  it('invalidates cached GitLab status', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const invalidateWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInvalidateGitlabStatus(), { wrapper: invalidateWrapper })
    await act(async () => {
      await result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['gitlab-status'] })
  })

  it('sets GitLab status in the query cache', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const setWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSetGitlabStatus(), { wrapper: setWrapper })
    act(() => {
      result.current({
        connected: false,
        login: null,
        avatarUrl: null,
        authType: null,
        sshKeyTitle: null,
        host: 'gitlab.com'
      })
    })

    expect(queryClient.getQueryData(['gitlab-status'])).toEqual({
      connected: false,
      login: null,
      avatarUrl: null,
      authType: null,
      sshKeyTitle: null,
      host: 'gitlab.com'
    })
  })
})
