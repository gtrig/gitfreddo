import { createServer, type IncomingMessage, type ServerResponse } from 'http'
import { randomBytes } from 'crypto'
import { shell } from 'electron'
import { getResolvedForgeOAuthEnv } from '../forge-oauth-env'
import { getAuthenticatedUser } from './client'
import { getGitlabWebBase } from './api/http'

const OAUTH_SCOPES = 'api read_user'
const DEFAULT_OAUTH_PORT = 8785

export interface OAuthFlowProgress {
  status: 'waiting' | 'exchanging'
  authorizationUri?: string
}

export function getGitlabClientId(): string {
  return getResolvedForgeOAuthEnv().gitlabClientId
}

export function getGitlabClientSecret(): string {
  return getResolvedForgeOAuthEnv().gitlabClientSecret
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
  redirectUri: string,
  settingsHost?: string | null
): Promise<string> {
  const response = await fetch(`${getGitlabWebBase(settingsHost)}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitLab token exchange failed (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as { access_token?: string; error?: string }
  if (!data.access_token) {
    throw new Error(data.error ?? 'GitLab OAuth did not return an access token')
  }
  return data.access_token
}

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000

function waitForAuthorizationCode(
  requestedPort: number,
  expectedState: string
): {
  port: number
  listening: Promise<void>
  waitForCode: Promise<{ code: string; redirectUri: string }>
} {
  let settled = false
  let boundPort = requestedPort
  let listenResolve!: () => void
  let listenReject!: (error: Error) => void
  const listening = new Promise<void>((resolve, reject) => {
    listenResolve = resolve
    listenReject = reject
  })

  const waitForCode = new Promise<{ code: string; redirectUri: string }>((resolve, reject) => {
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
        finish(() => reject(new Error(`GitLab authorization failed: ${error}`)))
        return
      }

      const state = query.get('state')
      const code = query.get('code')
      if (!code || state !== expectedState) {
        sendHtml(res, '<h1>Invalid callback</h1><p>You can close this window.</p>', 400)
        finish(() => reject(new Error('GitLab authorization callback was invalid')))
        return
      }

      sendHtml(
        res,
        '<h1>Authorization successful</h1><p>You can return to GitFreddo and close this window.</p>'
      )
      finish(() => resolve({ code, redirectUri: getRedirectUri(boundPort) }))
    })

    const finish = (action: () => void) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      server.closeAllConnections?.()
      server.close(() => action())
    }

    server.on('error', (error) => {
      const normalized = error instanceof Error ? error : new Error(String(error))
      listenReject(normalized)
      finish(() => reject(normalized))
    })

    const timer = setTimeout(() => {
      finish(() =>
        reject(new Error('GitLab OAuth timed out waiting for authorization callback.'))
      )
    }, OAUTH_TIMEOUT_MS)

    server.listen(requestedPort, '127.0.0.1', () => {
      const address = server.address()
      if (address && typeof address === 'object') {
        boundPort = address.port
      }
      listenResolve()
    })
  })

  return {
    get port() {
      return boundPort
    },
    listening,
    waitForCode
  }
}

function getDefaultRedirectPort(): number {
  return Number(process.env.GITFREDDO_GITLAB_OAUTH_PORT) || DEFAULT_OAUTH_PORT
}

async function startCallbackServer(expectedState: string): Promise<{
  port: number
  session: ReturnType<typeof waitForAuthorizationCode>
}> {
  let lastError: unknown
  const defaultPort = getDefaultRedirectPort()
  const ports = [...Array.from({ length: 20 }, (_, index) => defaultPort + index), 0]

  for (const port of ports) {
    const session = waitForAuthorizationCode(port, expectedState)
    try {
      await session.listening
      return { port: session.port, session }
    } catch (error) {
      lastError = error
      await session.waitForCode.catch(() => undefined)
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Could not start GitLab OAuth callback server')
}

export async function runGitlabOAuthFlow(
  settingsHost?: string | null,
  onProgress?: (progress: OAuthFlowProgress) => void
): Promise<{ token: string; login: string }> {
  const clientId = getGitlabClientId()
  const clientSecret = getGitlabClientSecret()
  if (!clientId || !clientSecret) {
    throw new Error(
      'GITLAB_CLIENT_ID and GITLAB_CLIENT_SECRET must be configured in your environment or .env file.'
    )
  }

  const state = randomBytes(16).toString('hex')
  const { port, session } = await startCallbackServer(state)
  const redirectUri = getRedirectUri(port)
  const authorizationUri = `${getGitlabWebBase(settingsHost)}/oauth/authorize?${new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    state,
    scope: OAUTH_SCOPES
  })}`

  onProgress?.({ status: 'waiting', authorizationUri })
  await shell.openExternal(authorizationUri)

  const { code } = await session.waitForCode
  onProgress?.({ status: 'exchanging' })

  const token = await exchangeAuthorizationCode(
    clientId,
    clientSecret,
    code,
    redirectUri,
    settingsHost
  )
  const user = await getAuthenticatedUser(token, settingsHost)
  return { token, login: user.login }
}
