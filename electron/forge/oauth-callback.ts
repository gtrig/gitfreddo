import { createServer, type IncomingMessage, type ServerResponse } from 'http'

const OAUTH_TIMEOUT_MS = 5 * 60 * 1000

export function getOAuthRedirectUri(port: number): string {
  return `http://127.0.0.1:${port}/callback`
}

export function parseOAuthCallbackQuery(url: string): URLSearchParams {
  const queryIndex = url.indexOf('?')
  if (queryIndex === -1) return new URLSearchParams()
  return new URLSearchParams(url.slice(queryIndex + 1))
}

export function sendOAuthHtml(res: ServerResponse, body: string, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' })
  res.end(body)
}

export interface OAuthCallbackSession {
  port: number
  listening: Promise<void>
  waitForCode: Promise<{ code: string; redirectUri: string }>
}

/**
 * Start a one-shot localhost callback server for authorization-code OAuth.
 * Retries nearby ports when the preferred port is busy.
 */
export function waitForOAuthAuthorizationCode(
  requestedPort: number,
  expectedState: string,
  providerLabel: string
): OAuthCallbackSession {
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
        sendOAuthHtml(res, '<h1>Not found</h1>', 404)
        return
      }

      const query = parseOAuthCallbackQuery(req.url)
      const error = query.get('error')
      if (error) {
        sendOAuthHtml(
          res,
          `<h1>Authorization failed</h1><p>${error}</p><p>You can close this window.</p>`,
          400
        )
        finish(() => reject(new Error(`${providerLabel} authorization failed: ${error}`)))
        return
      }

      const state = query.get('state')
      const code = query.get('code')
      if (!code || state !== expectedState) {
        sendOAuthHtml(res, '<h1>Invalid callback</h1><p>You can close this window.</p>', 400)
        finish(() => reject(new Error(`${providerLabel} authorization callback was invalid`)))
        return
      }

      sendOAuthHtml(
        res,
        '<h1>Authorization successful</h1><p>You can return to GitFreddo and close this window.</p>'
      )
      finish(() => resolve({ code, redirectUri: getOAuthRedirectUri(boundPort) }))
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
        reject(
          new Error(`${providerLabel} OAuth timed out waiting for authorization callback.`)
        )
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

export async function startOAuthCallbackServer(
  expectedState: string,
  providerLabel: string,
  defaultPort: number
): Promise<{ port: number; session: OAuthCallbackSession }> {
  let lastError: unknown
  const ports = [...Array.from({ length: 20 }, (_, index) => defaultPort + index), 0]

  for (const port of ports) {
    const session = waitForOAuthAuthorizationCode(port, expectedState, providerLabel)
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
    : new Error(`Could not start ${providerLabel} OAuth callback server`)
}
