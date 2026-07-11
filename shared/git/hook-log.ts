export const HOOK_RESULT_LOG_PREFIX = 'hook:result:'

export function parseHookResultLogMessage(message: string): {
  status: 'passed' | 'failed'
  hookName: string
} | null {
  if (!message.startsWith(HOOK_RESULT_LOG_PREFIX)) return null
  const payload = message.slice(HOOK_RESULT_LOG_PREFIX.length)
  const separator = payload.indexOf(':')
  if (separator <= 0) return null
  const status = payload.slice(0, separator)
  const hookName = payload.slice(separator + 1)
  if ((status !== 'passed' && status !== 'failed') || !hookName) return null
  return { status, hookName }
}
