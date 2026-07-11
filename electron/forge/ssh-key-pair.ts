import { execSync } from 'child_process'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Generates an RSA-4096 key pair in a temporary directory.
 * The caller is responsible for cleaning up the returned directory.
 */
export function generateSshKeyPair(): { publicKey: string; privateKeyPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'gitfreddo-ssh-'))
  const keyPath = join(dir, 'id_rsa')
  execSync(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -q`, { stdio: 'ignore' })
  const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim()
  return { publicKey, privateKeyPath: keyPath }
}
