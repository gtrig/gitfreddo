import type { AppSettings, GitHubStatus } from '../../shared/ipc'
import { saveSettings } from '../settings'
import { runGitHubDeviceFlow } from './oauth'
import { clearGitHubToken, hasGitHubToken, saveGitHubToken } from './token-store'

export async function getGitHubStatus(settings: AppSettings): Promise<GitHubStatus> {
  const tokenPresent = await hasGitHubToken()
  const login = settings.githubLogin?.trim() || null
  return {
    connected: tokenPresent && Boolean(login),
    login: tokenPresent ? login : null
  }
}

export async function connectGitHub(
  _settings: AppSettings
): Promise<{ settings: AppSettings; status: GitHubStatus }> {
  const { token, login } = await runGitHubDeviceFlow()
  await saveGitHubToken(token)

  const next = await saveSettings({
    githubLogin: login,
    githubConnectedAt: Date.now()
  })

  return {
    settings: next,
    status: { connected: true, login }
  }
}

export async function disconnectGitHub(_settings: AppSettings): Promise<AppSettings> {
  await clearGitHubToken()
  return saveSettings({
    githubLogin: '',
    githubConnectedAt: null
  })
}
