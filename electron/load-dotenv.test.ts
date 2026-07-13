import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, describe, expect, it } from 'vitest'
import { applyEnvEntries, loadDotEnvFile, parseDotEnv } from './load-dotenv'

describe('parseDotEnv', () => {
  it('parses KEY=VALUE lines and ignores comments/blank lines', () => {
    const parsed = parseDotEnv(`
# comment
GITHUB_CLIENT_ID=abc123
BITBUCKET_CLIENT_SECRET="s e c"
EMPTY=
EXPORT_STYLE=export FOO=bar
`)
    expect(parsed).toEqual({
      GITHUB_CLIENT_ID: 'abc123',
      BITBUCKET_CLIENT_SECRET: 's e c',
      EMPTY: '',
      EXPORT_STYLE: 'export FOO=bar'
    })
  })

  it('strips export prefix and surrounding quotes', () => {
    expect(parseDotEnv(`export GITHUB_CLIENT_ID='xyz'`)).toEqual({
      GITHUB_CLIENT_ID: 'xyz'
    })
  })
})

describe('applyEnvEntries', () => {
  it('sets missing keys without overriding existing process.env values', () => {
    const env: Record<string, string | undefined> = {
      EXISTING: 'keep-me'
    }
    applyEnvEntries(
      {
        EXISTING: 'new',
        GITHUB_CLIENT_ID: 'from-file'
      },
      env
    )
    expect(env.EXISTING).toBe('keep-me')
    expect(env.GITHUB_CLIENT_ID).toBe('from-file')
  })

  it('overrides empty string values', () => {
    const env: Record<string, string | undefined> = {
      EMPTY: ''
    }
    applyEnvEntries({ EMPTY: 'filled' }, env)
    expect(env.EMPTY).toBe('filled')
  })
})

describe('loadDotEnvFile', () => {
  let tempDir: string | null = null

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true })
      tempDir = null
    }
  })

  it('loads .env entries into process.env without overriding existing keys', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-dotenv-'))
    writeFileSync(join(tempDir, '.env'), 'FROM_FILE=loaded\nEXISTING=from-file\n')

    const previous = process.env.EXISTING
    process.env.EXISTING = 'keep-me'

    try {
      loadDotEnvFile(tempDir)
      expect(process.env.FROM_FILE).toBe('loaded')
      expect(process.env.EXISTING).toBe('keep-me')
    } finally {
      delete process.env.FROM_FILE
      if (previous === undefined) {
        delete process.env.EXISTING
      } else {
        process.env.EXISTING = previous
      }
    }
  })

  it('ignores missing or unreadable .env files', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'gitfreddo-dotenv-'))
    expect(() => loadDotEnvFile(tempDir)).not.toThrow()
  })
})
