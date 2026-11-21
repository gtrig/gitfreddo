import { execSync } from 'node:child_process'
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { canonicalizePath } from '../repo-path'
import {
  hooksDelete,
  hooksDisable,
  hooksEnable,
  hooksList,
  hooksRead,
  hooksWrite
} from './hooks'

function initRepo(dir: string) {
  execSync('git init -b main', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: dir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'ignore' })
}

function isExecutable(filePath: string): boolean {
  return (statSync(filePath).mode & 0o111) !== 0
}

describe('hooks', () => {
  it('lists sample hooks from a fresh git init repo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)

    const result = await hooksList(dir, 'git')

    expect(result.hooksDir).toContain('hooks')
    expect(result.hooks.length).toBeGreaterThan(0)
    const preCommit = result.hooks.find((hook) => hook.name === 'pre-commit')
    expect(preCommit).toBeDefined()
    expect(preCommit?.enabled).toBe(false)
    expect(preCommit?.filename).toBe('pre-commit.sample')
  })

  it('enables a sample hook as an active copy', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)

    await hooksEnable(dir, 'git', 'pre-commit')

    const result = await hooksList(dir, 'git')
    const preCommit = result.hooks.find((hook) => hook.name === 'pre-commit')
    expect(preCommit?.enabled).toBe(true)
    expect(preCommit?.filename).toBe('pre-commit')
    expect(existsSync(join(result.hooksDir, 'pre-commit'))).toBe(true)
    expect(existsSync(join(result.hooksDir, 'pre-commit.sample'))).toBe(true)
  })

  it('reads and writes hook content with executable permissions', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const script = '#!/bin/sh\necho "hello"\n'

    await hooksWrite(dir, 'git', 'commit-msg', script)

    const content = await hooksRead(dir, 'git', 'commit-msg')
    expect(content).toBe(script)
    const { hooksDir } = await hooksList(dir, 'git')
    if (process.platform !== 'win32') {
      expect(isExecutable(join(hooksDir, 'commit-msg'))).toBe(true)
    }
  })

  it('disables an active hook by renaming to .disabled', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    await hooksEnable(dir, 'git', 'pre-commit')

    await hooksDisable(dir, 'git', 'pre-commit')

    const result = await hooksList(dir, 'git')
    const preCommit = result.hooks.find((hook) => hook.name === 'pre-commit')
    expect(preCommit?.enabled).toBe(false)
    expect(preCommit?.filename).toBe('pre-commit.disabled')
    expect(existsSync(join(result.hooksDir, 'pre-commit'))).toBe(false)
    expect(existsSync(join(result.hooksDir, 'pre-commit.disabled'))).toBe(true)
  })

  it('deletes the active and disabled hook but keeps the git sample', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    await hooksWrite(dir, 'git', 'pre-push', '#!/bin/sh\n')
    const { hooksDir } = await hooksList(dir, 'git')
    copyFileSync(join(hooksDir, 'pre-push'), join(hooksDir, 'pre-push.disabled'))

    await hooksDelete(dir, 'git', 'pre-push')

    expect(existsSync(join(hooksDir, 'pre-push'))).toBe(false)
    expect(existsSync(join(hooksDir, 'pre-push.disabled'))).toBe(false)
    expect(existsSync(join(hooksDir, 'pre-push.sample'))).toBe(true)
    const result = await hooksList(dir, 'git')
    expect(result.hooks.find((hook) => hook.name === 'pre-push')).toMatchObject({
      enabled: false,
      filename: 'pre-push.sample'
    })
  })

  it('keeps the sample when enabling a hook from it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const { hooksDir } = await hooksList(dir, 'git')

    await hooksEnable(dir, 'git', 'pre-commit')

    expect(existsSync(join(hooksDir, 'pre-commit'))).toBe(true)
    expect(existsSync(join(hooksDir, 'pre-commit.sample'))).toBe(true)
    if (process.platform !== 'win32') {
      expect(isExecutable(join(hooksDir, 'pre-commit'))).toBe(true)
    }
  })

  it('re-enables your edited hook, not the sample, after disabling it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    await hooksWrite(dir, 'git', 'pre-commit', '#!/bin/sh\necho mine\n')
    await hooksDisable(dir, 'git', 'pre-commit')

    expect(await hooksRead(dir, 'git', 'pre-commit')).toContain('echo mine')
    const listed = await hooksList(dir, 'git')
    expect(listed.hooks.find((hook) => hook.name === 'pre-commit')?.filename).toBe(
      'pre-commit.disabled'
    )

    await hooksEnable(dir, 'git', 'pre-commit')
    expect(await hooksRead(dir, 'git', 'pre-commit')).toContain('echo mine')
  })

  it('creates the hooks directory when core.hooksPath points to a missing one', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    execSync('git config core.hooksPath .hooks-new', { cwd: dir, stdio: 'ignore' })

    await hooksWrite(dir, 'git', 'pre-commit', '#!/bin/sh\n')
    expect(existsSync(join(dir, '.hooks-new', 'pre-commit'))).toBe(true)
  })

  it('uses core.hooksPath when set', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const customDir = join(dir, 'custom-hooks')
    mkdirSync(customDir, { recursive: true })
    execSync(`git config core.hooksPath "${customDir}"`, { cwd: dir, stdio: 'ignore' })
    writeFileSync(join(customDir, 'pre-commit'), '#!/bin/sh\n')
    chmodSync(join(customDir, 'pre-commit'), 0o755)

    const result = await hooksList(dir, 'git')

    expect(result.hooksDir).toBe(canonicalizePath(customDir))
    const preCommit = result.hooks.find((hook) => hook.name === 'pre-commit')
    expect(preCommit?.enabled).toBe(true)
    const content = await hooksRead(dir, 'git', 'pre-commit')
    expect(content).toContain('#!/bin/sh')
  })

  it('reports an alternate .githooks directory when core.hooksPath is unset', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const githooksDir = join(dir, '.githooks')
    mkdirSync(githooksDir, { recursive: true })
    writeFileSync(join(githooksDir, 'pre-push'), '#!/bin/sh\necho hook\n')
    chmodSync(join(githooksDir, 'pre-push'), 0o755)

    const result = await hooksList(dir, 'git')

    expect(result.hooksDir).toContain(join('.git', 'hooks'))
    expect(result.alternateHooksDir).toBe(canonicalizePath(githooksDir))
    expect(result.alternateHooksPath).toBe('.githooks')
    const prePush = result.hooks.find((hook) => hook.name === 'pre-push')
    expect(prePush?.enabled).toBe(false)
    expect(prePush?.filename).toBe('pre-push.sample')
  })

  it('matches alternate .githooks paths when the repo is accessed via a symlink alias', async () => {
    const base = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    const realDir = join(base, 'real')
    const aliasDir = join(base, 'alias')
    mkdirSync(realDir)
    symlinkSync(realDir, aliasDir, 'dir')
    initRepo(realDir)
    const githooksDir = join(realDir, '.githooks')
    mkdirSync(githooksDir, { recursive: true })
    writeFileSync(join(githooksDir, 'pre-push'), '#!/bin/sh\necho hook\n')
    chmodSync(join(githooksDir, 'pre-push'), 0o755)

    const result = await hooksList(aliasDir, 'git')

    expect(result.alternateHooksDir).toBe(canonicalizePath(githooksDir))
  })

  it('lists hooks from .githooks when core.hooksPath is configured', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const githooksDir = join(dir, '.githooks')
    mkdirSync(githooksDir, { recursive: true })
    execSync('git config core.hooksPath .githooks', { cwd: dir, stdio: 'ignore' })
    writeFileSync(join(githooksDir, 'pre-push'), '#!/bin/sh\necho hook\n')
    chmodSync(join(githooksDir, 'pre-push'), 0o755)

    const result = await hooksList(dir, 'git')

    expect(result.hooksDir).toBe(canonicalizePath(githooksDir))
    expect(result.alternateHooksDir).toBeUndefined()
    const prePush = result.hooks.find((hook) => hook.name === 'pre-push')
    expect(prePush?.enabled).toBe(true)
    expect(prePush?.filename).toBe('pre-push')
  })

  it('reports a missing hook when reading or enabling it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    await expect(hooksRead(dir, 'git', 'post-nothing')).rejects.toThrow('Hook not found: post-nothing')
    await expect(hooksEnable(dir, 'git', 'post-nothing')).rejects.toThrow('Hook not found: post-nothing')
  })

  it('ignores files in the hooks directory that are not hook names', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    const { hooksDir } = await hooksList(dir, 'git')
    for (const name of ['.disabled', '.sample', 'has space', 'has space.sample', 'has space.disabled']) {
      writeFileSync(join(hooksDir, name), '#!/bin/sh\n')
    }

    const { hooks } = await hooksList(dir, 'git')
    expect(hooks.some((hook) => hook.name.includes(' ') || hook.name === '')).toBe(false)
  })

  it('lists no hooks when core.hooksPath points to a missing directory', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)
    execSync('git config core.hooksPath .missing-hooks', { cwd: dir, stdio: 'ignore' })

    const result = await hooksList(dir, 'git')
    expect(result.hooks).toEqual([])
    expect(result.hooksDir).toContain('.missing-hooks')
  })

  it('rejects invalid hook names', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'gf-hooks-'))
    initRepo(dir)

    await expect(hooksRead(dir, 'git', '../evil')).rejects.toThrow(/Invalid hook name/)
    await expect(hooksWrite(dir, 'git', 'foo.sample', 'x')).rejects.toThrow(/Invalid hook name/)
  })
})
