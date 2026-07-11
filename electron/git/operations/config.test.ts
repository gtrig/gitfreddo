import { execSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { configGet, configList, configSet } from './config'

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
  it('sets a local config value that can be read back', async () => {
    await configSet(tmpDir, 'git', 'custom.key', 'hello', 'local')
    const val = await configGet(tmpDir, 'git', 'custom.key', 'local')
    expect(val).toBe('hello')
  })
})

describe('configList', () => {
  it('includes user.name and user.email', async () => {
    const result = await configList(tmpDir, 'git', 'local')
    expect(result['user.name']).toBe('Test User')
    expect(result['user.email']).toBe('test@example.com')
  })

  it('does not include arbitrary keys', async () => {
    await configSet(tmpDir, 'git', 'arbitrary.secret', 'value', 'local')
    const result = await configList(tmpDir, 'git', 'local')
    expect(result['arbitrary.secret']).toBeUndefined()
  })
})
