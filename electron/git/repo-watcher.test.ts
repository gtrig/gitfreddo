import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

interface FakeWatcher {
  root: string
  options: { ignored?: (path: string) => boolean }
  emit: (event: string, path?: string) => void
  unwatch: ReturnType<typeof vi.fn>
  add: ReturnType<typeof vi.fn>
  close: ReturnType<typeof vi.fn>
}

const watchers: FakeWatcher[] = []

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn((root: string, options: FakeWatcher['options']) => {
      const handlers: Array<(event: string, path?: string) => void> = []
      const watcher: FakeWatcher = {
        root,
        options,
        emit: (event, path) => handlers.forEach((handler) => handler(event, path)),
        unwatch: vi.fn(),
        add: vi.fn(),
        close: vi.fn(async () => {})
      }
      watchers.push(watcher)
      return {
        on: (_event: string, handler: (event: string, path?: string) => void) => {
          handlers.push(handler)
        },
        unwatch: watcher.unwatch,
        add: watcher.add,
        close: watcher.close
      }
    })
  }
}))

vi.mock('./repo-path', () => ({
  normalizeRepoPath: (path: string) => path.replace(/\/+$/, ''),
  resolveGitDirSync: () => '/tmp/repo/.git'
}))

import chokidar from 'chokidar'
import { RepoWatcherManager } from './repo-watcher'

const worktreeWatcher = () => watchers.find((watcher) => watcher.root === '/tmp/repo')!
const gitWatcher = () => watchers.find((watcher) => watcher.root === '/tmp/repo/.git')!

describe('RepoWatcherManager', () => {
  beforeEach(() => {
    watchers.length = 0
    vi.useFakeTimers()
    vi.mocked(chokidar.watch).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts worktree and git watchers for a repository', async () => {
    const manager = new RepoWatcherManager({ onChange: vi.fn(), debounceMs: 100 })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)

    expect(chokidar.watch).toHaveBeenCalledTimes(2)
    manager.unwatch('/tmp/repo')
  })

  it('debounces change notifications by scope', async () => {
    const onChange = vi.fn()
    const manager = new RepoWatcherManager({ onChange, debounceMs: 200 })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)

    worktreeWatcher().emit('change', '/tmp/repo/a.txt')
    worktreeWatcher().emit('change', '/tmp/repo/a.txt')
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ repoPath: '/tmp/repo', scope: 'working' })

    manager.dispose()
  })

  it('ignores duplicate watch calls for the same repository', async () => {
    const manager = new RepoWatcherManager({ onChange: vi.fn() })
    manager.watch('/tmp/repo')
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)
    expect(chokidar.watch).toHaveBeenCalledTimes(2)
    manager.dispose()
  })

  it('keeps git-ignored directories out of the worktree watcher', async () => {
    let resolveList!: (dirs: string[]) => void
    const listIgnoredDirectories = vi.fn(
      () => new Promise<string[]>((resolve) => { resolveList = resolve })
    )
    const manager = new RepoWatcherManager({ onChange: vi.fn(), listIgnoredDirectories })
    manager.watch('/tmp/repo')

    // The worktree watcher waits for the ignore list so chokidar never walks node_modules.
    expect(watchers.map((watcher) => watcher.root)).toEqual(['/tmp/repo/.git'])
    resolveList(['/tmp/repo/node_modules'])
    await vi.advanceTimersByTimeAsync(0)

    const ignored = worktreeWatcher().options.ignored!
    expect(ignored('/tmp/repo/node_modules/react/index.js')).toBe(true)
    expect(ignored('/tmp/repo/src/app.ts')).toBe(false)
    manager.dispose()
  })

  it('still watches the worktree when listing ignored directories fails', async () => {
    const manager = new RepoWatcherManager({
      onChange: vi.fn(),
      listIgnoredDirectories: vi.fn(async () => {
        throw new Error('git missing')
      })
    })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)
    expect(worktreeWatcher()).toBeDefined()
    manager.dispose()
  })

  it('refreshes the ignore list when a .gitignore changes', async () => {
    const listIgnoredDirectories = vi
      .fn()
      .mockResolvedValueOnce(['/tmp/repo/out'])
      .mockResolvedValueOnce(['/tmp/repo/node_modules'])
    const manager = new RepoWatcherManager({
      onChange: vi.fn(),
      listIgnoredDirectories,
      debounceMs: 100
    })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)

    worktreeWatcher().emit('change', '/tmp/repo/.gitignore')
    await vi.advanceTimersByTimeAsync(0)

    expect(listIgnoredDirectories).toHaveBeenCalledTimes(2)
    expect(worktreeWatcher().unwatch).toHaveBeenCalledWith('/tmp/repo/node_modules')
    expect(worktreeWatcher().add).toHaveBeenCalledWith('/tmp/repo/out')
    expect(worktreeWatcher().options.ignored!('/tmp/repo/node_modules/x')).toBe(true)
    expect(worktreeWatcher().options.ignored!('/tmp/repo/out/x')).toBe(false)
    manager.dispose()
  })

  it('reports index writes as working-tree changes, not ref changes', async () => {
    const onChange = vi.fn()
    const manager = new RepoWatcherManager({ onChange, debounceMs: 100 })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)

    gitWatcher().emit('change', '/tmp/repo/.git/index')
    vi.advanceTimersByTime(100)
    expect(onChange).toHaveBeenCalledWith({ repoPath: '/tmp/repo', scope: 'working' })
    expect(onChange).not.toHaveBeenCalledWith({ repoPath: '/tmp/repo', scope: 'refs' })

    gitWatcher().emit('change', '/tmp/repo/.git/refs/heads/main')
    vi.advanceTimersByTime(100)
    expect(onChange).toHaveBeenCalledWith({ repoPath: '/tmp/repo', scope: 'refs' })
    manager.dispose()
  })

  it('fires at least every maxWaitMs while changes keep coming', async () => {
    const onChange = vi.fn()
    const manager = new RepoWatcherManager({ onChange, debounceMs: 400, maxWaitMs: 2000 })
    manager.watch('/tmp/repo')
    await vi.advanceTimersByTimeAsync(0)

    for (let elapsed = 0; elapsed < 2100; elapsed += 100) {
      worktreeWatcher().emit('change', '/tmp/repo/build.log')
      vi.advanceTimersByTime(100)
    }
    expect(onChange).toHaveBeenCalledTimes(1)
    manager.dispose()
  })
})
