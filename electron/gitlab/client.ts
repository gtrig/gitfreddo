import { gitlabJson } from './api/http'

export interface GitlabUser {
  id: number
  username: string
  name: string
  avatar_url: string
}

export async function getAuthenticatedUser(
  token: string,
  settingsHost?: string | null
): Promise<{ login: string; avatar_url: string }> {
  const data = await gitlabJson<GitlabUser>('/user', {}, token, settingsHost)
  if (!data.username) {
    throw new Error('GitLab API returned an invalid user response')
  }
  return {
    login: data.username,
    avatar_url: data.avatar_url ?? ''
  }
}
