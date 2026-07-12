/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitHubStatus } from './useGitHubStatus'
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
})
