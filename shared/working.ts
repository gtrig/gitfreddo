export interface WorkingReadResult {
  exists: boolean
  content: string
}

/**
 * Error text for `working.remove` when git refuses because the file has local
 * changes. The renderer matches on it (IPC keeps only the message) to ask before
 * retrying with `force: true`.
 */
export const REMOVE_HAS_LOCAL_CHANGES = 'File has local modifications'

export function isRemoveHasLocalChangesError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes(REMOVE_HAS_LOCAL_CHANGES)
}
