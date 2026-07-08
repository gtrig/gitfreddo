import { describe, expect, it } from 'vitest'
import {
  bitbucketMergeMethodToApi,
  normalizeBitbucketIssueState,
  normalizeBitbucketPrState,
  parseBitbucketRemote,
  slugifyIssueBranch
} from './bitbucket'

describe('parseBitbucketRemote', () => {
  it('parses https bitbucket urls', () => {
    expect(parseBitbucketRemote('https://bitbucket.org/workspace/repo.git')).toEqual({
      host: 'bitbucket.org',
      workspace: 'workspace',
      owner: 'workspace',
      repo: 'repo'
    })
  })

  it('parses ssh bitbucket urls', () => {
    expect(parseBitbucketRemote('git@bitbucket.org:workspace/repo.git')).toEqual({
      host: 'bitbucket.org',
      workspace: 'workspace',
      owner: 'workspace',
      repo: 'repo'
    })
  })

  it('returns null for non-bitbucket urls', () => {
    expect(parseBitbucketRemote('https://github.com/org/repo.git')).toBeNull()
  })
})

describe('slugifyIssueBranch', () => {
  it('slugifies issue titles', () => {
    expect(slugifyIssueBranch('Fix: Login Bug!')).toBe('fix-login-bug')
  })
})

describe('bitbucketMergeMethodToApi', () => {
  it('maps merge methods to Bitbucket API values', () => {
    expect(bitbucketMergeMethodToApi('merge')).toBe('merge_commit')
    expect(bitbucketMergeMethodToApi('squash')).toBe('squash')
    expect(bitbucketMergeMethodToApi('rebase')).toBe('fast_forward')
  })
})

describe('normalizeBitbucketPrState', () => {
  it('normalizes PR states', () => {
    expect(normalizeBitbucketPrState('OPEN')).toBe('open')
    expect(normalizeBitbucketPrState('MERGED')).toBe('closed')
  })
})

describe('normalizeBitbucketIssueState', () => {
  it('normalizes issue states', () => {
    expect(normalizeBitbucketIssueState('OPEN')).toBe('open')
    expect(normalizeBitbucketIssueState('RESOLVED')).toBe('closed')
  })
})
