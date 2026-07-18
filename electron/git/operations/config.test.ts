import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assertWritableConfigKey, configGet, configList, configSet } from './config'

let tmpDir: string

beforeEach(() => {
  tmpDir = mkdtempSync(join(tmpdir(), 'gitfreddo-config-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "test@example.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test User"', { cwd: tmpDir, stdio: 'ignore' })
  writeFileSync(join(tmpDir, 'README.md'), 'initial\n')
  execSync('git add README.md', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "initial"', { cwd: tmpDir, stdio: 'ignore' })
})

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true })
})

describe('assertWritableConfigKey', () => {
  it('allows settings UI keys for local scope', () => {
    expect(() => assertWritableConfigKey('user.name', 'local')).not.toThrow()
    expect(() => assertWritableConfigKey('core.hooksPath', 'local')).not.toThrow()
  })

  it('rejects global writes and unknown keys', () => {
    expect(() => assertWritableConfigKey('user.name', 'global')).toThrow(/global/i)
    expect(() => assertWritableConfigKey('core.hooksPath', 'global')).toThrow(/global/i)
    expect(() => assertWritableConfigKey('alias.evil', 'local')).toThrow(/not allowed/i)
  })
})

describe('configGet', () => {
  it('returns a configured value', async () => {
    const name = await configGet(tmpDir, 'git', 'user.name', 'local')
    expect(name).toBe('Test User')
  })

  it('returns null for an unset key', async () => {
    const val = await configGet(tmpDir, 'git', 'nonexistent.key', 'local')
    expect(val).toBeNull()
  })
})

describe('configSet', () => {
  it('sets a local allowlisted config value that can be read back', async () => {
    await configSet(tmpDir, 'git', 'init.defaultBranch', 'develop', 'local')
    const val = await configGet(tmpDir, 'git', 'init.defaultBranch', 'local')
    expect(val).toBe('develop')
  })

  it('rejects non-allowlisted keys', async () => {
    await expect(configSet(tmpDir, 'git', 'arbitrary.secret', 'value', 'local')).rejects.toThrow(
      /not allowed/i
    )
  })
})

describe('configList', () => {
  it('includes user.name and user.email', async () => {
    const result = await configList(tmpDir, 'git', 'local')
    expect(result['user.name']).toBe('Test User')
    expect(result['user.email']).toBe('test@example.com')
  })

  it('does not include arbitrary keys', async () => {
    execSync('git config --local arbitrary.secret value', { cwd: tmpDir, stdio: 'ignore' })
    const result = await configList(tmpDir, 'git', 'local')
    expect(result['arbitrary.secret']).toBeUndefined()
  })
})
