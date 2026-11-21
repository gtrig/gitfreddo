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

/**
 * Ignored directories from `git ls-files -z --others --ignored --exclude-standard
 * --directory`, as absolute paths. Single ignored files are dropped: only whole
 * directories (node_modules, build output) are worth keeping out of the watcher.
 */
export function parseIgnoredDirectories(output: string, repoRoot: string): string[] {
  const root = normalizeWatchPath(repoRoot)
  return output
    .split('\0')
    .filter((entry) => entry.endsWith('/'))
    .map((entry) => resolve(root, entry.slice(0, -1)))
}

/** True when `path` is one of `directories` or inside one. */
export function isUnderAnyDirectory(path: string, directories: readonly string[]): boolean {
  const normalized = normalizeWatchPath(path)
  return directories.some(
    (directory) => normalized === directory || normalized.startsWith(`${directory}${sep}`)
  )
}

/**
 * Which caches a change inside the git dir affects. Index writes (staging, or
 * git refreshing stat info) only change working-tree status, not refs or history.
 */
export function gitWatchScope(filePath: string | undefined): 'working' | 'refs' {
  if (!filePath) return 'refs'
  const normalized = filePath.replace(/\\/g, '/')
  return /\/\.git(\/worktrees\/[^/]+)?\/index$/.test(normalized) ? 'working' : 'refs'
}
