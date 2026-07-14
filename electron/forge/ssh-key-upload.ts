import { rmSync } from 'fs'
import { join } from 'path'
import { generateSshKeyPair } from './ssh-key-pair'

export interface SshKeyResult {
  title: string
  publicKey: string
}

/**
 * Generates a temporary SSH key pair, uploads the public key via `upload`,
 * then best-effort deletes the temp directory (even if upload fails).
 */
export async function withGeneratedSshKey(
  upload: (publicKey: string) => Promise<SshKeyResult>
): Promise<SshKeyResult> {
  const { publicKey, privateKeyPath } = generateSshKeyPair()
  const keyDir = join(privateKeyPath, '..')
  try {
    return await upload(publicKey)
  } finally {
    try {
      rmSync(keyDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup — don't shadow the upload error.
    }
  }
}
