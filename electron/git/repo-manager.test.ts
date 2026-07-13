import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RepoManager } from './repo-manager'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
  writeFileSync(join(dir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: dir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: dir, stdio: 'ignore' })
}

let tmpDir: string
let manager: RepoManager

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-test-'))
  initRepo(tmpDir)
  manager = new RepoManager()
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('RepoManager', () => {
  describe('connect / switchRepo / disconnectRepo', () => {
    it('connects to a valid git repo and sets active path', async () => {
      const path = await manager.connect(tmpDir)
      expect(path).toBe(tmpDir)
      expect(manager.getRepoPath()).toBe(tmpDir)
      expect(manager.listRepos()).toContain(tmpDir)
    })

    it('throws when connecting to a non-git directory', async () => {
      const nonGit = mkdtempSync(join(tmpdir(), 'not-a-repo-'))
      try {
        await expect(manager.connect(nonGit)).rejects.toThrow('No .git found')
      } finally {
        rmSync(nonGit, { recursive: true, force: true })
      }
    })

    it('switchRepo connects a new path if not already tracked', async () => {
      await manager.connect(tmpDir)
      const dir2 = mkdtempSync(join(tmpdir(), 'gitfreddo-test-'))
      initRepo(dir2)
      try {
        await manager.switchRepo(dir2)
        expect(manager.getRepoPath()).toBe(dir2)
        expect(manager.listRepos()).toHaveLength(2)
      } finally {
        rmSync(dir2, { recursive: true, force: true })
      }
    })

    it('switchRepo changes active path for an already-connected repo', async () => {
      const dir2 = mkdtempSync(join(tmpdir(), 'gitfreddo-test-'))
      initRepo(dir2)
      try {
        await manager.connect(tmpDir)
        await manager.connect(dir2)
        await manager.switchRepo(tmpDir)
        expect(manager.getRepoPath()).toBe(tmpDir)
      } finally {
        rmSync(dir2, { recursive: true, force: true })
      }
    })

    it('disconnectRepo removes from list and falls back to another', async () => {
      const dir2 = mkdtempSync(join(tmpdir(), 'gitfreddo-test-'))
      initRepo(dir2)
      try {
        await manager.connect(tmpDir)
        await manager.connect(dir2)
        await manager.disconnectRepo(dir2)
        expect(manager.listRepos()).not.toContain(dir2)
        expect(manager.getRepoPath()).toBe(tmpDir)
      } finally {
        rmSync(dir2, { recursive: true, force: true })
      }
    })

    it('disconnectAll clears all repos', async () => {
      await manager.connect(tmpDir)
      await manager.disconnectAll()
      expect(manager.listRepos()).toHaveLength(0)
      expect(manager.getRepoPath()).toBeNull()
    })
  })

  describe('invoke dispatch', () => {
    it('throws for unknown git method', async () => {
      await manager.connect(tmpDir)
      await expect(
        manager.invoke(tmpDir, 'unknown.method' as never)
      ).rejects.toThrow('Unknown git method: unknown.method')
    })

    it('throws when no repository is connected', async () => {
      await expect(
        manager.invoke(tmpDir, 'repo.status')
      ).rejects.toThrow('No repository connected')
    })

    it('dispatches repo.status', async () => {
      await manager.connect(tmpDir)
      const result = await manager.invoke(tmpDir, 'repo.status')
      expect(result.branch).toBe('main')
      expect(result.path).toBe(tmpDir)
      expect(result.isDetached).toBe(false)
    })

    it('dispatches log.graph', async () => {
      await manager.connect(tmpDir)
      const result = await manager.invoke(tmpDir, 'log.graph', { maxCount: 10 } as never)
      expect(result.commits).toHaveLength(1)
      expect(result.commits[0].subject).toBe('initial')
    })

    it('dispatches branch.list', async () => {
      await manager.connect(tmpDir)
      const branches = await manager.invoke(tmpDir, 'branch.list', undefined)
      expect(Array.isArray(branches)).toBe(true)
      const main = (branches as Array<{ name: string }>).find((b) => b.name === 'main')
      expect(main).toBeDefined()
    })

    it('dispatches config.get', async () => {
      await manager.connect(tmpDir)
      const name = await manager.invoke(tmpDir, 'config.get', { key: 'user.name', scope: 'local' })
      expect(name).toBe('Test')
    })

    it('dispatches working.status', async () => {
      await manager.connect(tmpDir)
      const status = await manager.invoke(tmpDir, 'working.status', undefined)
      expect(status.isClean).toBe(true)
    })

    it('dispatches tag.list', async () => {
      await manager.connect(tmpDir)
      const tags = await manager.invoke(tmpDir, 'tag.list', undefined)
      expect(Array.isArray(tags)).toBe(true)
    })

    it('dispatches remote.list', async () => {
      await manager.connect(tmpDir)
      const remotes = await manager.invoke(tmpDir, 'remote.list', undefined)
      expect(Array.isArray(remotes)).toBe(true)
    })

    it('dispatches stash.list', async () => {
      await manager.connect(tmpDir)
      const stashes = await manager.invoke(tmpDir, 'stash.list', undefined)
      expect(Array.isArray(stashes)).toBe(true)
    })

    it('dispatches notes.list', async () => {
      await manager.connect(tmpDir)
      const notes = await manager.invoke(tmpDir, 'notes.list', undefined)
      expect(Array.isArray(notes)).toBe(true)
    })

    it('uses setConfig git binary when dispatching', async () => {
      manager.setConfig({ gitBinaryPath: 'git' })
      await manager.connect(tmpDir)
      const status = await manager.invoke(tmpDir, 'repo.status')
      expect(status.branch).toBe('main')
    })

    it('throws when invoking for a path that is not connected', async () => {
      await manager.connect(tmpDir)
      const other = mkdtempSync(join(tmpdir(), 'gitfreddo-other-'))
      try {
        await expect(manager.invoke(other, 'repo.status')).rejects.toThrow(/no repository connected/i)
      } finally {
        rmSync(other, { recursive: true, force: true })
      }
    })
  })
})
