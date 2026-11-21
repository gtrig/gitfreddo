import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const encryptString = vi.fn((value: string) => Buffer.from(`enc:${value}`))
const decryptString = vi.fn((buffer: Buffer) => buffer.toString().replace(/^enc:/, ''))
const isEncryptionAvailable = vi.fn(() => true)

vi.mock('electron', () => ({
  safeStorage: {
    isAsyncEncryptionAvailable: async () => isEncryptionAvailable(),
    encryptStringAsync: async (value: string) => encryptString(value),
    decryptStringAsync: async (buffer: Buffer) => ({
      result: decryptString(buffer),
      shouldReEncrypt: false
    })
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

type TokenStoreModule = typeof import('./token-store')
let tokenStore: TokenStoreModule

describe('bitbucket token-store', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    tokenStore = await import('./token-store')
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
    await tokenStore.saveBitbucketToken('bb_secret')

    expect(mkdir).toHaveBeenCalledWith('/tmp/gitfreddo-test-data', { recursive: true })
    expect(encryptString).toHaveBeenCalledWith('bb_secret')
    expect(writeFile).toHaveBeenCalled()
  })

  it('throws when OS encryption is unavailable on save', async () => {
    isEncryptionAvailable.mockReturnValue(false)
    await expect(tokenStore.saveBitbucketToken('bb_secret')).rejects.toThrow(/encryption is not available/i)
  })

  it('decrypts a stored token', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:bb_secret'))
    await expect(tokenStore.loadBitbucketToken()).resolves.toBe('bb_secret')
  })

  it('returns null when encryption is unavailable on load', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:bb_secret'))
    isEncryptionAvailable.mockReturnValue(false)
    await expect(tokenStore.loadBitbucketToken()).resolves.toBeNull()
  })

  it('returns null when the token file is missing', async () => {
    readFile.mockRejectedValue(new Error('ENOENT'))
    await expect(tokenStore.loadBitbucketToken()).resolves.toBeNull()
  })

  it('clears the token file and ignores missing file errors', async () => {
    await tokenStore.clearBitbucketToken()
    expect(unlink).toHaveBeenCalled()

    unlink.mockRejectedValueOnce(new Error('ENOENT'))
    await expect(tokenStore.clearBitbucketToken()).resolves.toBeUndefined()
  })

  it('reports whether a non-empty token exists', async () => {
    readFile.mockResolvedValue(Buffer.from('enc:bb_secret'))
    await expect(tokenStore.hasBitbucketToken()).resolves.toBe(true)

    vi.resetModules()
    tokenStore = await import('./token-store')
    decryptString.mockReturnValueOnce('   ')
    await expect(tokenStore.hasBitbucketToken()).resolves.toBe(false)
  })
})
