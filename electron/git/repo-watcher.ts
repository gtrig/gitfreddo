import chokidar, { type FSWatcher } from 'chokidar'
import type { RepoChangeEvent, RepoChangeScope } from '../../shared/repo-change'
import { normalizeRepoPath, resolveGitDirSync } from './repo-path'
import { basename } from 'path'
import { buildLsFilesIgnoredDirectoriesArgs } from '../../shared/git/commands'
import { runGitOrThrow } from './git-runner'
import {
  gitWatchScope,
  isIgnorableGitWatchPath,
  isUnderAnyDirectory,
  parseIgnoredDirectories,
  shouldIgnoreWorktreeWatchPath
} from './repo-watcher-paths'

export type RepoChangeHandler = (event: RepoChangeEvent) => void

/** Absolute paths of git-ignored directories in a repo (node_modules, build output…). */
export type ListIgnoredDirectories = (repoPath: string) => Promise<string[]>

interface RepoWatchers {
  /** Null until the ignore list arrives (or forever, once unwatched). */
  worktree: FSWatcher | null
  git: FSWatcher
  ignoredDirs: string[]
  closed: boolean
}

export interface RepoWatcherManagerOptions {
  debounceMs?: number
  /** Longest a stream of changes can hold back a notification. */
  maxWaitMs?: number
  onChange: RepoChangeHandler
  /** When given, ignored directories are kept out of the worktree watcher. */
  listIgnoredDirectories?: ListIgnoredDirectories
}

/** List ignored directories with git (used by main; injectable for tests). */
export async function listGitIgnoredDirectories(
  repoPath: string,
  gitBinaryPath = 'git'
): Promise<string[]> {
  const stdout = await runGitOrThrow(buildLsFilesIgnoredDirectoriesArgs(), {
    cwd: repoPath,
    gitBinaryPath
  })
  return parseIgnoredDirectories(stdout, repoPath)
}

export class RepoWatcherManager {
  private readonly watchers = new Map<string, RepoWatchers>()
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  /** When the first not-yet-delivered change for a key arrived. */
  private readonly pendingSince = new Map<string, number>()
  private readonly debounceMs: number
  private readonly maxWaitMs: number
  private readonly onChange: RepoChangeHandler
  private readonly listIgnoredDirectories?: ListIgnoredDirectories

  constructor(options: RepoWatcherManagerOptions) {
    this.debounceMs = options.debounceMs ?? 400
    this.maxWaitMs = options.maxWaitMs ?? 2000
    this.onChange = options.onChange
    this.listIgnoredDirectories = options.listIgnoredDirectories
  }

  watch(repoPath: string): void {
    const normalized = normalizeRepoPath(repoPath)
    if (this.watchers.has(normalized)) {
      return
    }

    const gitDir = resolveGitDirSync(normalized)
    const git = chokidar.watch(gitDir, {
      ignoreInitial: true,
      ignorePermissionErrors: true,
      ignored: (path) => isIgnorableGitWatchPath(path)
    })
    git.on('all', (_event: string, path?: string) => {
      this.scheduleChange(normalized, gitWatchScope(path))
    })

    const entry: RepoWatchers = { worktree: null, git, ignoredDirs: [], closed: false }
    this.watchers.set(normalized, entry)

    const startWorktree = () => {
      if (entry.closed) return
      const worktree = chokidar.watch(normalized, {
        ignoreInitial: true,
        ignorePermissionErrors: true,
        ignored: (path) =>
          shouldIgnoreWorktreeWatchPath(path, normalized, gitDir) ||
          isUnderAnyDirectory(path, entry.ignoredDirs),
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
      })
      worktree.on('all', (_event: string, path?: string) => {
        if (path && basename(path) === '.gitignore') {
          void this.refreshIgnoredDirs(normalized, entry)
        }
        this.scheduleChange(normalized, 'working')
      })
      entry.worktree = worktree
    }

    if (!this.listIgnoredDirectories) {
      startWorktree()
      return
    }
    // Wait for the ignore list so chokidar never walks into node_modules & co.
    this.listIgnoredDirectories(normalized)
      .then((dirs) => {
        entry.ignoredDirs = dirs
      })
      .catch(() => undefined)
      .finally(startWorktree)
  }

  private async refreshIgnoredDirs(repoPath: string, entry: RepoWatchers): Promise<void> {
    if (!this.listIgnoredDirectories) return
    let next: string[]
    try {
      next = await this.listIgnoredDirectories(repoPath)
    } catch {
      return
    }
    if (entry.closed || !entry.worktree) return
    const previous = entry.ignoredDirs
    entry.ignoredDirs = next
    for (const dir of next) {
      if (!previous.includes(dir)) entry.worktree.unwatch(dir)
    }
    for (const dir of previous) {
      if (!next.includes(dir)) entry.worktree.add(dir)
    }
  }

  unwatch(repoPath: string): void {
    const normalized = normalizeRepoPath(repoPath)
    const entry = this.watchers.get(normalized)
    if (!entry) return
    entry.closed = true
    if (entry.worktree) void entry.worktree.close()
    void entry.git.close()
    this.watchers.delete(normalized)
    this.clearDebounce(normalized)
  }

  unwatchAll(): void {
    for (const path of [...this.watchers.keys()]) {
      this.unwatch(path)
    }
  }

  dispose(): void {
    this.unwatchAll()
  }

  private scheduleChange(repoPath: string, scope: RepoChangeScope): void {
    const key = `${repoPath}:${scope}`
    const now = Date.now()
    const since = this.pendingSince.get(key) ?? now
    this.pendingSince.set(key, since)

    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }
    const fire = () => {
      this.debounceTimers.delete(key)
      this.pendingSince.delete(key)
      this.onChange({ repoPath, scope })
    }
    // Trailing debounce, but never later than maxWaitMs after the first change.
    const delay = Math.max(0, Math.min(this.debounceMs, since + this.maxWaitMs - now))
    this.debounceTimers.set(key, setTimeout(fire, delay))
  }

  private clearDebounce(repoPath: string): void {
    for (const scope of ['working', 'refs'] as const) {
      const key = `${repoPath}:${scope}`
      const timer = this.debounceTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.debounceTimers.delete(key)
      }
      this.pendingSince.delete(key)
    }
  }
}
