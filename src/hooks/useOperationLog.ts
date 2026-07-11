import { useEffect } from 'react'
import type { LogEntry } from '@shared/ipc'
import { parseHookResultLogMessage } from '@shared/git/hook-log'
import { useOperationStore } from '@/stores/operation'

function handleOperationLogEntry(entry: LogEntry): void {
  const parsed = parseHookResultLogMessage(entry.message)
  if (parsed) {
    useOperationStore.getState().setHookResult({
      hookName: parsed.hookName,
      status: parsed.status,
      details: entry.details
    })
    if (entry.details) {
      useOperationStore.getState().appendOutput(entry.details)
    }
    return
  }

  useOperationStore.getState().appendOutput(entry.message)
  if (entry.details) {
    useOperationStore.getState().appendOutput(entry.details)
  }
}

export function useOperationLogSubscription(): void {
  useEffect(() => {
    const unsubscribe = window.gitfreddo.onLogEntry((entry) => {
      if (entry.stream !== 'operation') return
      handleOperationLogEntry(entry)
    })
    return unsubscribe
  }, [])
}
