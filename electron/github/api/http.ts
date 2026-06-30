import { loadGitHubToken } from '../token-store'

const DEFAULT_API_BASE = 'https://api.github.com'

export function getGitHubApiBase(): string {
  const host = process.env.GITHUB_ENTERPRISE_HOST?.trim()
  if (host) {
    const normalized = host.replace(/^https?:\/\//, '').replace(/\/$/, '')
    return `https://${normalized}/api/v3`
  }
  return DEFAULT_API_BASE
}

export async function getGitHubTokenOrThrow(): Promise<string> {
  const token = await loadGitHubToken()
  if (!token?.trim()) {
    throw new Error('GitHub is not connected. Connect in Settings → Integrations.')
  }
  return token.trim()
}

export async function githubFetch(
  path: string,
  init: RequestInit = {},
  token?: string
): Promise<Response> {
  const accessToken = token ?? (await getGitHubTokenOrThrow())
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    Authorization: `Bearer ${accessToken}`,
    ...(init.headers as Record<string, string> | undefined)
  }

  const url = path.startsWith('http') ? path : `${getGitHubApiBase()}${path}`
  return fetch(url, { ...init, headers })
}

export async function githubJson<T>(path: string, init?: RequestInit, token?: string): Promise<T> {
  const response = await githubFetch(path, init, token)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub API error (${response.status}): ${detail}`)
  }
  return response.json() as Promise<T>
}
