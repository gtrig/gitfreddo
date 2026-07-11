import { create } from 'zustand'

export interface HookExecutionResult {
  hookName: string
  status: 'passed' | 'failed'
  details?: string
}

interface OperationState {
  count: number
  message: string | null
  output: string
  hookResult: HookExecutionResult | null
  begin: (message?: string) => void
  end: () => void
  appendOutput: (text: string) => void
  setHookResult: (result: HookExecutionResult) => void
}

export const useOperationStore = create<OperationState>((set) => ({
  count: 0,
  message: null,
  output: '',
  hookResult: null,
  begin: (message) => {
    set((state) => {
      const count = state.count + 1
      const resetSession = state.count === 0
      return {
        count,
        message: message ?? state.message,
        output: resetSession ? '' : state.output,
        hookResult: resetSession ? null : state.hookResult
      }
    })
  },
  end: () => {
    set((state) => {
      const count = Math.max(0, state.count - 1)
      return {
        count,
        message: count === 0 ? null : state.message,
        output: count === 0 ? '' : state.output,
        hookResult: count === 0 ? null : state.hookResult
      }
    })
  },
  appendOutput: (text) => {
    const chunk = text.trim()
    if (!chunk) return
    set((state) => ({
      output: state.output ? `${state.output}\n${chunk}` : chunk
    }))
  },
  setHookResult: (hookResult) => set({ hookResult })
}))

export async function runGlobalOperation<T>(
  fn: () => Promise<T>,
  message?: string
): Promise<T> {
  const { begin, end } = useOperationStore.getState()
  begin(message)
  try {
    return await fn()
  } finally {
    end()
  }
}

export function showHookExecutionToast(
  showToast: (message: string, tone?: 'success' | 'error' | 'info') => void,
  t: (key: string, options?: Record<string, string>) => string,
  hookResult: HookExecutionResult
): void {
  if (hookResult.status === 'passed') {
    showToast(t('toast.hook.passed', { name: hookResult.hookName }), 'success')
    return
  }
  const message = hookResult.details
    ? `${t('toast.hook.failed', { name: hookResult.hookName })}\n${hookResult.details}`
    : t('toast.hook.failed', { name: hookResult.hookName })
  showToast(message, 'error')
}
