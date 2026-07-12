/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGraphColors } from './useGraphColors'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGraphColors', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
  })

  it('returns graph color accessors for the active theme', async () => {
    const { result } = renderHook(() => useGraphColors(), { wrapper })
    await waitFor(() => expect(result.current.stash).toBe('#38bdf8'))
    expect(typeof result.current.lane).toBe('function')
    expect(result.current.stashStroke).toBe('#7dd3fc')
  })
})
