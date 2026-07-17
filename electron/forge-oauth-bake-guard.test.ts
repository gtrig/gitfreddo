import { describe, expect, it } from 'vitest'
import {
  FORGE_OAUTH_BAKE_ENV_KEYS,
  missingForgeOAuthBakeEnvKeys
} from './forge-oauth-bake-guard'

describe('missingForgeOAuthBakeEnvKeys', () => {
  it('lists every required bake key', () => {
    expect(FORGE_OAUTH_BAKE_ENV_KEYS).toEqual([
      'GITHUB_CLIENT_ID',
      'BITBUCKET_CLIENT_ID',
      'BITBUCKET_CLIENT_SECRET',
      'GITLAB_CLIENT_ID',
      'GITLAB_CLIENT_SECRET'
    ])
  })

  it('returns no missing keys when all values are non-empty', () => {
    expect(
      missingForgeOAuthBakeEnvKeys({
        GITHUB_CLIENT_ID: 'gh',
        BITBUCKET_CLIENT_ID: 'bb',
        BITBUCKET_CLIENT_SECRET: 'bbs',
        GITLAB_CLIENT_ID: 'gl',
        GITLAB_CLIENT_SECRET: 'gls'
      })
    ).toEqual([])
  })

  it('reports blank and missing keys without reading their values', () => {
    expect(
      missingForgeOAuthBakeEnvKeys({
        GITHUB_CLIENT_ID: 'gh',
        BITBUCKET_CLIENT_ID: '  ',
        BITBUCKET_CLIENT_SECRET: 'bbs',
        GITLAB_CLIENT_ID: undefined,
        GITLAB_CLIENT_SECRET: ''
      })
    ).toEqual(['BITBUCKET_CLIENT_ID', 'GITLAB_CLIENT_ID', 'GITLAB_CLIENT_SECRET'])
  })
})
