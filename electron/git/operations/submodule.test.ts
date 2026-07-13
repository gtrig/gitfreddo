import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { runGitOrThrow } from '../git-runner'
import { submoduleAdd, submoduleList, submoduleRemove, submoduleSetUrl, submoduleSync, submoduleUpdate, isSubmodulePath } from './submodule'

const SUBMODULE_TEST_TIMEOUT_MS = 30_000

describe('submodule operations', { timeout: SUBMODULE_TEST_TIMEOUT_MS }, () => {
  const tempDirs: string[] = []

  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  function trackDir(dir: string): string {
    tempDirs.push(dir)
    return dir
  }

  async function initRepo(dir: string): Promise<void> {
    const run = (args: string[]) => runGitOrThrow(args, { cwd: dir, gitBinaryPath: 'git' })
    await run(['init', '-b', 'main'])
    await run(['config', 'user.email', 'test@example.com'])
    await run(['config', 'user.name', 'Test'])
    await run(['config', 'protocol.file.allow', 'always'])
  }

  async function createChildRepo(): Promise<string> {
    const child = trackDir(mkdtempSync(join(tmpdir(), 'gf-sub-child-')))
    await initRepo(child)
    writeFileSync(join(child, 'README.md'), 'child\n')
    const run = (args: string[]) => runGitOrThrow(args, { cwd: child, gitBinaryPath: 'git' })
    await run(['add', 'README.md'])
    await run(['commit', '-m', 'child'])
    return child
  }

  it('returns an empty list when .gitmodules is missing', async () => {
    const parent = trackDir(mkdtempSync(join(tmpdir(), 'gf-sub-parent-')))
    await initRepo(parent)
    expect(await submoduleList(parent, 'git')).toEqual([])
  })

  it('lists submodules after add', async () => {
    const parent = trackDir(mkdtempSync(join(tmpdir(), 'gf-sub-parent-')))
    const child = await createChildRepo()
    await initRepo(parent)

    await submoduleAdd(parent, 'git', {
      url: child,
      path: 'vendor/lib'
    })
    const run = (args: string[]) => runGitOrThrow(args, { cwd: parent, gitBinaryPath: 'git' })
    await run(['add', '.gitmodules', 'vendor/lib'])
    await run(['commit', '-m', 'add submodule'])

    const list = await submoduleList(parent, 'git')
    expect(list).toHaveLength(1)
    expect(list[0]?.path).toBe('vendor/lib')
    expect(list[0]?.url).toBe(child)
    expect(list[0]?.hasWorkingTree).toBe(true)
  })

  it('updates and removes a submodule', async () => {
    const parent = trackDir(mkdtempSync(join(tmpdir(), 'gf-sub-parent-')))
    const child = await createChildRepo()
    await initRepo(parent)

    await submoduleAdd(parent, 'git', { url: child, path: 'vendor/lib' })
    const run = (args: string[]) => runGitOrThrow(args, { cwd: parent, gitBinaryPath: 'git' })
    await run(['add', '.gitmodules', 'vendor/lib'])
    await run(['commit', '-m', 'add submodule'])

    rmSync(join(parent, 'vendor/lib'), { recursive: true, force: true })
    await submoduleUpdate(parent, 'git', { paths: ['vendor/lib'], init: true })
    expect(await submoduleList(parent, 'git')).toHaveLength(1)

    await submoduleRemove(parent, 'git', 'vendor/lib', true)
    await run(['commit', '-am', 'remove submodule'])
    expect(await submoduleList(parent, 'git')).toHaveLength(0)
  })

  it('initializes, syncs, updates url, and detects submodule paths', async () => {
    const parent = trackDir(mkdtempSync(join(tmpdir(), 'gf-sub-parent-')))
    const child = await createChildRepo()
    await initRepo(parent)

    await submoduleAdd(parent, 'git', { url: child, path: 'vendor/lib', branch: 'main' })
    const run = (args: string[]) => runGitOrThrow(args, { cwd: parent, gitBinaryPath: 'git' })
    await run(['add', '.gitmodules', 'vendor/lib'])
    await run(['commit', '-m', 'add submodule'])

    await submoduleSync(parent, 'git', ['vendor/lib'])
    await submoduleUpdate(parent, 'git', { paths: ['vendor/lib'], init: true })
    await submoduleSetUrl(parent, 'git', 'vendor/lib', child)

    expect(await isSubmodulePath(parent, 'git', 'vendor/lib')).toBe(true)
    expect(await isSubmodulePath(parent, 'git', 'README.md')).toBe(false)
  })
})
