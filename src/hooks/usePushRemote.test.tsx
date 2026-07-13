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

  it('opens force-push confirmation on non-fast-forward errors', async () => {
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(
      new Error('! [rejected] main -> main (non-fast-forward)')
    )

    const { result } = renderHook(() => usePushRemote(), { wrapper })
    await act(async () => {
      result.current.pushRemote({ remote: 'origin', branch: 'main' })
    })

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(result.current.forceConfirm).toEqual({ remote: 'origin', branch: 'main' })
  })

  it('confirms force push and clears the confirmation state on success', async () => {
    vi.mocked(window.gitfreddo.invoke)
      .mockRejectedValueOnce(
        new Error('! [rejected] main -> main (non-fast-forward)')
      )
      .mockResolvedValueOnce(undefined)

    const { result } = renderHook(() => usePushRemote(), { wrapper })
    await act(async () => {
      result.current.pushRemote({ remote: 'origin' })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    await act(async () => {
      result.current.confirmForcePush()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    expect(window.gitfreddo.invoke).toHaveBeenLastCalledWith('push', {
      remote: 'origin',
      force: true
    })
    expect(result.current.forceConfirm).toBeNull()
  })

  it('cancels force-push confirmation', async () => {
    vi.mocked(window.gitfreddo.invoke).mockRejectedValue(
      new Error('! [rejected] main -> main (non-fast-forward)')
    )

    const { result } = renderHook(() => usePushRemote(), { wrapper })
    await act(async () => {
      result.current.pushRemote({ remote: 'origin' })
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
    })

    act(() => {
      result.current.cancelForcePush()
    })

    expect(result.current.forceConfirm).toBeNull()
  })
})
