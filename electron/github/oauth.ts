import { shell } from 'electron'
import { getAuthenticatedUser } from './client'

const DEVICE_CODE_URL = 'https://github.com/login/device/code'
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const DEFAULT_SCOPE = 'repo'

export interface DeviceCodeResponse {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

export interface DeviceFlowProgress {
  userCode: string
  verificationUri: string
}

export function getGitHubClientId(): string {
  const fromEnv = process.env.GITHUB_CLIENT_ID?.trim()
  if (fromEnv) return fromEnv
  return ''
}

export async function requestDeviceCode(clientId: string): Promise<DeviceCodeResponse> {
  const response = await fetch(DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: DEFAULT_SCOPE
    })
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Failed to start GitHub device flow (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as DeviceCodeResponse
  if (!data.device_code || !data.user_code || !data.verification_uri) {
    throw new Error('GitHub device flow returned an invalid response')
  }

  return data
}

export async function pollForAccessToken(
  clientId: string,
  deviceCode: string,
  intervalSec: number,
  expiresInSec: number
): Promise<string> {
  const deadline = Date.now() + expiresInSec * 1000
  let intervalMs = Math.max(intervalSec, 5) * 1000

  while (Date.now() < deadline) {
    await sleep(intervalMs)

    const response = await fetch(ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      })
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(`GitHub token poll failed (${response.status}): ${detail}`)
    }

    const data = (await response.json()) as {
      access_token?: string
      error?: string
      error_description?: string
      interval?: number
    }

    if (data.access_token) {
      return data.access_token
    }

    if (data.error === 'authorization_pending') {
      continue
    }

    if (data.error === 'slow_down' && data.interval) {
      intervalMs = (data.interval + 1) * 1000
      continue
    }

    if (data.error === 'access_denied') {
      throw new Error('GitHub authorization was denied')
    }

    if (data.error === 'expired_token') {
      throw new Error('GitHub device code expired. Please try connecting again.')
    }

    const message = data.error_description || data.error || 'Unknown GitHub OAuth error'
    throw new Error(message)
  }

  throw new Error('GitHub authorization timed out. Please try connecting again.')
}

export async function runGitHubDeviceFlow(
  onProgress?: (progress: DeviceFlowProgress) => void
): Promise<{ token: string; login: string }> {
  const clientId = getGitHubClientId()
  if (!clientId) {
    throw new Error(
      'GITHUB_CLIENT_ID is not configured. Set it in your environment or .env file for development.'
    )
  }

  const device = await requestDeviceCode(clientId)
  onProgress?.({
    userCode: device.user_code,
    verificationUri: device.verification_uri
  })

  await shell.openExternal(device.verification_uri)

  const token = await pollForAccessToken(
    clientId,
    device.device_code,
    device.interval,
    device.expires_in
  )

  const user = await getAuthenticatedUser(token)
  return { token, login: user.login }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
