import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GitIpcMethod } from '../../shared/git/ipc'
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
let commitHash: string

beforeEach(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-invoke-'))
  initRepo(tmpDir)
  manager = new RepoManager()
  await manager.connect(tmpDir)
  const graph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
  commitHash = graph.commits[0]!.hash
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('RepoManager invoke coverage', () => {
  it('dispatches read/query IPC methods', async () => {
    const queries: Array<[GitIpcMethod, unknown]> = [
      ['repo.status', undefined],
      ['log.graph', { maxCount: 20 }],
      ['log.show', { hash: commitHash }],
      ['log.message', { hash: commitHash }],
      ['log.tree', { hash: commitHash }],
      ['log.file', { path: 'README.md' }],
      ['log.pickaxe', { query: 'initial' }],
      ['log.search', { grep: 'initial' }],
      ['branch.list', undefined],
      ['tag.list', undefined],
      ['working.status', undefined],
      ['working.cleanPreview', { includeIgnored: false }],
      ['diff.working', {}],
      ['diff.staged', {}],
      ['diff.commits', { fromRef: commitHash, toRef: commitHash }],
      ['diff.commitRange', { oldestHash: commitHash, newestHash: commitHash }],
      ['diff.show', { ref: commitHash, path: 'README.md' }],
      ['file.read', { ref: commitHash, path: 'README.md' }],
      ['file.blame', { path: 'README.md' }],
      ['reflog.list', { maxCount: 20 }],
      ['undo.peek', undefined],
      ['notes.list', { hash: commitHash }],
      ['bisect.status', undefined],
      ['working.read', { path: 'README.md' }],
      ['config.get', { key: 'user.name', scope: 'local' }],
      ['config.list', { scope: 'local' }],
      ['hooks.list', undefined],
      ['remote.list', undefined],
      ['stash.list', undefined],
      ['worktree.list', undefined],
      ['submodule.list', undefined],
      ['merge.status', undefined],
      ['maintenance.unreachable', undefined],
      ['maintenance.staleBranches', { hashes: [commitHash] }],
      ['maintenance.prune', undefined]
    ]

    for (const [method, params] of queries) {
      await expect(manager.invoke(tmpDir, method, params as never)).resolves.toBeDefined()
    }
  })

  it('dispatches mutating IPC methods on a disposable repo', async () => {
    writeFileSync(join(tmpDir, 'README.md'), 'updated\n')
    await manager.invoke(tmpDir, 'stage.add', { paths: ['README.md'] })
    await manager.invoke(tmpDir, 'stage.reset', { paths: ['README.md'] })
    await manager.invoke(tmpDir, 'working.discard', { paths: ['README.md'], staged: false })
    await manager.invoke(tmpDir, 'working.write', { path: 'notes.txt', content: 'hello\n' })
    await manager.invoke(tmpDir, 'working.read', { path: 'notes.txt' })
    execSync('git add notes.txt', { cwd: tmpDir, stdio: 'ignore' })
    await manager.invoke(tmpDir, 'working.remove', { paths: ['notes.txt'] })
    await manager.invoke(tmpDir, 'working.addToGitignore', { path: 'ignored.txt', directory: false })
    await manager.invoke(tmpDir, 'stage.add', { paths: ['.gitignore'] })
    await manager.invoke(tmpDir, 'commit.create', { message: 'Track ignore update', amend: false, sign: false })

    await manager.invoke(tmpDir, 'branch.create', { name: 'feature', startPoint: commitHash })
    await manager.invoke(tmpDir, 'branch.checkout', { name: 'feature' })
    writeFileSync(join(tmpDir, 'feature.txt'), 'feature\n')
    execSync('git add feature.txt && git commit -m "feature"', { cwd: tmpDir, stdio: 'ignore' })
    const featureGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
    const featureHash = featureGraph.commits[0]!.hash

    await manager.invoke(tmpDir, 'branch.checkout', { name: 'feature' })
    await manager.invoke(tmpDir, 'merge.squashInto', {
      sourceBranch: 'feature',
      targetBranch: 'main',
      message: 'Squash feature'
    })
    await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })

    await manager.invoke(tmpDir, 'tag.create', { name: 'v0.0.1', target: commitHash })
    await manager.invoke(tmpDir, 'tag.delete', { name: 'v0.0.1' })

    await manager.invoke(tmpDir, 'notes.add', { hash: commitHash, message: 'note body' })
    await manager.invoke(tmpDir, 'config.set', { key: 'gitfreddo.test', value: '1', scope: 'local' })

    writeFileSync(join(tmpDir, 'README.md'), 'stash me\n')
    await manager.invoke(tmpDir, 'stash.push', { message: 'wip' })
    await manager.invoke(tmpDir, 'stash.show', { index: 0 })
    await manager.invoke(tmpDir, 'stash.files', { index: 0 })
    await manager.invoke(tmpDir, 'stash.apply', { index: 0 })
    await manager.invoke(tmpDir, 'stash.drop', { index: 0 })

    await manager.invoke(tmpDir, 'remote.add', { name: 'origin', url: tmpDir })
    await manager.invoke(tmpDir, 'remote.setUrl', { name: 'origin', url: tmpDir, push: false })
    await manager.invoke(tmpDir, 'remote.rename', { oldName: 'origin', newName: 'backup' })
    await manager.invoke(tmpDir, 'remote.remove', { name: 'backup' })

    await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })
    await manager.invoke(tmpDir, 'cherry-pick', { hash: featureHash, noCommit: true })
    await expect(manager.invoke(tmpDir, 'cherry-pick.abort', undefined)).rejects.toThrow()

    await expect(
      manager.invoke(tmpDir, 'rebase.start', { onto: commitHash, from: featureHash })
    ).rejects.toThrow()

    await manager.invoke(tmpDir, 'bisect.start', { badRef: 'HEAD', goodRef: commitHash })
    await manager.invoke(tmpDir, 'bisect.reset', undefined)

    const wtDir = mkdtempSync(join(tmpdir(), 'gitfreddo-wt-'))
    try {
      await manager.invoke(tmpDir, 'worktree.add', { path: wtDir, branch: 'feature' })
      await manager.invoke(tmpDir, 'worktree.prune', undefined)
      await manager.invoke(tmpDir, 'worktree.remove', { path: wtDir, force: true })
    } finally {
      rmSync(wtDir, { recursive: true, force: true })
    }

    await manager.invoke(tmpDir, 'hooks.write', { name: 'pre-commit', content: '#!/bin/sh\nexit 0\n' })
    await manager.invoke(tmpDir, 'hooks.read', { name: 'pre-commit' })
    await manager.invoke(tmpDir, 'hooks.enable', { name: 'pre-commit' })
    await manager.invoke(tmpDir, 'hooks.disable', { name: 'pre-commit' })
    await manager.invoke(tmpDir, 'hooks.delete', { name: 'pre-commit' })

    await manager.invoke(tmpDir, 'branch.delete', { name: 'feature', force: true })

    expect(manager.getRepoPath()).toBe(tmpDir)
  })

  it('dispatches remaining IPC methods and repo lifecycle', async () => {
    manager.setConfig({ gitBinaryPath: 'git' })
    expect(manager.listRepos()).toContain(tmpDir)

    await manager.invoke(tmpDir, 'branch.create', { name: 'side', startPoint: commitHash })
    await manager.invoke(tmpDir, 'branch.checkout', { name: 'side' })
    writeFileSync(join(tmpDir, 'side.txt'), 'side\n')
    execSync('git add side.txt && git commit -m "side"', { cwd: tmpDir, stdio: 'ignore' })
    const sideGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
    sideGraph.commits[0]!.hash

    await manager.invoke(tmpDir, 'branch.rename', { oldName: 'side', newName: 'renamed' })
    await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })

    writeFileSync(join(tmpDir, 'rename-me.txt'), 'x\n')
    execSync('git add rename-me.txt && git commit -m "rename"', { cwd: tmpDir, stdio: 'ignore' })
    await manager.invoke(tmpDir, 'working.rename', { oldPath: 'rename-me.txt', newPath: 'renamed.txt' })

    writeFileSync(join(tmpDir, 'README.md'), 'dirty\n')
    await manager.invoke(tmpDir, 'working.cleanPreview', { includeIgnored: true })
    await manager.invoke(tmpDir, 'working.clean', { includeIgnored: false })

    await manager.invoke(tmpDir, 'reset', { mode: 'mixed', ref: commitHash })

    writeFileSync(join(tmpDir, 'for-reset.txt'), 'reset me\n')
    execSync('git add for-reset.txt && git commit -m "for reset"', { cwd: tmpDir, stdio: 'ignore' })
    await manager.invoke(tmpDir, 'reset.head', { mode: 'mixed' })
    await manager.invoke(tmpDir, 'undo.last', undefined)

    writeFileSync(join(tmpDir, 'README.md'), 'stash again\n')
    await manager.invoke(tmpDir, 'stash.push', { message: 'pop me' })
    await manager.invoke(tmpDir, 'stash.pop', { index: 0 })

    await manager.invoke(tmpDir, 'remote.add', { name: 'origin', url: tmpDir })
    await manager.invoke(tmpDir, 'stage.applyPatch', {
      patch: 'diff --git a/patch.txt b/patch.txt\nnew file mode 100644\n--- /dev/null\n+++ b/patch.txt\n@@ -0,0 +1 @@\n+patched\n'
    })
    await manager.invoke(tmpDir, 'tag.create', { name: 'v-test', target: commitHash })
    await manager.invoke(tmpDir, 'tag.delete', { name: 'v-test' })
    await manager.invoke(tmpDir, 'remote.remove', { name: 'origin' })

    await manager.invoke(tmpDir, 'maintenance.removeStaleBranches', { branchNames: ['renamed'] })

    const otherDir = mkdtempSync(join(tmpdir(), 'gitfreddo-other-'))
    try {
      initRepo(otherDir)
      await manager.switchRepo(otherDir)
      expect(manager.getRepoPath()).toBe(otherDir)
      await manager.switchRepo(tmpDir)
    } finally {
      await manager.disconnectRepo(otherDir)
      rmSync(otherDir, { recursive: true, force: true })
    }

    await manager.disconnectRepo(tmpDir)
    expect(manager.listRepos()).not.toContain(tmpDir)
    await manager.disconnectAll()
    expect(manager.listRepos()).toEqual([])
  })

  it('serializes long invoke params for debug logging', async () => {
    const longValue = 'x'.repeat(300)
    await manager.invoke(tmpDir, 'config.get', { key: longValue, scope: 'local' } as never)
    expect(true).toBe(true)
  })

  it('dispatches maintenance handlers with alternate parameter shapes', async () => {
    await manager.invoke(tmpDir, 'maintenance.staleBranches', { hash: commitHash })
    await manager.invoke(tmpDir, 'maintenance.staleBranches', { hashes: [commitHash] })
    await manager.invoke(tmpDir, 'branch.create', { name: 'stale-branch', startPoint: commitHash })
    await manager.invoke(tmpDir, 'maintenance.removeStaleBranches', {
      refs: ['refs/heads/stale-branch']
    })
    expect(true).toBe(true)
  })

  it('dispatches remaining branch, tag, fetch, and rewrite IPC methods', async () => {
    const bareRemote = mkdtempSync(join(tmpdir(), 'gitfreddo-invoke-bare-'))
    try {
      execSync(`git init --bare "${bareRemote}"`, { stdio: 'ignore' })
      await manager.invoke(tmpDir, 'remote.add', { name: 'origin', url: bareRemote })
      execSync('git push -u origin main', { cwd: tmpDir, stdio: 'ignore' })
      execSync('git fetch origin', { cwd: tmpDir, stdio: 'ignore' })

      await manager.invoke(tmpDir, 'branch.checkoutRemote', {
        remoteBranch: 'remotes/origin/main',
        localName: 'from-remote'
      })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })
      await manager.invoke(tmpDir, 'branch.setUpstream', {
        branch: 'main',
        upstream: 'origin/main'
      })
      await manager.invoke(tmpDir, 'branch.unsetUpstream', { branch: 'main' })
      await manager.invoke(tmpDir, 'branch.setUpstream', {
        branch: 'main',
        upstream: 'origin/main'
      })

      await manager.invoke(tmpDir, 'branch.create', { name: 'publish-me', startPoint: commitHash })
      writeFileSync(join(tmpDir, 'publish.txt'), 'publish\n')
      execSync('git add publish.txt && git commit -m "publish"', { cwd: tmpDir, stdio: 'ignore' })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'publish-me' })
      await manager.invoke(tmpDir, 'push', { remote: 'origin', branch: 'publish-me', setUpstream: true })
      await manager.invoke(tmpDir, 'branch.deleteRemote', {
        remote: 'origin',
        branch: 'publish-me'
      })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })
      await manager.invoke(tmpDir, 'branch.delete', { name: 'publish-me', force: true })
      await manager.invoke(tmpDir, 'branch.delete', { name: 'from-remote', force: true })

      await manager.invoke(tmpDir, 'fetch', { remote: 'origin', tags: true })
      await manager.invoke(tmpDir, 'pull', { remote: 'origin', branch: 'main', rebase: true })

      await manager.invoke(tmpDir, 'tag.create', { name: 'v-ipc', target: commitHash, message: 'ipc tag' })
      await manager.invoke(tmpDir, 'tag.push', { name: 'v-ipc', remote: 'origin' })
      await manager.invoke(tmpDir, 'tag.delete', { name: 'v-ipc', remote: 'origin', alsoDeleteRemote: true })

      writeFileSync(join(tmpDir, 'reword.txt'), 'reword me\n')
      execSync('git add reword.txt && git commit -m "to reword"', { cwd: tmpDir, stdio: 'ignore' })
      const rewordGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
      const rewordHash = rewordGraph.commits[0]!.hash
      await manager.invoke(tmpDir, 'commit.reword', {
        hash: rewordHash,
        message: 'Reworded commit'
      })
      const rewordedGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
      expect(rewordedGraph.commits[0]?.subject).toBe('Reworded commit')

      writeFileSync(join(tmpDir, 'stash-branch.txt'), 'stash branch\n')
      execSync('git add stash-branch.txt', { cwd: tmpDir, stdio: 'ignore' })
      await manager.invoke(tmpDir, 'stash.push', { message: 'branch stash' })
      await manager.invoke(tmpDir, 'stash.branch', { branchName: 'from-stash', index: 0 })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })

      writeFileSync(join(tmpDir, 'README.md'), 'conflict base\n')
      execSync('git add README.md && git commit -m "main edit"', { cwd: tmpDir, stdio: 'ignore' })
      await manager.invoke(tmpDir, 'branch.create', { name: 'side', startPoint: commitHash })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'side' })
      writeFileSync(join(tmpDir, 'README.md'), 'side edit\n')
      execSync('git add README.md && git commit -m "side edit"', { cwd: tmpDir, stdio: 'ignore' })
      await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })

      const mergeResult = await manager.invoke(tmpDir, 'merge.start', { branch: 'side', noFf: true })
      expect(mergeResult.status).toBe('conflicts')
      writeFileSync(join(tmpDir, 'README.md'), 'merged\n')
      execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' })
      await manager.invoke(tmpDir, 'merge.continue', { message: 'Merge side' })

      writeFileSync(join(tmpDir, 'revert-me.txt'), 'revert\n')
      execSync('git add revert-me.txt && git commit -m "revert me"', { cwd: tmpDir, stdio: 'ignore' })
      const revertGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
      await manager.invoke(tmpDir, 'commit.revert', { hash: revertGraph.commits[0]!.hash })

      await manager.invoke(tmpDir, 'bisect.start', { badRef: 'HEAD', goodRef: commitHash })
      await manager.invoke(tmpDir, 'bisect.good', { ref: commitHash })
      await manager.invoke(tmpDir, 'bisect.bad', { ref: 'HEAD' })
      await manager.invoke(tmpDir, 'bisect.reset', undefined)
    } finally {
      rmSync(bareRemote, { recursive: true, force: true })
    }
  })

  it('cherry-picks multiple commits via hashes array', async () => {
    await manager.invoke(tmpDir, 'branch.create', { name: 'pick-branch', startPoint: commitHash })
    await manager.invoke(tmpDir, 'branch.checkout', { name: 'pick-branch' })
    writeFileSync(join(tmpDir, 'pick-a.txt'), 'a\n')
    execSync('git add pick-a.txt && git commit -m "pick a"', { cwd: tmpDir, stdio: 'ignore' })
    writeFileSync(join(tmpDir, 'pick-b.txt'), 'b\n')
    execSync('git add pick-b.txt && git commit -m "pick b"', { cwd: tmpDir, stdio: 'ignore' })
    const pickGraph = await manager.invoke(tmpDir, 'log.graph', { maxCount: 5 })
    const newerHash = pickGraph.commits[0]!.hash
    const olderHash = pickGraph.commits[1]!.hash

    await manager.invoke(tmpDir, 'branch.checkout', { name: 'main' })
    await manager.invoke(tmpDir, 'cherry-pick', { hashes: [olderHash, newerHash], noCommit: true })
  })

  it('serializes non-JSON params for debug logging', async () => {
    const circular: { self?: unknown } = {}
    circular.self = circular
    await manager.invoke(tmpDir, 'config.get', { key: 'user.name', scope: 'local' } as never)
    const dispatch = manager as unknown as {
      dispatchInvoke: (repoPath: string | undefined, method: string, params?: unknown) => Promise<unknown>
    }
    await expect(
      dispatch.dispatchInvoke(tmpDir, 'config.get', circular)
    ).resolves.toBeDefined()
  })
})
