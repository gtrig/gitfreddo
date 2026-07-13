/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppUpdate } from './useAppUpdate'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'

import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import type { UpdateEvent } from '@shared/update'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string>) =>
      params ? `${key}:${JSON.stringify(params)}` : key
  })
}))

describe('useAppUpdate', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useToastStore.setState({ message: null, tone: 'info', show: vi.fn(), clear: vi.fn() })
    useOperationStore.setState({ count: 0, message: null, begin: vi.fn(), end: vi.fn() })
    vi.mocked(window.gitfreddo.getAppVersion).mockResolvedValue('0.2.8')
    vi.mocked(window.gitfreddo.checkForUpdates).mockResolvedValue(undefined)
    vi.mocked(window.gitfreddo.downloadUpdate).mockResolvedValue(undefined)
    vi.mocked(window.gitfreddo.installUpdate).mockImplementation(() => undefined)
    vi.mocked(window.gitfreddo.onUpdateEvent).mockImplementation(() => () => undefined)
  })

  it('loads current app version', async () => {
    const { result } = renderHook(() => useAppUpdate())
    await waitFor(() => expect(result.current.state.currentVersion).toBe('0.2.8'))
  })

  it('blocks install while git operations are running', () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    useOperationStore.setState({ count: 2, message: null, begin: vi.fn(), end: vi.fn() })

    const { result } = renderHook(() => useAppUpdate())
    act(() => {
      result.current.installUpdate()
    })

    expect(show).toHaveBeenCalled()
    expect(window.gitfreddo.installUpdate).not.toHaveBeenCalled()
  })

  it('shows a friendly message when the GitHub release feed is missing', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    let listener: ((event: UpdateEvent) => void) | undefined
    vi.mocked(window.gitfreddo.onUpdateEvent).mockImplementation((callback) => {
      listener = callback
      return () => undefined
    })

    const { result } = renderHook(() => useAppUpdate())
    await act(async () => {
      await result.current.checkForUpdates(true)
    })
    await act(async () => {
      listener?.({
        type: 'error',
        message:
          '404 "method: GET url: https://github.com/gtrig/gitfreddo/releases.atom\\n\\nPlease double check that your authentication token is correct."'
      })
    })

    expect(show).toHaveBeenCalledWith(
      'update.repoNotFound:{"repo":"gtrig/gitfreddo"}',
      'error'
    )
  })

  it('shows auth and network errors from manual update checks', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    let listener: ((event: UpdateEvent) => void) | undefined
    vi.mocked(window.gitfreddo.onUpdateEvent).mockImplementation((callback) => {
      listener = callback
      return () => undefined
    })

    const { result } = renderHook(() => useAppUpdate())
    await act(async () => {
      await result.current.checkForUpdates(true)
    })

    await act(async () => {
      listener?.({ type: 'error', message: '401 Unauthorized token invalid' })
    })
    expect(show).toHaveBeenCalledWith('update.authFailed', 'error')

    await act(async () => {
      await result.current.checkForUpdates(true)
    })
    await act(async () => {
      listener?.({ type: 'error', message: 'ENOTFOUND github.com' })
    })
    expect(show).toHaveBeenCalledWith('update.networkFailed', 'error')
  })

  it('shows download errors and up-to-date toast', async () => {
    const show = vi.fn()
    useToastStore.setState({ message: null, tone: 'info', show, clear: vi.fn() })
    let listener: ((event: UpdateEvent) => void) | undefined
    vi.mocked(window.gitfreddo.onUpdateEvent).mockImplementation((callback) => {
      listener = callback
      return () => undefined
    })
    vi.mocked(window.gitfreddo.downloadUpdate).mockRejectedValue(new Error('download failed'))

    const { result } = renderHook(() => useAppUpdate())
    await act(async () => {
      await result.current.downloadUpdate()
    })
    expect(show).toHaveBeenCalledWith('download failed', 'error')

    await act(async () => {
      await result.current.checkForUpdates(true)
    })
    await act(async () => {
      listener?.({ type: 'not-available', version: '0.3.9' })
    })
    expect(show).toHaveBeenCalledWith('update.upToDate:{"version":"0.3.9"}', 'success')
  })
})
