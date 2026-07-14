/**
 * Shared HTTP helpers for forge API clients.
 * Provider-specific auth headers and pagination stay in per-provider api/http.ts.
 */

export async function requireForgeToken(
  loadToken: () => Promise<string | null>,
  providerLabel: string
): Promise<string> {
  const token = await loadToken()
  if (!token?.trim()) {
    throw new Error(`${providerLabel} is not connected. Connect in Settings → Integrations.`)
  }
  return token.trim()
}

export async function readForgeJson<T>(
  response: Response,
  providerLabel: string,
  options?: { allowEmpty?: boolean }
): Promise<T> {
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`${providerLabel} API error (${response.status}): ${detail}`)
  }
  if (options?.allowEmpty && response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}
