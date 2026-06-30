import { unlink } from 'fs/promises'
import { resolve } from 'path'
import { normalizeRepoPath } from './repo-path'

export function resolveRepoFile(repoPath: string, relativePath: string): string {
  const normalized = normalizeRepoPath(repoPath)
  const full = resolve(normalized, relativePath)
  if (!full.startsWith(normalized)) {
    throw new Error('Path escapes repository root')
  }
  return full
}

export async function deleteRepoFile(repoPath: string, relativePath: string): Promise<void> {
  await unlink(resolveRepoFile(repoPath, relativePath))
}
