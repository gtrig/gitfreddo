/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useGitHubStatus,
  useInvalidateGitHubStatus,
  useSetGitHubStatus
} from './useGitHubStatus'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitHubStatus', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubGetStatus).mockResolvedValue({
      connected: true,
      login: 'octo',
      avatarUrl: null,
      sshKeyTitle: null
    })
  })

  it('loads GitHub connection status', async () => {
    const { result } = renderHook(() => useGitHubStatus(), { wrapper })
    await waitFor(() => expect(result.current.data?.connected).toBe(true))
    expect(result.current.data?.login).toBe('octo')
  })

  it('invalidates cached GitHub status', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const invalidateWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useInvalidateGitHubStatus(), { wrapper: invalidateWrapper })
    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['github-status'] })
  })

  it('sets GitHub status in the query cache', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const setWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useSetGitHubStatus(), { wrapper: setWrapper })
    act(() => {
      result.current({ connected: false, login: null, avatarUrl: null, sshKeyTitle: null })
    })

    expect(queryClient.getQueryData(['github-status'])).toEqual({
      connected: false,
      login: null,
      avatarUrl: null,
      sshKeyTitle: null
    })
  })
})
