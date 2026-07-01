import { create } from 'zustand'
import { appLog } from '@/stores/logs'
import type { LogLevel } from '../../shared/ipc'

interface ToastState {
  message: string | null
  tone: 'success' | 'error' | 'info'
  show: (message: string, tone?: ToastState['tone']) => void
  clear: () => void
}

function toastToneToLogLevel(tone: ToastState['tone']): LogLevel {
  if (tone === 'error') return 'error'
  return 'info'
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => {
    appLog(toastToneToLogLevel(tone), message)
    set({ message, tone })
  },
  clear: () => set({ message: null })
}))
