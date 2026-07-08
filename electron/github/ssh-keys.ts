import { execSync } from 'child_process'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { githubJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'

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

export function generateSshKeyPair(): { publicKey: string; privateKeyPath: string } {
  const dir = mkdtempSync(join(tmpdir(), 'gitfreddo-ssh-'))
  const keyPath = join(dir, 'id_rsa')
  execSync(`ssh-keygen -t rsa -b 4096 -f "${keyPath}" -N "" -q`, { stdio: 'ignore' })
  const publicKey = readFileSync(`${keyPath}.pub`, 'utf8').trim()
  return { publicKey, privateKeyPath: keyPath }
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
  const { publicKey } = generateSshKeyPair()
  return uploadSshKey(publicKey, title)
}
