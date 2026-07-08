export function isForgeAuthFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  // Only hard auth invalidation. Scope/SSO 403s and network failures must not wipe
  // a connection that already authenticated successfully.
  return /\b401\b/.test(message) || /unauthorized|bad credentials/i.test(message)
}
