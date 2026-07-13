import { rmSync } from 'fs'
import { join } from 'path'
import { gitlabJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { generateSshKeyPair } from '../forge/ssh-key-pair'

export interface SshKeyResult {
  title: string
  publicKey: string
}

interface GitlabApiSshKey {
  title?: string
}

export async function listSshKeys(settingsHost?: string | null): Promise<string[]> {
  const keys = await gitlabJson<GitlabApiSshKey[]>('/user/keys', {}, undefined, settingsHost)
  return keys.map((key) => key.title?.trim() ?? '').filter(Boolean)
}

export async function findGitFreddoSshKeyTitle(
  settingsHost?: string | null
): Promise<string | null> {
  const titles = await listSshKeys(settingsHost)
  return findGitFreddoSshKeyLabel(titles)
}

export { generateSshKeyPair } from '../forge/ssh-key-pair'

export async function uploadSshKey(
  publicKey: string,
  title: string,
  settingsHost?: string | null
): Promise<SshKeyResult> {
  await gitlabJson(
    '/user/keys',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, key: publicKey })
    },
    undefined,
    settingsHost
  )
  return { title, publicKey }
}

export async function generateAndUploadSshKey(
  title: string,
  settingsHost?: string | null
): Promise<SshKeyResult> {
  const { publicKey, privateKeyPath } = generateSshKeyPair()
  const keyDir = join(privateKeyPath, '..')
  try {
    return await uploadSshKey(publicKey, title, settingsHost)
  } finally {
    try {
      rmSync(keyDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup — don't shadow the upload error.
    }
  }
}
