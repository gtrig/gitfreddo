import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('./api/http', () => ({
  githubJson: vi.fn()
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

import { githubJson } from './api/http'
import { rmSync } from 'fs'
import {
  findGitFreddoSshKeyTitle,
  generateAndUploadSshKey,
  listSshKeys,
  uploadSshKey
} from './ssh-keys'

describe('github ssh keys', () => {
  beforeEach(() => {
    vi.mocked(githubJson).mockReset()
    vi.mocked(rmSync).mockReset()
  })

  it('lists ssh key titles', async () => {
    vi.mocked(githubJson).mockResolvedValue([
      { title: ' work laptop ' },
      { title: '' },
      { title: 'GitFreddo key' }
    ])

    await expect(listSshKeys('token')).resolves.toEqual(['work laptop', 'GitFreddo key'])
    expect(githubJson).toHaveBeenCalledWith('/user/keys', {}, 'token')
  })

  it('finds a GitFreddo ssh key title from the account key list', async () => {
    vi.mocked(githubJson).mockResolvedValue([
      { title: 'work laptop' },
      { title: 'GitFreddo 2026-07-08T06:00:00.000Z' }
    ])

    await expect(findGitFreddoSshKeyTitle('token')).resolves.toBe('GitFreddo 2026-07-08T06:00:00.000Z')
    expect(githubJson).toHaveBeenCalledWith('/user/keys', {}, 'token')
  })

  it('uploads a public key with the given title', async () => {
    vi.mocked(githubJson).mockResolvedValue(undefined)

    await expect(uploadSshKey('ssh-ed25519 AAAA', 'GitFreddo test')).resolves.toEqual({
      title: 'GitFreddo test',
      publicKey: 'ssh-ed25519 AAAA'
    })

    expect(githubJson).toHaveBeenCalledWith(
      '/user/keys',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ title: 'GitFreddo test', key: 'ssh-ed25519 AAAA' })
      })
    )
  })

  it('generates, uploads, and cleans up the temp key directory', async () => {
    vi.mocked(githubJson).mockResolvedValue(undefined)

    await expect(generateAndUploadSshKey('GitFreddo generated')).resolves.toEqual({
      title: 'GitFreddo generated',
      publicKey: 'ssh-ed25519 AAAA test'
    })

    expect(rmSync).toHaveBeenCalledWith('/tmp/gitfreddo-key', { recursive: true, force: true })
  })

  it('cleans up temp keys even when upload fails', async () => {
    vi.mocked(githubJson).mockRejectedValue(new Error('upload failed'))

    await expect(generateAndUploadSshKey('GitFreddo generated')).rejects.toThrow(/upload failed/)
    expect(rmSync).toHaveBeenCalled()
  })
})
