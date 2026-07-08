import { describe, expect, it } from 'vitest'
import { applyEnvEntries, parseDotEnv } from './load-dotenv'

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
})
