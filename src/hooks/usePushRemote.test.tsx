/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { usePushRemote } from './usePushRemote'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('usePushRemote', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [{ path: '/repo', connected: true, connecting: false }],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    useOperationStore.setState({
      count: 0,
      message: null,
      output: '',
      hookResult: null,
      begin: vi.fn(),
      end: vi.fn(),
      appendOutput: vi.fn(),
      setHookResult: vi.fn()
    })
    vi.mocked(window.gitfreddo.invoke).mockResolvedValue(undefined)
  })

  it('pushes to the active repository', async () => {
    const { result } = renderHook(() => usePushRemote(), { wrapper })
    await act(async () => {
      result.current.pushRemote({ remote: 'origin' })
    })
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('push', { remote: 'origin' })
  })
})
