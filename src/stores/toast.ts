import { create } from 'zustand'
import { appLog } from '@/stores/logs'
import { humanizeErrorMessage } from '@/lib/format/errorMessage'
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
    // Error toasts are often raw git/network stderr, which reads as noise to
    // most users. Show a short, actionable sentence instead, but keep the
    // original text in the log's details so it's still there for debugging.
    const displayMessage = tone === 'error' ? humanizeErrorMessage(message) : message
    const details = displayMessage !== message ? message : undefined
    appLog(toastToneToLogLevel(tone), displayMessage, details)
    cancelDismissTimer()
    set({ message: displayMessage, tone })
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
