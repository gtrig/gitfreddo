import { githubJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { withGeneratedSshKey, type SshKeyResult } from '../forge/ssh-key-upload'

export type { SshKeyResult }

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

export async function uploadSshKey(publicKey: string, title: string): Promise<SshKeyResult> {
  await githubJson('/user/keys', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, key: publicKey })
  })
  return { title, publicKey }
}

export async function generateAndUploadSshKey(title: string): Promise<SshKeyResult> {
  return withGeneratedSshKey((publicKey) => uploadSshKey(publicKey, title))
}
