import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { diffStaged, diffWorking } from './diff'

const dirs: string[] = []

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', ['-c', 'protocol.file.allow=always', ...args], {
    cwd,
    encoding: 'utf8'
  })
  if (result.status !== 0) throw new Error(result.stderr)
  return result.stdout.trim()
}

function initRepo(prefix: string): string {
  const cwd = mkdtempSync(join(tmpdir(), prefix))
  dirs.push(cwd)
  git(cwd, 'init', '-q', '-b', 'main')
  git(cwd, 'config', 'user.email', 'test@example.com')
  git(cwd, 'config', 'user.name', 'Test')
  git(cwd, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(cwd, 'README.md'), `${prefix}\n`)
  git(cwd, 'add', '-A')
  git(cwd, 'commit', '-qm', 'initial')
  return cwd
}

/** Parent repo with `vendor` as a submodule whose checkout has a new commit. */
function repoWithMovedSubmodule(): { parent: string; vendor: string } {
  const library = initRepo('gitfreddo-diff-lib-')
  const parent = initRepo('gitfreddo-diff-parent-')
  git(parent, 'submodule', '-q', 'add', library, 'vendor')
  git(parent, 'commit', '-qm', 'add vendor')
  const vendor = join(parent, 'vendor')
  git(vendor, 'config', 'user.email', 'test@example.com')
  git(vendor, 'config', 'user.name', 'Test')
  writeFileSync(join(vendor, 'lib.txt'), 'new\n')
  git(vendor, 'add', '-A')
  git(vendor, 'commit', '-qm', 'library update')
  return { parent, vendor }
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('diff on a submodule path', () => {
  it('describes the submodule commit change in the working tree', async () => {
    const { parent } = repoWithMovedSubmodule()

    const result = await diffWorking(parent, 'git', 'vendor')
    expect(result.path).toBe('vendor')
    expect(result.unified).toContain('Submodule vendor')
    expect(result.unified).toContain('library update')
  })

  it('describes a staged submodule commit change', async () => {
    const { parent } = repoWithMovedSubmodule()
    git(parent, 'add', 'vendor')

    const result = await diffStaged(parent, 'git', 'vendor')
    expect(result.path).toBe('vendor')
    expect(result.unified).toContain('Submodule vendor')
  })
})

describe('diffWorking errors', () => {
  it('reports git failures instead of returning an empty diff', async () => {
    const repo = initRepo('gitfreddo-diff-error-')
    await expect(diffWorking(repo, 'git', '../outside.txt')).rejects.toThrow(/outside repository|outside/i)
  })
})
