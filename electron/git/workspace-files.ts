import { unlink } from 'fs/promises'
import { relative, resolve } from 'path'
import { normalizeRepoPath } from './repo-path'

export function resolveRepoFile(repoPath: string, relativePath: string): string {
  const normalized = normalizeRepoPath(repoPath)
  const full = resolve(normalized, relativePath)
  const rel = relative(normalized, full)
  if (rel.startsWith('..') || resolve(rel).startsWith('..')) {
    throw new Error('Path escapes repository root')
  }
  return full
}

export async function deleteRepoFile(repoPath: string, relativePath: string): Promise<void> {
  await unlink(resolveRepoFile(repoPath, relativePath))
}
