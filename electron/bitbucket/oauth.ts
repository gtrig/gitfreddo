import { randomBytes } from 'crypto'
import { shell } from 'electron'
import { getResolvedForgeOAuthEnv } from '../forge-oauth-env'
import {
  getOAuthRedirectUri,
  startOAuthCallbackServer
} from '../forge/oauth-callback'
import { getAuthenticatedUser } from './client'

const AUTHORIZE_URL = 'https://bitbucket.org/site/oauth2/authorize'
const ACCESS_TOKEN_URL = 'https://bitbucket.org/site/oauth2/access_token'
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

function getDefaultRedirectPort(): number {
  return Number(process.env.GITFREDDO_OAUTH_PORT) || 8765
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
  const { port, session } = await startOAuthCallbackServer(
    state,
    'Bitbucket',
    getDefaultRedirectPort()
  )
  const redirectUri = getOAuthRedirectUri(port)
  const authorizationUri = `${AUTHORIZE_URL}?${new URLSearchParams({
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

  const token = await exchangeAuthorizationCode(clientId, clientSecret, code, redirectUri)
  const user = await getAuthenticatedUser(token, 'oauth')
  return { token, login: user.login }
}
