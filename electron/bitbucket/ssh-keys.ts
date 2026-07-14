import type { BitbucketAuthSettings } from '../../shared/ipc'
import { bitbucketJson } from './api/http'
import { findGitFreddoSshKeyLabel } from '../../shared/forge-ssh'
import { withGeneratedSshKey, type SshKeyResult } from '../forge/ssh-key-upload'

export type { SshKeyResult }

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
  return withGeneratedSshKey((publicKey) => uploadSshKey(username, publicKey, label, settings))
}
