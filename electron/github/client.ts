export interface GitHubUser {
  login: string
  avatar_url: string
}

export async function getAuthenticatedUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    }
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`GitHub API error (${response.status}): ${detail}`)
  }

  const data = (await response.json()) as { login?: string; avatar_url?: string }
  if (!data.login) {
    throw new Error('GitHub API returned an invalid user response')
  }

  return {
    login: data.login,
    avatar_url: data.avatar_url ?? ''
  }
}
