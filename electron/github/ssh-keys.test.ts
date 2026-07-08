import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./api/http', () => ({
  githubJson: vi.fn()
}))

import { githubJson } from './api/http'
import { findGitFreddoSshKeyTitle } from './ssh-keys'

describe('github ssh keys', () => {
  beforeEach(() => {
    vi.mocked(githubJson).mockReset()
  })

  it('finds a GitFreddo ssh key title from the account key list', async () => {
    vi.mocked(githubJson).mockResolvedValue([
      { title: 'work laptop' },
      { title: 'GitFreddo 2026-07-08T06:00:00.000Z' }
    ])

    await expect(findGitFreddoSshKeyTitle('token')).resolves.toBe('GitFreddo 2026-07-08T06:00:00.000Z')
    expect(githubJson).toHaveBeenCalledWith('/user/keys', {}, 'token')
  })
})
