import { getDefaultGitlabHost } from '../../../shared/gitlab'
import { getResolvedForgeOAuthEnv } from '../../forge-oauth-env'
import { readForgeJson, requireForgeToken } from '../../forge/http'
import { loadGitlabToken } from '../token-store'

export function resolveGitlabHost(settingsHost?: string | null): string {
  const fromSettings = settingsHost?.trim()
  if (fromSettings) {
    return fromSettings.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  const fromEnv = getResolvedForgeOAuthEnv().gitlabHost?.trim()
  if (fromEnv) {
    return fromEnv.replace(/^https?:\/\//, '').replace(/\/$/, '')
  }
  return getDefaultGitlabHost()
}

export function getGitlabApiBase(settingsHost?: string | null): string {
  const host = resolveGitlabHost(settingsHost)
  return `https://${host}/api/v4`
}

export function getGitlabWebBase(settingsHost?: string | null): string {
  const host = resolveGitlabHost(settingsHost)
  return `https://${host}`
}

export async function getGitlabTokenOrThrow(): Promise<string> {
  return requireForgeToken(loadGitlabToken, 'GitLab')
}

export async function gitlabFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
  settingsHost?: string | null
): Promise<Response> {
  const accessToken = token ?? (await getGitlabTokenOrThrow())
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: `Bearer ${accessToken}`,
    ...(init.headers as Record<string, string> | undefined)
  }

  const url = path.startsWith('http') ? path : `${getGitlabApiBase(settingsHost)}${path}`
  return fetch(url, { ...init, headers })
}

export async function gitlabJson<T>(
  path: string,
  init?: RequestInit,
  token?: string,
  settingsHost?: string | null
): Promise<T> {
  const response = await gitlabFetch(path, init, token, settingsHost)
  return readForgeJson<T>(response, 'GitLab', { allowEmpty: true })
}

function parseLinkHeader(linkHeader: string | null): Record<string, string> {
  const links: Record<string, string> = {}
  if (!linkHeader) return links
  for (const part of linkHeader.split(',')) {
    const match = part.match(/<([^>]+)>;\s*rel="([^"]+)"/)
    if (match) {
      links[match[2]] = match[1]
    }
  }
  return links
}

export async function gitlabJsonAllPages<T>(
  path: string,
  settingsHost?: string | null,
  token?: string
): Promise<T[]> {
  const items: T[] = []
  let nextPath: string | null = path

  while (nextPath) {
    const response = await gitlabFetch(nextPath, {}, token, settingsHost)
    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`GitLab API error (${response.status}): ${detail}`)
    }
    const page = (await response.json()) as T[]
    if (page.length) {
      items.push(...page)
    }
    const links = parseLinkHeader(response.headers.get('link'))
    nextPath = links.next ?? null
  }

  return items
}
