import { execSync } from 'child_process'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { BitbucketAuthSettings } from '../../shared/ipc'
import { bitbucketJson } from './api/http'

export interface SshKeyResult {
  title: string
  publicKey: string
}

export function generateSshKeyPair(): { publicKey: string; privateKeyPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'gitfreddo-ssh-'))
  const keyPath = join(dir, 'id_rsa')
  execSync(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -q`, { stdio: 'ignore' })
  const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim()
  return { publicKey, privateKeyPath: keyPath }
}

export async function uploadSshKey(
  username: string,
  publicKey: string,
  label: string,
  settings?: BitbucketAuthSettings
): Promise<SshKeyResult> {
  await bitbucketJson(
    `/users/${encodeURIComponent(username)}/ssh-keys`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: publicKey, label })
    },
    undefined,
    settings
  )
  return { title: label, publicKey }
}

export async function generateAndUploadSshKey(
  username: string,
  label: string,
  settings?: BitbucketAuthSettings
): Promise<SshKeyResult> {
  const { publicKey } = generateSshKeyPair()
  return uploadSshKey(username, publicKey, label, settings)
}
