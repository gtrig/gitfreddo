import { basename, resolve, sep } from 'path'

function normalizeWatchPath(filePath: string): string {
  return resolve(filePath)
}

export function shouldIgnoreWorktreeWatchPath(
  watchedPath: string,
  repoRoot: string,
  gitDir: string
): boolean {
  const normalized = normalizeWatchPath(watchedPath)
  const root = normalizeWatchPath(repoRoot)
  const git = normalizeWatchPath(gitDir)

  if (normalized === git || normalized.startsWith(`${git}${sep}`)) {
    return true
  }

  if (basename(normalized) === '.git') {
    return true
  }

  // Worktree roots can be nested inside the main repo directory.
  if (normalized !== root && !normalized.startsWith(`${root}${sep}`)) {
    return true
  }

  return false
}

/** Paths that should not trigger a git metadata refresh (locks, watchman cookies). */
export function isIgnorableGitWatchPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  return (
    /\/\.git(\/index\.lock|\/worktrees\/[^/]+\/index\.lock)?$/.test(normalized) ||
    /\/\.watchman-cookie-/.test(normalized)
  )
}
