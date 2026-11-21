import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Handler wiring only: each operations module is replaced by spies.
vi.mock('./operations/branch', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  branchFastForward: vi.fn(async () => undefined)
}))
vi.mock('./operations/tag', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  tagRename: vi.fn(async () => undefined)
}))
vi.mock('./operations/compose', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  composeCommits: vi.fn(async () => ({ created: 0 }))
}))
vi.mock('./operations/working', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  fileReadStage: vi.fn(async () => 'stage')
}))
vi.mock('./operations/worktree', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  worktreeRemove: vi.fn(async () => undefined)
}))
vi.mock('./operations/submodule', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  submoduleAdd: vi.fn(async () => undefined),
  submoduleInit: vi.fn(async () => undefined),
  submoduleUpdate: vi.fn(async () => undefined),
  submoduleSync: vi.fn(async () => undefined),
  submoduleDeinit: vi.fn(async () => undefined),
  submoduleRemove: vi.fn(async () => undefined),
  submoduleSetUrl: vi.fn(async () => undefined)
}))
vi.mock('./operations/merge', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  mergeInto: vi.fn(async () => undefined),
  mergeAbort: vi.fn(async () => undefined)
}))
vi.mock('./operations/rebase', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  rebaseInteractive: vi.fn(async () => undefined),
  cherryPickContinue: vi.fn(async () => undefined),
  cherryPickSkip: vi.fn(async () => undefined),
  rebaseSquash: vi.fn(async () => undefined)
}))

import { RepoManager } from './repo-manager'
import * as branchOps from './operations/branch'
import * as tagOps from './operations/tag'
import * as composeOps from './operations/compose'
import * as workingOps from './operations/working'
import * as worktreeOps from './operations/worktree'
import * as submoduleOps from './operations/submodule'
import * as mergeOps from './operations/merge'
import * as rebaseOps from './operations/rebase'

let repo: string
let manager: RepoManager

beforeEach(async () => {
  vi.clearAllMocks()
  repo = mkdtempSync(join(tmpdir(), 'gitfreddo-dispatch-'))
  execSync('git init -q -b main', { cwd: repo })
  manager = new RepoManager()
  await manager.connect(repo)
})

afterEach(() => {
  rmSync(repo, { recursive: true, force: true })
})

describe('RepoManager handler wiring', () => {
  const cases: Array<[string, Record<string, unknown>, () => unknown, unknown[]]> = [
    ['branch.fastForward', { branch: 'dev', toRef: 'main' }, () => branchOps.branchFastForward, ['dev', 'main']],
    ['tag.rename', { oldName: 'v1', newName: 'v2' }, () => tagOps.tagRename, ['v1', 'v2']],
    [
      'commit.compose',
      { proposals: [{ files: ['a'], message: 'm' }] },
      () => composeOps.composeCommits,
      [[{ files: ['a'], message: 'm' }]]
    ],
    ['file.readStage', { path: 'a.txt' }, () => workingOps.fileReadStage, [2, 'a.txt']],
    [
      'submodule.add',
      { url: 'u', path: 'p', branch: 'b' },
      () => submoduleOps.submoduleAdd,
      [{ url: 'u', path: 'p', branch: 'b' }]
    ],
    ['submodule.init', { paths: ['p'], recursive: true }, () => submoduleOps.submoduleInit, [['p'], true]],
    [
      'submodule.update',
      { paths: ['p'], init: true, recursive: false, remote: true, merge: false, rebase: true },
      () => submoduleOps.submoduleUpdate,
      [{ paths: ['p'], init: true, recursive: false, remote: true, merge: false, rebase: true }]
    ],
    ['submodule.sync', { paths: ['p'] }, () => submoduleOps.submoduleSync, [['p'], false]],
    ['submodule.setUrl', { path: 'p', url: 'u' }, () => submoduleOps.submoduleSetUrl, ['p', 'u']],
    [
      'merge.into',
      { sourceBranch: 's', targetBranch: 't', squash: true },
      () => mergeOps.mergeInto,
      [{ sourceBranch: 's', targetBranch: 't', noFf: false, squash: true, ffOnly: false }]
    ],
    ['merge.abort', {}, () => mergeOps.mergeAbort, []],
    [
      'rebase.interactive',
      { baseHash: 'abc', todoLines: ['pick abc x'] },
      () => rebaseOps.rebaseInteractive,
      ['abc', ['pick abc x']]
    ],
    ['cherry-pick.continue', { message: 'm' }, () => rebaseOps.cherryPickContinue, ['m']],
    ['cherry-pick.skip', {}, () => rebaseOps.cherryPickSkip, []],
    ['rebase.squash', { hashes: ['a', 'b'] }, () => rebaseOps.rebaseSquash, [['a', 'b']]]
  ]

  for (const [method, params, getSpy, expectedArgs] of cases) {
    it(`routes ${method} to its operation`, async () => {
      await manager.invoke(repo, method as never, params as never)
      expect(getSpy()).toHaveBeenCalledWith(repo, 'git', ...expectedArgs)
    })
  }

  it('passes an empty proposal list when commit.compose gets no array', async () => {
    await manager.invoke(repo, 'commit.compose', {} as never)
    expect(composeOps.composeCommits).toHaveBeenCalledWith(repo, 'git', [])
  })

  it('disconnects a removed worktree that was open as a tab', async () => {
    const other = mkdtempSync(join(tmpdir(), 'gitfreddo-dispatch-wt-'))
    execSync('git init -q -b main', { cwd: other })
    try {
      await manager.connect(other)
      await manager.switchRepo(repo)
      await manager.invoke(repo, 'worktree.remove', { path: other, force: true })
      expect(worktreeOps.worktreeRemove).toHaveBeenCalledWith(repo, 'git', other, true)
      expect(manager.isConnected(other)).toBe(false)
      expect(manager.isConnected(repo)).toBe(true)
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  it('disconnects a deinitialised or removed submodule that was open as a tab', async () => {
    const sub = join(repo, 'vendor')
    execSync(`git init -q -b main "${sub}"`)
    await manager.connect(sub)
    await manager.invoke(repo, 'submodule.deinit', { path: 'vendor', force: true })
    expect(submoduleOps.submoduleDeinit).toHaveBeenCalledWith(repo, 'git', 'vendor', true)
    expect(manager.isConnected(sub)).toBe(false)

    await manager.connect(sub)
    await manager.invoke(repo, 'submodule.remove', { path: 'vendor' })
    expect(submoduleOps.submoduleRemove).toHaveBeenCalledWith(repo, 'git', 'vendor', false)
    expect(manager.isConnected(sub)).toBe(false)
  })
})
