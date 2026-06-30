import type { LogEntry, LogLevel, LogStream } from '../../shared/ipc'

let logId = 0
const listeners = new Set<(entry: LogEntry) => void>()

export function emitLog(
  stream: LogStream,
  level: LogLevel,
  message: string,
  details?: string
): void {
  const entry: LogEntry = {
    id: String(++logId),
    stream,
    level,
    timestamp: Date.now(),
    message,
    details
  }
  for (const listener of listeners) {
    listener(entry)
  }
}

export function onLog(listener: (entry: LogEntry) => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
