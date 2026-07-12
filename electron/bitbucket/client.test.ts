import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api/http', () => ({
  bitbucketJson: vi.fn()
}))

import { bitbucketJson } from './api/http'
import { getAuthenticatedUser } from './client'

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.mocked(bitbucketJson).mockReset()
  })

  it('maps oauth user responses', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({
      username: 'gtrig',
      display_name: 'GTrig',
      links: { avatar: { href: 'https://avatar.example/gtrig' } }
    })

    await expect(getAuthenticatedUser('oauth-token', 'oauth')).resolves.toEqual({
      login: 'gtrig',
      avatar_url: 'https://avatar.example/gtrig'
    })
    expect(bitbucketJson).toHaveBeenCalledWith(
      '/user',
      {},
      'oauth-token',
      expect.objectContaining({ bitbucketAuthType: 'oauth' })
    )
  })

  it('passes app password auth settings with username', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({
      username: 'gtrig',
      display_name: 'GTrig',
      links: {}
    })

    await getAuthenticatedUser('app-password', 'app_password', 'user@example.com')

    expect(bitbucketJson).toHaveBeenCalledWith(
      '/user',
      {},
      'app-password',
      expect.objectContaining({
        bitbucketLogin: 'user@example.com',
        bitbucketAuthLogin: 'user@example.com',
        bitbucketAuthType: 'app_password'
      })
    )
  })

  it('throws when username is missing from the API response', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({ display_name: 'Missing username' })

    await expect(getAuthenticatedUser('token', 'oauth')).rejects.toThrow(/invalid user response/i)
  })
})
