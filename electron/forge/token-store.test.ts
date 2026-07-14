import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const encryptString = vi.fn((value: string) => Buffer.from(`enc:${value}`))
const decryptString = vi.fn((buffer: Buffer) => buffer.toString().replace(/^enc:/, ''))
const isEncryptionAvailable = vi.fn(() => true)

vi.mock('electron', () => ({
  safeStorage: {
    isEncryptionAvailable: () => isEncryptionAvailable(),
    encryptString: (value: string) => encryptString(value),
    decryptString: (buffer: Buffer) => decryptString(buffer)
  }
}))

vi.mock('../paths', () => ({
  getAppDataDir: () => '/tmp/gitfreddo-test-data'
}))

const readFile = vi.fn()
const writeFile = vi.fn()
const unlink = vi.fn()
const mkdir = vi.fn()

vi.mock('fs/promises', () => ({
  readFile: (...args: unknown[]) => readFile(...args),
  writeFile: (...args: unknown[]) => writeFile(...args),
  unlink: (...args: unknown[]) => unlink(...args),
  mkdir: (...args: unknown[]) => mkdir(...args)
}))

import { createForgeTokenStore } from './token-store'

describe('createForgeTokenStore', () => {
  const store = createForgeTokenStore('forge-token.enc', 'Forge')

  beforeEach(() => {
    vi.clearAllMocks()
    isEncryptionAvailable.mockReturnValue(true)
    encryptString.mockImplementation((value: string) => Buffer.from(`enc:${value}`))
    decryptString.mockImplementation((buffer: Buffer) => buffer.toString().replace(/^enc:/, ''))
    mkdir.mockResolvedValue(undefined)
    writeFile.mockResolvedValue(undefined)
    unlink.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('encrypts and writes the token when encryption is available', async () => {
    await store.saveToken('secret')

    expect(mkdir).toHaveBeenCalledWith('/tmp/gitfreddo-test-data', { recursive: true })
    expect(encryptString).toHaveBeenCalledWith('secret')
    expect(writeFile).toHaveBeenCalledWith(
      '/tmp/gitfreddo-test-data/forge-token.enc',
      Buffer.from('enc:secret')
    )
  })

  it('throws when OS encryption is unavailable on save', async () => {
    isEncryptionAvailable.mockReturnValue(false)
    await expect(store.saveToken('secret')).rejects.toThrow(/encryption is not available/i)
    await expect(store.saveToken('secret')).rejects.toThrow(/Forge/)
  })

  it('decrypts a stored token', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:secret'))
    await expect(store.loadToken()).resolves.toBe('secret')
  })

  it('returns null when encryption is unavailable on load', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:secret'))
    isEncryptionAvailable.mockReturnValue(false)
    await expect(store.loadToken()).resolves.toBeNull()
  })

  it('returns null when the token file is missing', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'))
    await expect(store.loadToken()).resolves.toBeNull()
  })

  it('clears the token file and ignores missing file errors', async () => {
    await store.clearToken()
    expect(unlink).toHaveBeenCalled()

    unlink.mockRejectedValueOnce(new Error('ENOENT'))
    await expect(store.clearToken()).resolves.toBeUndefined()
  })

  it('reports whether a non-empty token exists', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:secret'))
    await expect(store.hasToken()).resolves.toBe(true)

    decryptString.mockReturnValueOnce('   ')
    await expect(store.hasToken()).resolves.toBe(false)
  })
})
