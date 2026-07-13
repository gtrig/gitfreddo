import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./api/http', () => ({
  bitbucketJson: vi.fn()
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

import { bitbucketJson } from './api/http'
import { findGitFreddoSshKeyTitle, listSshKeys, uploadSshKey, generateAndUploadSshKey } from './ssh-keys'

describe('bitbucket ssh keys', () => {
  beforeEach(() => {
    vi.mocked(bitbucketJson).mockReset()
  })

  it('lists ssh key labels for a user', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({
      values: [{ label: 'work laptop' }, { label: 'GitFreddo key' }]
    })

    await expect(listSshKeys('alice')).resolves.toEqual(['work laptop', 'GitFreddo key'])
    expect(bitbucketJson).toHaveBeenCalledWith('/users/alice/ssh-keys', {}, undefined, undefined)
  })

  it('finds a GitFreddo ssh key title from the account key list', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue({
      values: [{ label: 'GitFreddo 2026-07-08T06:00:00.000Z' }]
    })

    await expect(findGitFreddoSshKeyTitle('alice')).resolves.toBe('GitFreddo 2026-07-08T06:00:00.000Z')
  })

  it('uploads a public key with the given label', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue(undefined)

    await expect(uploadSshKey('alice', 'ssh-ed25519 AAAA', 'GitFreddo test')).resolves.toEqual({
      title: 'GitFreddo test',
      publicKey: 'ssh-ed25519 AAAA'
    })

    expect(bitbucketJson).toHaveBeenCalledWith(
      '/users/alice/ssh-keys',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'ssh-ed25519 AAAA', label: 'GitFreddo test' })
      }),
      undefined,
      undefined
    )
  })

  it('generates, uploads, and cleans up the temp key directory', async () => {
    vi.mocked(bitbucketJson).mockResolvedValue(undefined)

    await expect(
      generateAndUploadSshKey('alice', 'GitFreddo generated')
    ).resolves.toEqual({
      title: 'GitFreddo generated',
      publicKey: 'ssh-ed25519 AAAA test'
    })
  })
})
