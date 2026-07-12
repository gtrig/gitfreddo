/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useOperationLogSubscription } from './useOperationLog'
import { useOperationStore } from '@/stores/operation'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import type { LogEntry } from '@shared/ipc'

describe('useOperationLogSubscription', () => {
  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null, output: '', hookResult: null })
    window.gitfreddo = createGitFreddoMock()
  })

  it('appends operation log messages to the operation store', () => {
    let handler: ((entry: LogEntry) => void) | undefined
    vi.mocked(window.gitfreddo.onLogEntry).mockImplementation((callback) => {
      handler = callback
      return () => undefined
    })

    renderHook(() => useOperationLogSubscription())
    handler?.({
      id: '1',
      stream: 'operation',
      level: 'info',
      timestamp: Date.now(),
      message: 'Running hook',
      details: 'output line'
    })

    expect(useOperationStore.getState().output).toContain('Running hook')
    expect(useOperationStore.getState().output).toContain('output line')
  })

  it('parses hook result messages into hookResult state', () => {
    let handler: ((entry: LogEntry) => void) | undefined
    vi.mocked(window.gitfreddo.onLogEntry).mockImplementation((callback) => {
      handler = callback
      return () => undefined
    })

    renderHook(() => useOperationLogSubscription())
    handler?.({
      id: '2',
      stream: 'operation',
      level: 'info',
      timestamp: Date.now(),
      message: 'hook:result:passed:pre-commit',
      details: 'all good'
    })

    expect(useOperationStore.getState().hookResult).toEqual({
      hookName: 'pre-commit',
      status: 'passed',
      details: 'all good'
    })
  })

  it('ignores non-operation log streams', () => {
    let handler: ((entry: LogEntry) => void) | undefined
    vi.mocked(window.gitfreddo.onLogEntry).mockImplementation((callback) => {
      handler = callback
      return () => undefined
    })

    renderHook(() => useOperationLogSubscription())
    handler?.({
      id: '3',
      stream: 'app',
      level: 'info',
      timestamp: Date.now(),
      message: 'ignored'
    })

    expect(useOperationStore.getState().output).toBe('')
  })
})
