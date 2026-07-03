import { create } from 'zustand'
import type { LogEntry, LogLevel, LogStream } from '@shared/ipc'

const MAX_ENTRIES = 500

export type LogTab = LogStream

interface LogState {
  open: boolean
  height: number
  activeTab: LogTab
  gitListening: boolean
  gitEntries: LogEntry[]
  appEntries: LogEntry[]
  append: (entry: LogEntry) => void
  clear: (stream: LogStream) => void
  setOpen: (open: boolean) => void
  toggleOpen: () => void
  setHeight: (height: number) => void
  setActiveTab: (tab: LogTab) => void
  setGitListening: (listening: boolean) => void
}

function trimEntries(entries: LogEntry[]): LogEntry[] {
  if (entries.length <= MAX_ENTRIES) return entries
  return entries.slice(entries.length - MAX_ENTRIES)
}

export const useLogStore = create<LogState>((set, get) => ({
  open: false,
  height: 220,
  activeTab: 'app',
  gitListening: false,
  gitEntries: [],
  appEntries: [],

  append: (entry) => {
    const key = entry.stream === 'git' ? 'gitEntries' : 'appEntries'
    const current = get()[key]
    set({ [key]: trimEntries([...current, entry]) })
  },

  clear: (stream) => {
    if (stream === 'git') {
      set({ gitEntries: [] })
      return
    }
    set({ appEntries: [] })
  },

  setOpen: (open) => set({ open }),
  toggleOpen: () => set({ open: !get().open }),
  setHeight: (height) => set({ height: Math.min(480, Math.max(120, height)) }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setGitListening: (gitListening) => set({ gitListening })
}))

export function appLog(level: LogLevel, message: string, details?: string): void {
  useLogStore.getState().append({
    id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    stream: 'app',
    level,
    timestamp: Date.now(),
    message,
    details
  })
}
