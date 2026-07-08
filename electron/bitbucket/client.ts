import { bitbucketJson } from './api/http'

export interface BitbucketUser {
  username: string
  display_name: string
  links: { avatar?: { href?: string } }
}

export async function getAuthenticatedUser(
  token: string,
  authType: 'oauth' | 'app_password',
  username?: string
): Promise<{ login: string; avatar_url: string }> {
  const settings = {
    bitbucketLogin: username ?? '',
    bitbucketAuthLogin: username ?? '',
    bitbucketAuthType: authType
  }
  const data = await bitbucketJson<BitbucketUser>('/user', {}, token, settings)
  if (!data.username) {
    throw new Error('Bitbucket API returned an invalid user response')
  }
  return {
    login: data.username,
    avatar_url: data.links?.avatar?.href ?? ''
  }
}
