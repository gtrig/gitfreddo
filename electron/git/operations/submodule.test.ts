import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { submoduleAdd, submoduleList, submoduleRemove, submoduleUpdate } from './submodule'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
  execSync('git config protocol.file.allow always', { cwd: dir, stdio: 'ignore' })
}

describe('submodule operations', () => {
  it('lists submodules after add', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gf-sub-parent-'))
    const child = mkdtempSync(join(tmpdir(), 'gf-sub-child-'))
    initRepo(parent)
    initRepo(child)
    writeFileSync(join(child, 'README.md'), 'child\n')
    execSync('git add README.md', { cwd: child, stdio: 'ignore' })
    execSync('git commit -m "child"', { cwd: child, stdio: 'ignore' })

    await submoduleAdd(parent, 'git', {
      url: child,
      path: 'vendor/lib'
    })
    execSync('git add .gitmodules vendor/lib', { cwd: parent, stdio: 'ignore' })
    execSync('git commit -m "add submodule"', { cwd: parent, stdio: 'ignore' })

    const list = await submoduleList(parent, 'git')
    expect(list).toHaveLength(1)
    expect(list[0]?.path).toBe('vendor/lib')
    expect(list[0]?.url).toBe(child)
    expect(list[0]?.hasWorkingTree).toBe(true)
  })

  it('updates and removes a submodule', async () => {
    const parent = mkdtempSync(join(tmpdir(), 'gf-sub-parent-'))
    const child = mkdtempSync(join(tmpdir(), 'gf-sub-child-'))
    initRepo(parent)
    initRepo(child)
    writeFileSync(join(child, 'README.md'), 'child\n')
    execSync('git add README.md', { cwd: child, stdio: 'ignore' })
    execSync('git commit -m "child"', { cwd: child, stdio: 'ignore' })

    await submoduleAdd(parent, 'git', { url: child, path: 'vendor/lib' })
    execSync('git add .gitmodules vendor/lib', { cwd: parent, stdio: 'ignore' })
    execSync('git commit -m "add submodule"', { cwd: parent, stdio: 'ignore' })

    rmSync(join(parent, 'vendor/lib'), { recursive: true, force: true })
    await submoduleUpdate(parent, 'git', { paths: ['vendor/lib'], init: true })
    expect(await submoduleList(parent, 'git')).toHaveLength(1)

    await submoduleRemove(parent, 'git', 'vendor/lib', true)
    execSync('git commit -am "remove submodule"', { cwd: parent, stdio: 'ignore' })
    expect(await submoduleList(parent, 'git')).toHaveLength(0)
  })
})
