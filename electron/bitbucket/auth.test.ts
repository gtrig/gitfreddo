import { describe, expect, it } from 'vitest'
import { resolveBitbucketAuthLogin } from './auth'

describe('resolveBitbucketAuthLogin', () => {
  it('returns auth login for app password connections', () => {
    expect(
      resolveBitbucketAuthLogin({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: 'user@example.com',
        bitbucketAuthType: 'app_password'
      })
    ).toBe('user@example.com')
  })

  it('falls back to bitbucketLogin for legacy app password settings', () => {
    expect(
      resolveBitbucketAuthLogin({
        bitbucketLogin: 'user@example.com',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'app_password'
      })
    ).toBe('user@example.com')
  })

  it('returns undefined for oauth connections', () => {
    expect(
      resolveBitbucketAuthLogin({
        bitbucketLogin: 'gtrig',
        bitbucketAuthLogin: '',
        bitbucketAuthType: 'oauth'
      })
    ).toBeUndefined()
  })
})
