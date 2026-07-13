/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAiFill } from './useAiFill'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useOperationStore } from '@/stores/operation'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useAiFill', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useOperationStore.setState({ count: 0, message: null, begin: vi.fn(), end: vi.fn() })
    vi.mocked(window.gitfreddo.aiFill).mockResolvedValue('filled text')
  })

  it('calls aiFill when available', async () => {
    const begin = vi.fn()
    const end = vi.fn()
    useOperationStore.setState({ count: 0, message: null, begin, end })

    const { result } = renderHook(() => useAiFill(), { wrapper })
    await act(async () => {
      await result.current.mutateAsync({
        purpose: 'commit_message',
        context: { branch: 'main' }
      })
    })

    expect(window.gitfreddo.aiFill).toHaveBeenCalledWith({
      purpose: 'commit_message',
      context: { branch: 'main' }
    })
    expect(begin).toHaveBeenCalledWith('AI is working…')
    expect(end).toHaveBeenCalled()
  })

  it('falls back to invoke when aiFill is unavailable', async () => {
    const api = createGitFreddoMock()
    ;(api as { aiFill?: unknown }).aiFill = undefined
    window.gitfreddo = api
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue('via ipc')

    const { result } = renderHook(() => useAiFill(), { wrapper })
    await act(async () => {
      const text = await result.current.mutateAsync({
        purpose: 'commit_message',
        context: { branch: 'main' }
      })
      expect(text).toBe('via ipc')
    })

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('ai.fill', {
      purpose: 'commit_message',
      context: { branch: 'main' }
    })
  })

  it('ends the operation overlay when the request fails', async () => {
    const end = vi.fn()
    useOperationStore.setState({ count: 0, message: null, begin: vi.fn(), end })
    vi.mocked(window.gitfreddo.aiFill).mockRejectedValue(new Error('model offline'))

    const { result } = renderHook(() => useAiFill(), { wrapper })
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          purpose: 'commit_message',
          context: { branch: 'main' }
        })
      ).rejects.toThrow(/model offline/)
    })

    await waitFor(() => expect(end).toHaveBeenCalled())
  })
})
