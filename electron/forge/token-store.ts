import { safeStorage } from 'electron'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { getAppDataDir } from '../paths'

export interface ForgeTokenStore {
  saveToken(token: string): Promise<void>
  loadToken(): Promise<string | null>
  clearToken(): Promise<void>
  hasToken(): Promise<boolean>
}

export function createForgeTokenStore(
  fileName: string,
  displayName: string
): ForgeTokenStore {
  const settingsDir = getAppDataDir()
  const tokenPath = join(settingsDir, fileName)

  /** Decrypted token kept in memory: `undefined` = not loaded yet. */
  let cached: string | null | undefined
  let inflight: Promise<string | null> | null = null
  let generation = 0

  async function writeEncrypted(token: string): Promise<void> {
    await mkdir(settingsDir, { recursive: true })
    const encrypted = await safeStorage.encryptStringAsync(token)
    await writeFile(tokenPath, encrypted)
  }

  async function saveToken(token: string): Promise<void> {
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error(
        `OS encryption is not available. Cannot store ${displayName} token securely on this system.`
      )
    }
    generation += 1
    await writeEncrypted(token)
    cached = token
  }

  async function readAndDecrypt(): Promise<string | null> {
    let encrypted: Buffer
    try {
      encrypted = await readFile(tokenPath)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null
      }
      throw error
    }
    if (!(await safeStorage.isAsyncEncryptionAvailable())) {
      throw new Error('OS encryption is not available')
    }
    const { result, shouldReEncrypt } = await safeStorage.decryptStringAsync(encrypted)
    if (shouldReEncrypt) {
      await writeEncrypted(result).catch(() => undefined)
    }
    return result
  }

  async function loadToken(): Promise<string | null> {
    if (cached !== undefined) return cached
    if (!inflight) {
      const startedAt = generation
      inflight = readAndDecrypt()
        .then((token) => {
          // A save/clear that happened meanwhile wins over this read.
          if (startedAt === generation) cached = token
          return startedAt === generation ? token : (cached ?? null)
        })
        .catch(() => null)
        .finally(() => {
          inflight = null
        })
    }
    return inflight
  }

  async function clearToken(): Promise<void> {
    generation += 1
    cached = null
    try {
      await unlink(tokenPath)
    } catch {
      // ignore missing file
    }
  }

  async function hasToken(): Promise<boolean> {
    const token = await loadToken()
    return Boolean(token?.trim())
  }

  return { saveToken, loadToken, clearToken, hasToken }
}
