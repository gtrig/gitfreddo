import { randomBytes } from 'crypto'
import { shell } from 'electron'
import { getResolvedForgeOAuthEnv } from '../forge-oauth-env'
import {
  getOAuthRedirectUri,
  startOAuthCallbackServer
} from '../forge/oauth-callback'
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

function getDefaultRedirectPort(): number {
  return Number(process.env.GITFREDDO_GITLAB_OAUTH_PORT) || DEFAULT_OAUTH_PORT
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
  const { port, session } = await startOAuthCallbackServer(
    state,
    'GitLab',
    getDefaultRedirectPort()
  )
  const redirectUri = getOAuthRedirectUri(port)
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
