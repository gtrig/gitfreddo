import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./api/http', () => ({
  githubJson: vi.fn()
}))

import { githubJson } from './api/http'
import { getAuthenticatedUser } from './client'

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.mocked(githubJson).mockReset()
  })

  it('maps the GitHub user payload', async () => {
    vi.mocked(githubJson).mockResolvedValue({
      login: 'octocat',
      avatar_url: 'https://avatars.example/octocat'
    })

    await expect(getAuthenticatedUser('gho_test')).resolves.toEqual({
      login: 'octocat',
      avatar_url: 'https://avatars.example/octocat'
    })
    expect(githubJson).toHaveBeenCalledWith('/user', {}, 'gho_test')
  })

  it('defaults missing avatar_url to an empty string', async () => {
    vi.mocked(githubJson).mockResolvedValue({ login: 'octocat' })

    await expect(getAuthenticatedUser('gho_test')).resolves.toEqual({
      login: 'octocat',
      avatar_url: ''
    })
  })

  it('throws when login is missing from the API response', async () => {
    vi.mocked(githubJson).mockResolvedValue({ avatar_url: 'https://avatars.example/octocat' })

    await expect(getAuthenticatedUser('gho_test')).rejects.toThrow(/invalid user response/i)
  })
})
