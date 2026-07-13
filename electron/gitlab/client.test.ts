import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./api/http', () => ({
  gitlabJson: vi.fn()
}))

import { gitlabJson } from './api/http'
import { getAuthenticatedUser } from './client'

describe('gitlab client', () => {
  beforeEach(() => {
    vi.mocked(gitlabJson).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the authenticated user login and avatar', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({
      id: 1,
      username: 'gtrig',
      name: 'G Trig',
      avatar_url: 'https://avatar.example/gtrig'
    })

    await expect(getAuthenticatedUser('tok', 'gitlab.com')).resolves.toEqual({
      login: 'gtrig',
      avatar_url: 'https://avatar.example/gtrig'
    })
    expect(gitlabJson).toHaveBeenCalledWith('/user', {}, 'tok', 'gitlab.com')
  })

  it('defaults the avatar url to an empty string', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({ id: 1, username: 'gtrig', name: 'G' })

    await expect(getAuthenticatedUser('tok')).resolves.toEqual({
      login: 'gtrig',
      avatar_url: ''
    })
  })

  it('throws when the response has no username', async () => {
    vi.mocked(gitlabJson).mockResolvedValue({ id: 1, name: 'G', avatar_url: '' })

    await expect(getAuthenticatedUser('tok')).rejects.toThrow(/invalid user response/i)
  })
})
