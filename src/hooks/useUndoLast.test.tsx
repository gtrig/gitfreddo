/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useUndoLast } from './useUndoLast'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'

const mutateAsync = vi.fn()
const showToast = vi.fn()

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, params?: Record<string, string>) =>
    params?.subject ? `${key}:${params.subject}` : key })
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    undoLast: { mutateAsync, isPending: false }
  })
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useUndoLast', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useWorkspaceStore.setState({
      tabs: [{ path: '/repo', connected: true, connecting: false }],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    mutateAsync.mockResolvedValue({ subject: 'Fix bug' })
  })

  it('shows an error when no repository is connected', async () => {
    useWorkspaceStore.setState({ connected: false })
    const { result } = renderHook(() => useUndoLast(), { wrapper })

    await act(async () => {
      await result.current.performUndo()
    })

    expect(showToast).toHaveBeenCalledWith('toast.noRepoConnected', 'error')
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('undoes the last action and shows success toast', async () => {
    const { result } = renderHook(() => useUndoLast(), { wrapper })

    await act(async () => {
      await result.current.performUndo()
    })

    expect(mutateAsync).toHaveBeenCalledWith(undefined)
    expect(showToast).toHaveBeenCalledWith('toast.undo.success:Fix bug', 'success')
  })

  it('shows an error toast when undo fails', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('nothing to undo'))
    const { result } = renderHook(() => useUndoLast(), { wrapper })

    await act(async () => {
      await result.current.performUndo()
    })

    expect(showToast).toHaveBeenCalledWith('nothing to undo', 'error')
  })

  it('handles Ctrl/Cmd+Z outside editable targets', async () => {
    const { result } = renderHook(() => useUndoLast(), { wrapper })

    await act(async () => {
      result.current.handleUndoKeyDown(
        new KeyboardEvent('keydown', { key: 'z', ctrlKey: true })
      )
    })

    expect(mutateAsync).toHaveBeenCalled()
  })

  it('ignores undo shortcut inside inputs and with shift held', () => {
    const { result } = renderHook(() => useUndoLast(), { wrapper })
    const input = document.createElement('input')
    document.body.appendChild(input)

    act(() => {
      const shiftEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, shiftKey: true })
      result.current.handleUndoKeyDown(shiftEvent)

      const inputEvent = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
      Object.defineProperty(inputEvent, 'target', { value: input })
      result.current.handleUndoKeyDown(inputEvent)
    })

    expect(mutateAsync).not.toHaveBeenCalled()
    input.remove()
  })

  it('prevents default when the shortcut is handled', () => {
    const { result } = renderHook(() => useUndoLast(), { wrapper })
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, cancelable: true })
    const preventDefault = vi.spyOn(event, 'preventDefault')

    act(() => {
      result.current.handleUndoKeyDown(event)
    })

    expect(preventDefault).toHaveBeenCalled()
  })

  it('ignores keydown on contenteditable elements', () => {
    const { result } = renderHook(() => useUndoLast(), { wrapper })
    const editable = document.createElement('div')
    editable.setAttribute('contenteditable', 'true')
    document.body.appendChild(editable)

    act(() => {
      const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true })
      Object.defineProperty(event, 'target', { value: editable })
      result.current.handleUndoKeyDown(event)
    })

    expect(mutateAsync).not.toHaveBeenCalled()
    editable.remove()
  })
})
