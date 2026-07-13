import { describe, expect, it } from 'vitest'
import { parseBitbucketRemote, slugifyIssueBranch } from '@/lib/git/bitbucket'

describe('bitbucket re-exports', () => {
  it('re-exports shared bitbucket helpers', () => {
    expect(parseBitbucketRemote('https://bitbucket.org/workspace/repo')).toEqual({
      host: 'bitbucket.org',
      workspace: 'workspace',
      owner: 'workspace',
      repo: 'repo'
    })
    expect(slugifyIssueBranch('Fix login')).toBe('fix-login')
  })
})
