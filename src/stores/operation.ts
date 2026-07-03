import { create } from 'zustand'

interface OperationState {
  count: number
  message: string | null
  begin: (message?: string) => void
  end: () => void
}

export const useOperationStore = create<OperationState>((set) => ({
  count: 0,
  message: null,
  begin: (message) => {
    set((state) => ({
      count: state.count + 1,
      message: message ?? state.message
    }))
  },
  end: () => {
    set((state) => {
      const count = Math.max(0, state.count - 1)
      return { count, message: count === 0 ? null : state.message }
    })
  }
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
