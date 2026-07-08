import { describe, expect, it } from 'vitest'
import { isForgeAuthFailure } from './forge-auth'

describe('isForgeAuthFailure', () => {
  it('detects unauthorized API responses', () => {
    expect(isForgeAuthFailure(new Error('GitHub API error (401): Bad credentials'))).toBe(true)
    expect(isForgeAuthFailure(new Error('Unauthorized'))).toBe(true)
  })

  it('ignores scope, SSO, and non-auth failures', () => {
    expect(
      isForgeAuthFailure(new Error('GitHub API error (403): Resource not accessible'))
    ).toBe(false)
    expect(isForgeAuthFailure(new Error('fetch failed'))).toBe(false)
    expect(isForgeAuthFailure(new Error('GitHub API error (500): boom'))).toBe(false)
  })
})
