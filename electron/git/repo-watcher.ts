import chokidar, { type FSWatcher } from 'chokidar'
import type { RepoChangeEvent, RepoChangeScope } from '../../shared/repo-change'
import { normalizeRepoPath, resolveGitDirSync } from './repo-path'
import { isIgnorableGitWatchPath, shouldIgnoreWorktreeWatchPath } from './repo-watcher-paths'

export type RepoChangeHandler = (event: RepoChangeEvent) => void

interface RepoWatchers {
  worktree: FSWatcher
  git: FSWatcher
}

export interface RepoWatcherManagerOptions {
  debounceMs?: number
  onChange: RepoChangeHandler
}

export class RepoWatcherManager {
  private readonly watchers = new Map<string, RepoWatchers>()
  private readonly debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly debounceMs: number
  private readonly onChange: RepoChangeHandler

  constructor(options: RepoWatcherManagerOptions) {
    this.debounceMs = options.debounceMs ?? 400
    this.onChange = options.onChange
  }

  watch(repoPath: string): void {
    const normalized = normalizeRepoPath(repoPath)
    if (this.watchers.has(normalized)) {
      return
    }

    const gitDir = resolveGitDirSync(normalized)
    const worktree = chokidar.watch(normalized, {
      ignoreInitial: true,
      ignorePermissionErrors: true,
      ignored: (path) => shouldIgnoreWorktreeWatchPath(path, normalized, gitDir),
      awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 }
    })
    const git = chokidar.watch(gitDir, {
      ignoreInitial: true,
      ignorePermissionErrors: true,
      ignored: (path) => isIgnorableGitWatchPath(path)
    })

    const notify = (scope: RepoChangeScope) => {
      this.scheduleChange(normalized, scope)
    }

    worktree.on('all', () => notify('working'))
    git.on('all', () => notify('refs'))

    this.watchers.set(normalized, { worktree, git })
  }

  unwatch(repoPath: string): void {
    const normalized = normalizeRepoPath(repoPath)
    const entry = this.watchers.get(normalized)
    if (!entry) return

    void entry.worktree.close()
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
    const existing = this.debounceTimers.get(key)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(() => {
      this.debounceTimers.delete(key)
      this.onChange({ repoPath, scope })
    }, this.debounceMs)

    this.debounceTimers.set(key, timer)
  }

  private clearDebounce(repoPath: string): void {
    for (const scope of ['working', 'refs'] as const) {
      const key = `${repoPath}:${scope}`
      const timer = this.debounceTimers.get(key)
      if (timer) {
        clearTimeout(timer)
        this.debounceTimers.delete(key)
      }
    }
  }
}
