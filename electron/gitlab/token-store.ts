import { safeStorage } from 'electron'
import { readFile, writeFile, unlink, mkdir } from 'fs/promises'
import { join } from 'path'
import { getAppDataDir } from '../paths'

const SETTINGS_DIR = getAppDataDir()
const TOKEN_PATH = join(SETTINGS_DIR, 'gitlab-token.enc')

export async function saveGitlabToken(token: string): Promise<void> {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error(
      'OS encryption is not available. Cannot store GitLab token securely on this system.'
    )
  }
  await mkdir(SETTINGS_DIR, { recursive: true })
  const encrypted = safeStorage.encryptString(token)
  await writeFile(TOKEN_PATH, encrypted)
}

export async function loadGitlabToken(): Promise<string | null> {
  try {
    const encrypted = await readFile(TOKEN_PATH)
    if (!safeStorage.isEncryptionAvailable()) {
      return null
    }
    return safeStorage.decryptString(encrypted)
  } catch {
    return null
  }
}

export async function clearGitlabToken(): Promise<void> {
  try {
    await unlink(TOKEN_PATH)
  } catch {
    // ignore missing file
  }
}

export async function hasGitlabToken(): Promise<boolean> {
  const token = await loadGitlabToken()
  return Boolean(token?.trim())
}
