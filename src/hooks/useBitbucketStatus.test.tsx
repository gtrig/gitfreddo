/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useBitbucketStatus } from './useBitbucketStatus'
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
})
