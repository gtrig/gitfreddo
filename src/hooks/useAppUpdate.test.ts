/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppUpdate } from './useAppUpdate'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'

import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

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
})
