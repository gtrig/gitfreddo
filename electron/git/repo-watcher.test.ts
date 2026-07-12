import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

const watchHandlers: Array<() => void> = []

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn(() => ({
      on: (_event: string, handler: () => void) => {
        watchHandlers.push(handler)
      },
      close: vi.fn(async () => {})
    }))
  }
}))

vi.mock('./repo-path', () => ({
  normalizeRepoPath: (path: string) => path.replace(/\/+$/, ''),
  resolveGitDirSync: () => '/tmp/repo/.git'
}))

import chokidar from 'chokidar'
import { RepoWatcherManager } from './repo-watcher'

describe('RepoWatcherManager', () => {
  beforeEach(() => {
    watchHandlers.length = 0
    vi.useFakeTimers()
    vi.mocked(chokidar.watch).mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts worktree and git watchers for a repository', () => {
    const manager = new RepoWatcherManager({ onChange: vi.fn(), debounceMs: 100 })
    manager.watch('/tmp/repo')

    expect(chokidar.watch).toHaveBeenCalledTimes(2)
    manager.unwatch('/tmp/repo')
  })

  it('debounces change notifications by scope', () => {
    const onChange = vi.fn()
    const manager = new RepoWatcherManager({ onChange, debounceMs: 200 })
    manager.watch('/tmp/repo')

    watchHandlers[0]?.()
    watchHandlers[0]?.()
    expect(onChange).not.toHaveBeenCalled()

    vi.advanceTimersByTime(200)
    expect(onChange).toHaveBeenCalledWith({ repoPath: '/tmp/repo', scope: 'working' })

    manager.dispose()
  })

  it('ignores duplicate watch calls for the same repository', () => {
    const manager = new RepoWatcherManager({ onChange: vi.fn() })
    manager.watch('/tmp/repo')
    manager.watch('/tmp/repo')
    expect(chokidar.watch).toHaveBeenCalledTimes(2)
    manager.dispose()
  })
})
