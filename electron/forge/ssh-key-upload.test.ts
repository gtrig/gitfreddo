import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dirname, join } from 'path'

const mockKeyDir = dirname(join('/tmp', 'gitfreddo-key', 'id_ed25519'))

vi.mock('./ssh-key-pair', () => {
  const { join } = require('path') as typeof import('path')
  return {
    generateSshKeyPair: vi.fn(() => ({
      publicKey: 'ssh-ed25519 AAAA test',
      privateKeyPath: join('/tmp', 'gitfreddo-key', 'id_ed25519')
    }))
  }
})

vi.mock('fs', () => ({
  rmSync: vi.fn()
}))

import { rmSync } from 'fs'
import { generateSshKeyPair } from './ssh-key-pair'
import { withGeneratedSshKey } from './ssh-key-upload'

describe('withGeneratedSshKey', () => {
  beforeEach(() => {
    vi.mocked(rmSync).mockReset()
    vi.mocked(generateSshKeyPair).mockClear()
  })

  it('generates a key, calls upload with the public key, and cleans up', async () => {
    const upload = vi.fn(async (publicKey: string) => ({
      title: 'GitFreddo test',
      publicKey
    }))

    await expect(withGeneratedSshKey(upload)).resolves.toEqual({
      title: 'GitFreddo test',
      publicKey: 'ssh-ed25519 AAAA test'
    })

    expect(generateSshKeyPair).toHaveBeenCalledOnce()
    expect(upload).toHaveBeenCalledWith('ssh-ed25519 AAAA test')
    expect(rmSync).toHaveBeenCalledWith(mockKeyDir, { recursive: true, force: true })
  })

  it('cleans up temp keys even when upload fails', async () => {
    const upload = vi.fn(async () => {
      throw new Error('upload failed')
    })

    await expect(withGeneratedSshKey(upload)).rejects.toThrow(/upload failed/)
    expect(rmSync).toHaveBeenCalledWith(mockKeyDir, { recursive: true, force: true })
  })

  it('ignores cleanup errors after a successful upload', async () => {
    vi.mocked(rmSync).mockImplementation(() => {
      throw new Error('EBUSY')
    })

    const upload = vi.fn(async (publicKey: string) => ({
      title: 'GitFreddo test',
      publicKey
    }))

    await expect(withGeneratedSshKey(upload)).resolves.toEqual({
      title: 'GitFreddo test',
      publicKey: 'ssh-ed25519 AAAA test'
    })
  })
})
