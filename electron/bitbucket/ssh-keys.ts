import { rmSync } from 'fs'
import { join } from 'path'
import type { BitbucketAuthSettings } from '../../shared/ipc'
import { bitbucketJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { generateSshKeyPair } from '../forge/ssh-key-pair'

export interface SshKeyResult {
  title: string
  publicKey: string
}

interface BitbucketApiSshKey {
  label?: string
}

interface BitbucketSshKeyPage {
  values?: BitbucketApiSshKey[]
}

export async function listSshKeys(
  username: string,
  settings?: BitbucketAuthSettings
): Promise<string[]> {
  const keys = await bitbucketJson<BitbucketSshKeyPage>(
    `/users/${encodeURIComponent(username)}/ssh-keys`,
    {},
    undefined,
    settings
  )
  return (keys.values ?? []).map((key) => key.label?.trim() ?? '').filter(Boolean)
}

export async function findGitFreddoSshKeyTitle(
  username: string,
  settings?: BitbucketAuthSettings
): Promise<string | null> {
  const labels = await listSshKeys(username, settings)
  return findGitFreddoSshKeyLabel(labels)
}

export { generateSshKeyPair } from '../forge/ssh-key-pair'

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
  const { publicKey, privateKeyPath } = generateSshKeyPair()
  const keyDir = join(privateKeyPath, '..')
  try {
    return await uploadSshKey(username, publicKey, label, settings)
  } finally {
    try {
      rmSync(keyDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup — don't shadow the upload error.
    }
  }
}
