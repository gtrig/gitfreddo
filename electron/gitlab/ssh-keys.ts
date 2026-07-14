import { gitlabJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { withGeneratedSshKey, type SshKeyResult } from '../forge/ssh-key-upload'

export type { SshKeyResult }

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
  return withGeneratedSshKey((publicKey) => uploadSshKey(publicKey, title, settingsHost))
}
