import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { shell } from 'electron'
import { getResolvedForgeOAuthEnv } from '../forge-oauth-env'
import { getAuthenticatedUser } from './client'

const AUTHORIZE_URL = 'https://bitbucket.org/site/oauth2/authorize'
const ACCESS_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token'
const DEFAULT_REDIRECT_PORT = 8765
const OAUTH_SCOPES = [
  'account',
  'repository',
  'repository:write',
  'pullrequest',
  'pullrequest:write',
  'issue',
  'issue:write'
].join(' ')

export interface OAuthFlowProgress {
  status: 'waiting' | 'exchanging'
  authorizationUri?: string
}

export function getBitbucketClientId(): string {
  return getResolvedForgeOAuthEnv().bitbucketClientId
}

export function getBitbucketClientSecret(): string {
  return getResolvedForgeOAuthEnv().bitbucketClientSecret
}

function getRedirectUri(port: number): string {
  return `http://127.0.0.1:${port}/callback`
}

function parseQuery(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return new URLSearchParams()
  return new URLSearchParams(url.slice(queryIndex + 1))
}

function sendHtml(res: ServerResponse, body: string, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(body)
}

export async function exchangeAuthorizationCode(
  clientId: string,
  clientSecret: string,
  code: string,
  redirectUri: string
): Promise<string> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const response = await fetch(ACCESS_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Bitbucket token exchange failed (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(data.error ?? 'Bitbucket OAuth did not return an access token')
  }
  return data.access_token
}

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

function waitForAuthorizationCode(
  port: number,
  expectedState: string
): Promise<{ code: string; redirectUri: string }> {
  return new Promise((resolve, reject) => {
    let settled = false

    const server = createServer((req: IncomingMessage, res: ServerResponse) => {
      if (!req.url?.startsWith('/callback')) {
        sendHtml(res, '<h1>Not found</h1>', 404)
        return
      }

      const query = parseQuery(req.url)
      const error = query.get('error')
      if (error) {
        sendHtml(
          res,
          `<h1>Authorization failed</h1><p>${error}</p><p>You can close this window.</p>`,
          400
        )
        if (!settled) {
          settled = true
          clearTimeout(timer)
          server.close()
          reject(new Error(`Bitbucket authorization failed: ${error}`))
        }
        return
      }

      const state = query.get('state')
      const code = query.get('code')
      if (!code || state !== expectedState) {
        sendHtml(res, '<h1>Invalid callback</h1><p>You can close this window.</p>', 400)
        if (!settled) {
          settled = true
          clearTimeout(timer)
          server.close()
          reject(new Error('Bitbucket authorization callback was invalid'))
        }
        return
      }

      sendHtml(
        res,
        '<h1>Authorization successful</h1><p>You can return to GitFreddo and close this window.</p>'
      )
      if (!settled) {
        settled = true
        clearTimeout(timer)
        server.close()
        resolve({ code, redirectUri: getRedirectUri(port) })
      }
    })

    server.on('error', (error) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(error)
      }
    })

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        server.close()
        reject(new Error('Bitbucket OAuth timed out waiting for authorization callback.'))
      }
    }, OAUTH_TIMEOUT_MS)

    server.listen(port, '127.0.0.1')
  })
}

async function startCallbackServer(expectedState: string): Promise<{
  port: number
  waitForCode: () => Promise<{ code: string; redirectUri: string }>
}> {
  let lastError: unknown
  for (let port = DEFAULT_REDIRECT_PORT; port < DEFAULT_REDIRECT_PORT + 10; port++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const probe = createServer()
        probe.once('error', reject)
        probe.listen(port, '127.0.0.1', () => {
          probe.close(() => resolve())
        })
      })
      return {
        port,
        waitForCode: () => waitForAuthorizationCode(port, expectedState)
      }
    } catch (error) {
      lastError = error
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error('Could not start Bitbucket OAuth callback server')
}

export async function runBitbucketOAuthFlow(
  onProgress?: (progress: OAuthFlowProgress) => void
): Promise<{ token: string; login: string }> {
  const clientId = getBitbucketClientId()
  const clientSecret = getBitbucketClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error(
      'BITBUCKET_CLIENT_ID and BITBUCKET_CLIENT_SECRET must be configured in your environment or .env file.'
    )
  }

  const state = randomBytes(16).toString('hex')
  const { port, waitForCode } = await startCallbackServer(state)
  const redirectUri = getRedirectUri(port)
  const authorizationUri = `${AUTHORIZE_URL}?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: OAUTH_SCOPES
  })}`

  onProgress?.({ status: 'waiting', authorizationUri })
  await shell.openExternal(authorizationUri)

  const { code } = await waitForCode()
  onProgress?.({ status: 'exchanging' })

  const token = await exchangeAuthorizationCode(clientId, clientSecret, code, redirectUri)
  const user = await getAuthenticatedUser(token, 'oauth')
  return { token, login: user.login }
}
