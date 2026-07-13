import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  execSync: vi.fn(),
  mkdtempSync: vi.fn(),
  readFileSync: vi.fn()
}))

vi.mock('child_process', () => ({ execSync: mocks.execSync }))
vi.mock('fs', () => ({
  mkdtempSync: mocks.mkdtempSync,
  readFileSync: mocks.readFileSync
}))
vi.mock('os', () => ({ tmpdir: () => '/tmp' }))
vi.mock('path', async () => {
  const actual = await vi.importActual<typeof import('path')>('path')
  return { ...actual, join: (...parts: string[]) => parts.join('/') }
})

import { generateSshKeyPair } from './ssh-key-pair'

describe('generateSshKeyPair', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mkdtempSync.mockReturnValue('/tmp/gitfreddo-ssh-abc')
    mocks.readFileSync.mockReturnValue('ssh-rsa AAAA generated-key\n')
  })

  it('generates an RSA key pair in a temp directory', () => {
    const result = generateSshKeyPair()

    expect(mocks.mkdtempSync).toHaveBeenCalledWith('/tmp/gitfreddo-ssh-')
    expect(mocks.execSync).toHaveBeenCalledWith(
      'ssh-keygen -t rsa -b 4096 -f "/tmp/gitfreddo-ssh-abc/id_rsa" -N "" -q',
      { stdio: 'ignore' }
    )
    expect(mocks.readFileSync).toHaveBeenCalledWith('/tmp/gitfreddo-ssh-abc/id_rsa.pub', 'utf8')
    expect(result).toEqual({
      publicKey: 'ssh-rsa AAAA generated-key',
      privateKeyPath: '/tmp/gitfreddo-ssh-abc/id_rsa'
    })
  })
})
