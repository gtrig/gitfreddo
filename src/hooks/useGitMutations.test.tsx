/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitMutations } from './useGitMutations'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitMutations', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
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

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invokes git IPC methods for the active repository', async () => {
    const { result } = renderHook(() => useGitMutations(), { wrapper })

    await act(async () => {
      await result.current.fetch.mutateAsync(undefined)
    })

    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('fetch', undefined)
  })

  it('shows a success toast for remote actions', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })

    const { result } = renderHook(() => useGitMutations(), { wrapper })
    await act(async () => {
      await result.current.push.mutateAsync(undefined)
    })
    await act(async () => {
      vi.runAllTimers()
    })

    expect(show).toHaveBeenCalledWith('toast.push.success', 'success')
  })

  it('throws when no repository is connected', async () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      workspacePath: null,
      connected: false
    })

    const { result } = renderHook(() => useGitMutations(), { wrapper })

    await expect(result.current.commit.mutateAsync(undefined)).rejects.toThrow('toast.noRepoConnected')
  })

  it('invalidates related queries after a successful mutation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useGitMutations(), { wrapper: localWrapper })
    await act(async () => {
      await result.current.stageAdd.mutateAsync({ paths: ['file.ts'] })
    })
    await waitFor(() => expect(invalidateSpy).toHaveBeenCalled())
  })
})
