export type ReportError = (message: string, tone: 'error') => void

/**
 * Await a fire-and-forget mutation and surface its failure instead of leaving an
 * unhandled rejection. Hook-failure toasts from useGitMutations fire after this
 * (they are deferred), so they still win when a hook explains the failure.
 */
export async function runMutation<T>(
  pending: Promise<T>,
  report: ReportError
): Promise<T | undefined> {
  try {
    return await pending
  } catch (error) {
    report(error instanceof Error ? error.message : String(error), 'error')
    return undefined
  }
}
