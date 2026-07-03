import { create } from 'zustand'
import { appLog } from '@/stores/logs'
import type { LogLevel } from '@shared/ipc'

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

export const TOAST_AUTO_DISMISS_MS = 5_000

let dismissTimer: ReturnType<typeof setTimeout> | undefined

function cancelDismissTimer() {
  if (dismissTimer !== undefined) {
    clearTimeout(dismissTimer)
    dismissTimer = undefined
  }
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  tone: 'info',
  show: (message, tone = 'info') => {
    appLog(toastToneToLogLevel(tone), message)
    cancelDismissTimer()
    set({ message, tone })
    dismissTimer = setTimeout(() => {
      dismissTimer = undefined
      set({ message: null })
    }, TOAST_AUTO_DISMISS_MS)
  },
  clear: () => {
    cancelDismissTimer()
    set({ message: null })
  }
}))
