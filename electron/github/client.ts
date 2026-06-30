import { githubJson } from './api/http'

export interface GitHubUser {
  login: string
  avatar_url: string
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const data = await githubJson<{ login?: string; avatar_url?: string }>('/user', {}, token)
  if (!data.login) {
    throw new Error('GitHub API returned an invalid user response')
  }
  return {
    login: data.login,
    avatar_url: data.avatar_url ?? ''
  }
}
