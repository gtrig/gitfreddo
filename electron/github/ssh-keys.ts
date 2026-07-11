import { rmSync } from 'fs'
import { join } from 'path'
import { githubJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { generateSshKeyPair } from '../forge/ssh-key-pair'

export interface SshKeyResult {
  title: string
  publicKey: string
}

interface GitHubApiSshKey {
  title?: string
}

export async function listSshKeys(token?: string): Promise<string[]> {
  const keys = await githubJson<GitHubApiSshKey[]>('/user/keys', {}, token)
  return keys.map((key) => key.title?.trim() ?? '').filter(Boolean)
}

export async function findGitFreddoSshKeyTitle(token?: string): Promise<string | null> {
  const titles = await listSshKeys(token)
  return findGitFreddoSshKeyLabel(titles)
}

export { generateSshKeyPair } from '../forge/ssh-key-pair'

export async function uploadSshKey(publicKey: string, title: string): Promise<SshKeyResult> {
  await githubJson('/user/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, key: publicKey })
  })
  return { title, publicKey }
}

export async function generateAndUploadSshKey(title: string): Promise<SshKeyResult> {
  const { publicKey, privateKeyPath } = generateSshKeyPair()
  const keyDir = join(privateKeyPath, '..')
  try {
    return await uploadSshKey(publicKey, title)
  } finally {
    try {
      rmSync(keyDir, { recursive: true, force: true })
    } catch {
      // Best-effort cleanup — don't shadow the upload error.
    }
  }
}
