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

  async function saveToken(token: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error(
        `OS encryption is not available. Cannot store ${displayName} token securely on this system.`
      )
    }
    await mkdir(settingsDir, { recursive: true })
    const encrypted = safeStorage.encryptString(token)
    await writeFile(tokenPath, encrypted)
  }

  async function loadToken(): Promise<string | null> {
    try {
      const encrypted = await readFile(tokenPath)
      if (!safeStorage.isEncryptionAvailable()) {
        return null
      }
      return safeStorage.decryptString(encrypted)
    } catch {
      return null
    }
  }

  async function clearToken(): Promise<void> {
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
