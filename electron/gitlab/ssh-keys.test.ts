import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./api/http', () => ({
  gitlabJson: vi.fn()
}))

vi.mock('../forge/ssh-key-pair', () => ({
  generateSshKeyPair: vi.fn(() => ({
    publicKey: 'ssh-ed25519 AAAA test',
    privateKeyPath: '/tmp/gitfreddo-key/id_ed25519'
  }))
}))

vi.mock('fs', () => ({
  rmSync: vi.fn()
}))

import { rmSync } from 'fs'
import { gitlabJson } from './api/http'
import {
  findGitFreddoSshKeyTitle,
  listSshKeys,
  uploadSshKey,
  generateAndUploadSshKey
} from './ssh-keys'

describe('gitlab ssh keys', () => {
  beforeEach(() => {
    vi.mocked(gitlabJson).mockReset()
    vi.mocked(rmSync).mockReset()
  })

  it('lists ssh key titles for the user', async () => {
    vi.mocked(gitlabJson).mockResolvedValue([
      { title: 'work laptop' },
      { title: 'GitFreddo key' }
    ])

    await expect(listSshKeys('gitlab.com')).resolves.toEqual(['work laptop', 'GitFreddo key'])
    expect(gitlabJson).toHaveBeenCalledWith('/user/keys', {}, undefined, 'gitlab.com')
  })

  it('finds a GitFreddo ssh key title from the key list', async () => {
    vi.mocked(gitlabJson).mockResolvedValue([
      { title: 'GitFreddo 2026-07-08T06:00:00.000Z' }
    ])

    await expect(findGitFreddoSshKeyTitle('gitlab.com')).resolves.toBe(
      'GitFreddo 2026-07-08T06:00:00.000Z'
    )
  })

  it('uploads a public key with the given title', async () => {
    vi.mocked(gitlabJson).mockResolvedValue(undefined)

    await expect(uploadSshKey('ssh-ed25519 AAAA', 'GitFreddo test', 'gitlab.com')).resolves.toEqual({
      title: 'GitFreddo test',
      publicKey: 'ssh-ed25519 AAAA'
    })

    expect(gitlabJson).toHaveBeenCalledWith(
      '/user/keys',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'GitFreddo test', key: 'ssh-ed25519 AAAA' })
      }),
      undefined,
      'gitlab.com'
    )
  })

  it('generates, uploads, and cleans up the temp key directory', async () => {
    vi.mocked(gitlabJson).mockResolvedValue(undefined)

    await expect(generateAndUploadSshKey('GitFreddo generated', 'gitlab.com')).resolves.toEqual({
      title: 'GitFreddo generated',
      publicKey: 'ssh-ed25519 AAAA test'
    })
    expect(rmSync).toHaveBeenCalled()
  })

  it('ignores cleanup errors after a successful upload', async () => {
    vi.mocked(gitlabJson).mockResolvedValue(undefined)
    vi.mocked(rmSync).mockImplementation(() => {
      throw new Error('EBUSY')
    })

    await expect(generateAndUploadSshKey('GitFreddo generated', 'gitlab.com')).resolves.toEqual({
      title: 'GitFreddo generated',
      publicKey: 'ssh-ed25519 AAAA test'
    })
  })
})
