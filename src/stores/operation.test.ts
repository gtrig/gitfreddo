import { beforeEach, describe, expect, it, vi } from 'vitest'
import { runGlobalOperation, showHookExecutionToast, useOperationStore } from '@/stores/operation'

describe('useOperationStore', () => {
  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null, output: '', hookResult: null })
  })

  it('tracks nested operations', () => {
    const { begin, end } = useOperationStore.getState()
    begin('Working')
    begin()
    expect(useOperationStore.getState().count).toBe(2)
    expect(useOperationStore.getState().message).toBe('Working')

    end()
    expect(useOperationStore.getState().count).toBe(1)
    expect(useOperationStore.getState().message).toBe('Working')

    end()
    expect(useOperationStore.getState().count).toBe(0)
    expect(useOperationStore.getState().message).toBeNull()
  })

  it('resets hook output when a new operation session starts', () => {
    const { begin, appendOutput, end } = useOperationStore.getState()
    begin('First')
    appendOutput('hook output')
    end()
    begin('Second')
    expect(useOperationStore.getState().output).toBe('')
  })

  it('stores hook results and appends output', () => {
    const { begin, appendOutput, setHookResult, end } = useOperationStore.getState()
    begin('Hook')
    appendOutput('line 1\n')
    setHookResult({ status: 'passed', hookName: 'pre-commit' })
    expect(useOperationStore.getState().output).toContain('line 1')
    expect(useOperationStore.getState().hookResult?.hookName).toBe('pre-commit')
    end()
  })
})

describe('runGlobalOperation', () => {
  beforeEach(() => {
    useOperationStore.setState({ count: 0, message: null, output: '', hookResult: null })
  })

  it('always ends the operation even when the task throws', async () => {
    await expect(
      runGlobalOperation(async () => {
        throw new Error('boom')
      }, 'Saving')
    ).rejects.toThrow('boom')

    expect(useOperationStore.getState().count).toBe(0)
  })

  it('returns the task result', async () => {
    const value = await runGlobalOperation(async () => 42, 'Loading')
    expect(value).toBe(42)
    expect(useOperationStore.getState().count).toBe(0)
  })
})

describe('showHookExecutionToast', () => {
  it('shows success toast for passing hooks', () => {
    const showToast = vi.fn()
    const t = vi.fn((key: string, options?: Record<string, string>) =>
      key === 'toast.hook.passed' ? `Passed ${options?.name}` : key
    )

    showHookExecutionToast(showToast, t, { status: 'passed', hookName: 'pre-commit' })
    expect(showToast).toHaveBeenCalledWith('Passed pre-commit', 'success')
  })

  it('shows error toast with details when a hook fails', () => {
    const showToast = vi.fn()
    const t = vi.fn((key: string, options?: Record<string, string>) =>
      key === 'toast.hook.failed' ? `Failed ${options?.name}` : key
    )

    showHookExecutionToast(showToast, t, {
      status: 'failed',
      hookName: 'commit-msg',
      details: 'subject too long'
    })
    expect(showToast).toHaveBeenCalledWith('Failed commit-msg\nsubject too long', 'error')
  })
})
