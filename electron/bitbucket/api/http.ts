import type { BitbucketAuthSettings } from '../../../shared/ipc'
import { resolveBitbucketAuthLogin } from '../auth'
import { loadBitbucketToken } from '../token-store'

const DEFAULT_API_BASE = 'https://api.bitbucket.org/2.0'

export function getBitbucketApiBase(): string {
  return DEFAULT_API_BASE
}

export async function getBitbucketTokenOrThrow(): Promise<string> {
  const token = await loadBitbucketToken()
  if (!token?.trim()) {
    throw new Error('Bitbucket is not connected. Connect in Settings → Integrations.')
  }
  return token.trim()
}

function basicAuthHeader(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

export function buildBitbucketAuthHeader(
  token: string,
  settings: BitbucketAuthSettings
): string {
  if (settings.bitbucketAuthType === 'app_password') {
    const username = resolveBitbucketAuthLogin(settings)
    if (!username) {
      throw new Error('Bitbucket username is missing for app password authentication.')
    }
    return basicAuthHeader(username, token)
  }
  return `Bearer ${token}`
}

export async function bitbucketFetch(
  path: string,
  init: RequestInit = {},
  token?: string,
  settings?: BitbucketAuthSettings
): Promise<Response> {
  const accessToken = token ?? (await getBitbucketTokenOrThrow())
  const authSettings = settings ?? {
    bitbucketLogin: '',
    bitbucketAuthLogin: '',
    bitbucketAuthType: 'oauth' as const
  }
  const headers: Record<string, string> = {
    Accept: 'application/json',
    Authorization: buildBitbucketAuthHeader(accessToken, authSettings),
    ...(init.headers as Record<string, string> | undefined)
  }

  const url = path.startsWith('http') ? path : `${getBitbucketApiBase()}${path}`
  return fetch(url, { ...init, headers })
}

export async function bitbucketJson<T>(
  path: string,
  init?: RequestInit,
  token?: string,
  settings?: BitbucketAuthSettings
): Promise<T> {
  const response = await bitbucketFetch(path, init, token, settings)
  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Bitbucket API error (${response.status}): ${detail}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

interface PaginatedResponse<T> {
  values?: T[]
  next?: string | null
}

export async function bitbucketJsonAllPages<T>(
  path: string,
  settings?: BitbucketAuthSettings,
  token?: string
): Promise<T[]> {
  const items: T[] = []
  let nextPath: string | null = path

  while (nextPath) {
    const page: PaginatedResponse<T> = await bitbucketJson<PaginatedResponse<T>>(
      nextPath,
      {},
      token,
      settings
    )
    if (page.values?.length) {
      items.push(...page.values)
    }
    nextPath = page.next ?? null
  }

  return items
}
