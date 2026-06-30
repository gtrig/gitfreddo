import { existsSync } from 'fs'
import { resolve } from 'path'

export function normalizeRepoPath(repoPath: string): string {
  return resolve(repoPath)
}

export function hasGitDir(repoPath: string): boolean {
  const normalized = normalizeRepoPath(repoPath)
  return existsSync(resolve(normalized, '.git'))
}
