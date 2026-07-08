import { describe, expect, it } from 'vitest'
import { firstNonEmpty, resolveForgeOAuthEnv } from './forge-oauth-env'

describe('firstNonEmpty', () => {
  it('returns the first non-empty trimmed value', () => {
    expect(firstNonEmpty('  ', undefined, 'abc', 'zzz')).toBe('abc')
  })

  it('returns empty string when nothing is set', () => {
    expect(firstNonEmpty(undefined, '', '   ')).toBe('')
  })
})

describe('resolveForgeOAuthEnv', () => {
  it('prefers runtime process env over build-time values', () => {
    expect(
      resolveForgeOAuthEnv(
        {
          GITHUB_CLIENT_ID: 'runtime-github',
          BITBUCKET_CLIENT_ID: 'runtime-bb',
          BITBUCKET_CLIENT_SECRET: 'runtime-secret'
        },
        {
          githubClientId: 'build-github',
          bitbucketClientId: 'build-bb',
          bitbucketClientSecret: 'build-secret'
        }
      )
    ).toEqual({
      githubClientId: 'runtime-github',
      bitbucketClientId: 'runtime-bb',
      bitbucketClientSecret: 'runtime-secret'
    })
  })

  it('falls back to build-time values when runtime is empty', () => {
    expect(
      resolveForgeOAuthEnv(
        {},
        {
          githubClientId: 'build-github',
          bitbucketClientId: 'build-bb',
          bitbucketClientSecret: 'build-secret'
        }
      )
    ).toEqual({
      githubClientId: 'build-github',
      bitbucketClientId: 'build-bb',
      bitbucketClientSecret: 'build-secret'
    })
  })
})
