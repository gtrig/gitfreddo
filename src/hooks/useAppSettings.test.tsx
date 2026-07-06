/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAiEnabled } from './useAppSettings'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useAiEnabled', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
  })

  it('returns false when AI assist is disabled in settings', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      aiEnabled: false,
      aiBaseUrl: 'http://localhost:1234'
    })

    const { result } = renderHook(() => useAiEnabled(), { wrapper })
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('returns true when AI assist is enabled in settings', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      aiEnabled: true,
      aiBaseUrl: 'http://localhost:1234'
    })

    const { result } = renderHook(() => useAiEnabled(), { wrapper })
    await waitFor(() => expect(result.current).toBe(true))
  })
})
