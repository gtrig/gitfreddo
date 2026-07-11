import { existsSync, readFileSync, realpathSync, statSync } from 'fs'
import { resolve } from 'path'

export function normalizeRepoPath(repoPath: string): string {
  return resolve(repoPath)
}

/** Resolve symlinks and platform-specific path aliases (e.g. /var vs /private/var on macOS). */
export function canonicalizePath(path: string): string {
  const resolved = resolve(path)
  try {
    if (existsSync(resolved)) {
      return realpathSync.native(resolved)
    }
  } catch {
    // Path may have been removed between existsSync and realpathSync.
  }
  return resolved
}

export function hasGitDir(repoPath: string): boolean {
  const normalized = normalizeRepoPath(repoPath)
  return existsSync(resolve(normalized, '.git'))
}

/** Resolve the absolute git directory without spawning git. */
export function resolveGitDirSync(repoPath: string): string {
  const normalized = normalizeRepoPath(repoPath)
  const dotGit = resolve(normalized, '.git')
  if (!existsSync(dotGit)) {
    throw new Error(`No .git found at ${normalized}`)
  }

  if (statSync(dotGit).isDirectory()) {
    return dotGit
  }

  const content = readFileSync(dotGit, 'utf8').trim()
  const match = content.match(/^gitdir:\s*(.+)$/m)
  if (!match?.[1]) {
    throw new Error(`Invalid .git file at ${dotGit}`)
  }

  return resolve(normalized, match[1])
}
