import { create } from 'zustand'

interface ToastState {
  message: string | null
  tone: 'success' | 'error' | 'info'
  show: (message: string, tone?: ToastState['tone']) => void
  clear: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => set({ message, tone }),
  clear: () => set({ message: null })
}))
